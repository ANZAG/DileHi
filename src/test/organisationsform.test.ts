// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { leereDatenbank, einspielen, seedRows } from "./hilfe/buehne";
import { FORMEN, ORG_FORMEN, form, modulVorauswahl, pflichtfelder } from "@/lib/organisationsform";

/**
 * Verein, e. V., Interessengemeinschaft.
 *
 * Geprüft wird das, worauf sich jemand verlässt: Die Module, die eine Form
 * bekommt, gibt es wirklich; was eine IG nicht hat, wird ihr nicht angeboten;
 * und die Spalte in der Datenbank kennt genau diese drei Formen.
 */

describe("Organisationsform", () => {
  it("kennt drei Formen, und jede erkennt sich an einem Satz wieder", () => {
    expect(ORG_FORMEN).toHaveLength(3);
    for (const key of ORG_FORMEN) {
      const f = FORMEN[key];
      expect(f.label.length, key).toBeGreaterThan(5);
      expect(f.text.length, key).toBeGreaterThan(30);
    }
  });

  it("fällt auf den Verein zurück, wenn nichts eingetragen ist", () => {
    expect(form(null).key).toBe("club");
    expect(form("quatsch").key).toBe("club");
    expect(form("interest_group").key).toBe("interest_group");
  });

  it("fragt eine Interessengemeinschaft nicht nach ihrer Registernummer", () => {
    expect(pflichtfelder("interest_group")).not.toContain("register_number");
    expect(pflichtfelder("interest_group")).not.toContain("board_members");
    expect(pflichtfelder("registered_club")).toContain("register_number");
    expect(pflichtfelder("club")).toContain("board_members");
    expect(pflichtfelder("club")).not.toContain("register_number");
  });

  it("bietet einer Interessengemeinschaft nichts an, was es bei ihr nicht gibt", () => {
    const ig = FORMEN.interest_group;
    for (const modul of ["applications", "contributions", "elections", "resolutions"]) {
      expect(ig.module, modul).not.toContain(modul);
      expect(ig.ohne, modul).toContain(modul);
    }
    // Was alle brauchen, hat auch sie.
    expect(ig.module).toContain("events");
    expect(ig.module).toContain("forum");
  });

  it("nennt die Leitung so, wie sie bei dieser Form heisst", () => {
    expect(FORMEN.registered_club.leitung).toBe("Vorstand");
    expect(FORMEN.interest_group.leitung).toBe("Ansprechpartner");
  });

  it("empfiehlt nur Module, die es wirklich gibt", async () => {
    const module = (await seedRows<{ key: string }>("app_modules")).map((m) => m.key);
    expect(module.length).toBeGreaterThan(15);

    for (const key of ORG_FORMEN) {
      const f = FORMEN[key];
      for (const modul of [...f.module, ...f.ohne]) {
        expect(module, `${key}: Modul ${modul} gibt es nicht`).toContain(modul);
      }
    }
  });

  it("gibt die Vorauswahl zurück, statt sie heimlich anzuwenden", async () => {
    const module = (await seedRows<{ key: string }>("app_modules")).map((m) => m.key);
    const wahl = modulVorauswahl("interest_group", module);

    expect(wahl.an).toContain("events");
    expect(wahl.aus).toContain("contributions");
    // Nichts, was diese Installation gar nicht kennt.
    for (const m of [...wahl.an, ...wahl.aus]) expect(module).toContain(m);
  });
});

describe("Die Form steht in der Datenbank", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await leereDatenbank();
    for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
      await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }
  }, 60_000);

  it("steht ab Werk auf Verein", async () => {
    const zeilen = (await db.query<{ org_form: string }>("select org_form from public.app_settings")).rows;
    expect(zeilen[0].org_form).toBe("club");
  });

  it("nimmt nur die drei Formen an", async () => {
    await expect(
      db.exec("update public.app_settings set org_form = 'firma';")
    ).rejects.toThrow();
    await db.exec("update public.app_settings set org_form = 'interest_group';");
    const zeilen = (await db.query<{ org_form: string }>("select org_form from public.app_settings")).rows;
    expect(zeilen[0].org_form).toBe("interest_group");
    await db.exec("update public.app_settings set org_form = 'club';");
  });

  it("erkennt einen eingetragenen Verein an seiner Registernummer", async () => {
    // Eine Installation, die schon läuft, soll die Frage nicht noch einmal
    // gestellt bekommen — DileHi steht damit ohne Zutun richtig da.
    const zweite = await leereDatenbank();
    const dateien = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
    const FORM = "20260916130000_organisationsform.sql";
    for (const f of dateien.filter((f) => f < FORM)) {
      await einspielen(zweite, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }
    await zweite.exec(`update public.app_settings set register_court = 'Amtsgericht Beispiel', register_number = 'VR 1234';`);
    for (const f of dateien.filter((f) => f >= FORM)) {
      await einspielen(zweite, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
    }

    const zeilen = (await zweite.query<{ org_form: string }>("select org_form from public.app_settings")).rows;
    expect(zeilen[0].org_form).toBe("registered_club");
    await zweite.close();
  });

  it("stellt die Frage nach der Gemeinnützigkeit nur, wo sie sich stellt", () => {
    // Die Anerkennung setzt eine Körperschaft mit Satzung voraus (§§ 51 ff.
    // AO). Beim Verein ohne Eintrag und bei der Interessengemeinschaft führt
    // die Frage nur zu Feldern, die niemand ausfüllen kann.
    expect(FORMEN.registered_club.gemeinnuetzig).toBe(true);
    expect(FORMEN.club.gemeinnuetzig).toBe(false);
    expect(FORMEN.interest_group.gemeinnuetzig).toBe(false);
  });

  it("versteckt eine Gemeinnützigkeit nicht, die schon eingetragen ist", () => {
    // Die Maske zeigt den Abschnitt auch dann, wenn die Form ihn nicht
    // vorsieht, der Haken aber gesetzt ist. Eine aktive Einstellung
    // wegzublenden, wäre schlimmer als eine überflüssige Frage.
    const code = readFileSync("src/components/admin/ErscheinungsbildAdmin.tsx", "utf-8");
    expect(code).toContain("form(marke.org_form).gemeinnuetzig || entwurf.is_nonprofit");
  });
});
