// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { seedRows, leereDatenbank, einspielen } from "./hilfe/buehne";
import { einsetzen, woerter, ORG_FORMEN } from "@/lib/organisationsform";

/**
 * Die Hilfetexte in den Popovers.
 *
 * Aus dem Probelauf: Der Schalter in der Rollenverwaltung heisst je nach Form
 * „Vorstand" oder „Ansprechpartner" — der Hilfetext daneben sprach weiter vom
 * Vorstand im Sinne der Satzung. Ein Text, der etwas anderes erklärt, als auf
 * dem Schalter steht, ist schlimmer als keiner.
 *
 * Seitdem dürfen Hilfetexte Platzhalter tragen. Zwei Dinge müssen daran
 * stimmen, und beide fallen sonst erst dem Leser auf: Jeder Platzhalter muss
 * dem Wörterbuch bekannt sein, und selbst geschriebene Texte dürfen nicht
 * überschrieben werden.
 */

interface Hilfetext {
  key: string;
  title: string | null;
  text: string;
}

const PLATZHALTER = /\{(\w+)\}/g;

describe("Hilfetexte und die Form der Organisation", () => {
  it("kennt jeden Platzhalter, der darin steht", async () => {
    const texte = await seedRows<Hilfetext>("onboarding_help");
    expect(texte.length).toBeGreaterThan(5);

    for (const form of ORG_FORMEN) {
      const w = woerter(form);
      for (const h of texte) {
        for (const feld of [h.title ?? "", h.text]) {
          const uebrig = einsetzen(feld, w).match(PLATZHALTER);
          expect(uebrig, `${h.key} (${form}): unbekannter Platzhalter`).toBeNull();
        }
      }
    }
  });

  it("setzt beim Rollenschalter keinen Vorstand mehr voraus", async () => {
    const texte = await seedRows<Hilfetext>("onboarding_help");
    const rolle = texte.find((h) => h.key === "rolle_vorstand");

    expect(rolle, "Hilfetext rolle_vorstand fehlt").toBeTruthy();
    // Der Titel ist genau das Wort, das auf dem Schalter steht.
    expect(einsetzen(rolle!.title ?? "", woerter("interest_group"))).toBe("Ansprechpartner");
    expect(einsetzen(rolle!.title ?? "", woerter("registered_club"))).toBe("Vorstand");
    expect(rolle!.text).not.toContain("im Sinne der Satzung");
  });

  it("lässt einen selbst geschriebenen Text in Ruhe", async () => {
    // Die Schranke: Wer seinen Hilfetext angepasst hat, behält ihn.
    const db = await leereDatenbank();
    const dateien = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
    const HILFE = "20260917100000_hilfetexte_wortwahl.sql";

    for (const f of dateien.filter((f) => f < HILFE)) {
      await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }
    await db.exec(`
      update public.onboarding_help
         set text = 'Bei uns heisst das Ältestenrat.'
       where key = 'rolle_vorstand';
    `);
    for (const f of dateien.filter((f) => f >= HILFE)) {
      await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }

    const text = (await db.query<Hilfetext>(
      "select key, title, text from public.onboarding_help where key = 'rolle_vorstand'"
    )).rows[0];
    expect(text.text).toBe("Bei uns heisst das Ältestenrat.");

    await db.close();
  });

  it("wird beim Anzeigen auch wirklich eingesetzt", () => {
    // Sonst stünde „{leitung}" wörtlich im Popover – schlimmer als vorher.
    const code = readFileSync("src/components/Hilfe.tsx", "utf-8");
    expect(code).toContain("einsetzen(eintrag.text, woerter)");
    expect(code).toContain("einsetzen(eintrag.title, woerter)");
  });
});
