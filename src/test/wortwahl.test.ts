// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FORMEN, ORG_FORMEN, einsetzen, woerter } from "@/lib/organisationsform";

/**
 * „Verein" ist nicht das Wort jeder Organisation.
 *
 * In unserer Szene gibt es Vereine, eingetragene Vereine und
 * Interessengemeinschaften. Eine IG hat keinen Vorstand im Rechtssinn, keine
 * Satzung und keine Beiträge — wer beim ersten Blick in die Verwaltung
 * „Vereinsdokumente" und „Vereinsleitung" liest, versteht zwar, was gemeint
 * ist, ist aber nicht gemeint.
 *
 * Diese Prüfung hält die allgemeinen Masken frei von „Verein": Sie stehen
 * jeder Form offen, also dürfen sie das Wort nicht fest eingebaut haben. Wo es
 * hingehört, sagt das Wörterbuch (`woerter()`) — an einer Stelle, damit sich
 * die Beschriftungen nicht widersprechen.
 *
 * Nicht geprüft werden Bereiche, die es nur bei einem Verein gibt: Beiträge,
 * Zuwendungsbestätigungen, Auslagen, Fristen des Registers. Dort ist „Verein"
 * richtig, und die Module sind bei einer IG ohnehin aus.
 */

/** Masken, die jede Organisation sieht — unabhängig von ihrer Form. */
const ALLGEMEIN = [
  "src/pages/Login.tsx",
  "src/pages/Kontakt.tsx",
  "src/pages/intern/Dashboard.tsx",
  "src/pages/intern/Documents.tsx",
  "src/pages/intern/Inventar.tsx",
  "src/pages/intern/Admin.tsx",
  "src/components/admin/RollenAdmin.tsx",
  "src/components/admin/ModuleAdmin.tsx",
  "src/components/admin/MitgliederImport.tsx",
  "src/components/admin/ContactMessages.tsx",
  "src/components/admin/DateiablageWahl.tsx",
  "src/components/admin/SharePointAnleitung.tsx",
  "src/components/admin/MailAnleitung.tsx",
  "src/components/admin/VorlagenAdmin.tsx",
  "src/components/admin/NachweiseAdmin.tsx",
  "src/components/admin/SitePagesAdmin.tsx",
  "src/components/admin/DokumentkategorienAdmin.tsx",
  "src/components/events/CalendarSyncDialog.tsx",
  "src/components/event-forms/defaultTemplate.ts",
  "src/components/evaluation/EvalAreaCalculator.tsx",
  "src/components/sitebuilder/gestaltung.ts",
  "src/components/sitebuilder/puckConfig.tsx",
  "src/lib/einrichtung.ts",
  "src/lib/einrichtungsprozess.ts",
];

/**
 * Bezeichner, die „Verein" im Namen tragen und trotzdem bleiben.
 *
 * `Vereinsangaben` ist der Name eines Bausteins; er steht in jeder
 * gespeicherten Seite im JSON. Ihn umzubenennen hiesse, alle gebauten Seiten
 * unbrauchbar zu machen — für ein Wort, das kein Besucher je sieht. Seine
 * Beschriftung im Editor ist eine andere Sache und heisst inzwischen
 * „Pflichtangaben".
 */
const BEZEICHNER = /\bVereinsangaben\b|\bVereinsstand\b/g;

/**
 * Der Code ohne Kommentare.
 *
 * Im Fliesstext darf „Verein" stehen — dort steht, warum es in der Maske
 * nicht mehr steht. Nicht über Zeichenketten gehen: Das schliessende deutsche
 * Anführungszeichen ist ein gerades Zeichen, wer daraus Paare bildet, zählt
 * ab dort falsch (Fehler 2 im Arbeitsstand).
 */
