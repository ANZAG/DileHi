// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Was DileHi gehört, darf nicht im Programm stehen.
 *
 * Aus dem Probelauf: Die Startdaten räumen in der Datenbank auf — kein
 * Kopfmenü mit unseren Epochen, keine Seitenkategorien. Im Code standen sie
 * trotzdem weiter, als Notnagel für den Fall, dass die Datenbank nichts
 * liefert. Ein fremder Verein, dessen Abfrage einmal scheitert, hätte damit
 * unser Menü zu sehen bekommen, mit Links auf Seiten, die es bei ihm nicht
 * gibt.
 *
 * Ein Notnagel darf das Loch stopfen, das er kennt — er darf nicht die
 * Einrichtung eines anderen Vereins hineinlegen.
 */

const UNSERE_INHALTE = [
  "Spätmittelalter",
  "Napoleonik",
  "Erster Weltkrieg",
  "epochen/mittelalter",
  "epochen/1815",
  "epochen/wk1",
  "fuer-veranstalter",
];

/** Dateien, die eine Installation aufsetzen oder ihr Grundgerüst liefern. */
const GERUEST = [
  "src/hooks/useSiteMenu.ts",
  "src/hooks/useKategorien.ts",
  "src/components/sitebuilder/auswahl.ts",
];

/**
 * Der Code ohne seine Kommentare.
 *
 * Im Fliesstext eines Kommentars dürfen unsere Epochen stehen — dort erklären
 * sie, warum sie weg sind. Gesucht wird deshalb nur im Code.
 *
 * Nicht über Zeichenketten gehen: In den Kommentaren stehen deutsche
 * Anführungszeichen, und das schliessende ist ein gerades Zeichen. Wer daraus
 * Paare bildet, zählt ab dort falsch — ein erster Entwurf dieser Prüfung war
 * deshalb grün, obwohl im Code noch alles stand. Fehler 2 im Arbeitsstand,
 * einmal mehr.
 */
function ohneKommentare(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("Keine fremden Inhalte im Grundgerüst", () => {
  for (const datei of GERUEST) {
    it(`${datei} kennt DileHis Epochen nicht als Vorgabe`, () => {
      const code = ohneKommentare(readFileSync(datei, "utf-8"));
      // Die Prüfung soll etwas übrig lassen, das sie durchsuchen kann.
      expect(code, datei).toContain("export");
      for (const inhalt of UNSERE_INHALTE) {
        expect(code.includes(inhalt), `${datei}: ${inhalt} steht im Code`).toBe(false);
      }
    });
  }

  it("das Menü fällt auf die Startseite zurück, nicht auf unseres", () => {
    const text = readFileSync("src/hooks/useSiteMenu.ts", "utf-8");
    const fallback = text.slice(text.indexOf("const FALLBACK"), text.indexOf("export function useSiteMenu"));
    // Die Startseite und die beiden Pflichtseiten im Fuss – mehr nicht.
    const pfade = [...fallback.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(pfade.sort()).toEqual(["/", "/datenschutz", "/impressum"]);
  });
});