function ohneKommentare(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Masken, in denen auch „Satzung", „Vorstand" und „Mitgliederversammlung"
 * nichts verloren haben.
 *
 * Eine Untermenge der allgemeinen: Hier geht es nicht nur um das Wort
 * „Verein", sondern um Einrichtungen, die eine Interessengemeinschaft gar
 * nicht hat. Aus dem Probelauf, Eric: „Eine IG hat wahrscheinlich keine
 * Satzung, Ordnung, MV-Versammlungen."
 *
 * Bereiche, die es nur bei einem Verein gibt (Beschlussregister, Abstimmungen,
 * Fristen des Registers, Aufnahmeantrag, Zuwendungen), stehen bewusst nicht
 * in der Liste — dort sind die Wörter richtig.
 */
const OHNE_VEREINSSACHEN = [
  "src/pages/Login.tsx",
  "src/pages/intern/Dashboard.tsx",
  "src/pages/intern/Profile.tsx",
  "src/pages/intern/Admin.tsx",
  "src/components/admin/RollenAdmin.tsx",
  "src/components/admin/MenueAdmin.tsx",
  "src/components/admin/DokumentkategorienAdmin.tsx",
];

/** Was eine Interessengemeinschaft nicht hat. */
const VEREINSSACHEN = /Satzung|Ordnungen|Mitgliederversammlung|\bMV[- ]/;

describe("Die Oberfläche spricht die Sprache der Organisation", () => {
  for (const datei of ALLGEMEIN) {
    it(`${datei} baut „Verein" nicht fest ein`, () => {
      const code = ohneKommentare(readFileSync(datei, "utf-8")).replace(BEZEICHNER, "");
      const treffer = code.split("\n").filter((z) => /Verein/.test(z));
      expect(treffer, `Stattdessen woerter() benutzen:\n${treffer.join("\n")}`).toHaveLength(0);
    });
  }

  for (const datei of OHNE_VEREINSSACHEN) {
    it(`${datei} setzt keine Satzung und keinen Vorstand voraus`, () => {
      const code = ohneKommentare(readFileSync(datei, "utf-8")).replace(BEZEICHNER, "");
      const treffer = code.split("\n").filter((z) => VEREINSSACHEN.test(z) || /\bVorstand\b/.test(z));
      expect(
        treffer,
        `Eine Interessengemeinschaft hat das nicht — woerter() benutzen:\n${treffer.join("\n")}`
      ).toHaveLength(0);
    });
  }

  it("hat für jede Form ein vollständiges Wörterbuch", () => {
    for (const key of ORG_FORMEN) {
      const w = woerter(key);
      for (const [feld, wert] of Object.entries(w)) {
        expect(typeof wert, `${key}.${feld}`).toBe("string");
        expect((wert as string).length, `${key}.${feld}`).toBeGreaterThan(2);
      }
    }
  });

  it("redet mit einer Interessengemeinschaft nicht über Vereine", () => {
    const w = woerter("interest_group");
    for (const [feld, wert] of Object.entries(w)) {
      expect(wert as string, `${feld}`).not.toMatch(/Verein|Satzung|Vorstand/);
    }
  });

  it("nennt Leitung und Mitglieder nur einmal, nicht zweimal", () => {
    // Das Wörterbuch legt beide aus der Formbeschreibung dazu. Stünden sie
    // doppelt, liefen sie auseinander — und die Rollenverwaltung hiesse
    // anders als der Einrichtungsprozess.
    for (const key of ORG_FORMEN) {
      expect(woerter(key).leitung).toBe(FORMEN[key].leitung);
      expect(woerter(key).mitglieder).toBe(FORMEN[key].mitglieder);
    }
  });

  it("setzt Platzhalter ein und lässt unbekannte stehen", () => {
    const w = woerter("interest_group");
    expect(einsetzen("{satzung}", w)).toBe("Absprachen");
    expect(einsetzen("Nur für die {leitungsgruppe}", w)).toBe("Nur für die Leitung");
    // Ein Tippfehler soll auffallen und nicht spurlos verschwinden.
    expect(einsetzen("{gibtesnicht}", w)).toBe("{gibtesnicht}");
    expect(einsetzen("Ohne alles", w)).toBe("Ohne alles");
  });
});
