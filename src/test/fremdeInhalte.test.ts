// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
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
  "src/hooks/useBranding.ts",
  // Seit dem 17. September auch hier: Die 18 mitgelieferten Fotos sind weg,
  // und sie sollen nicht zurückkommen.
  "src/hooks/useSiteImage.ts",
];

/** Woran man DileHi erkennt. */
const DILEHI = ["Diu lebendec", "Histôrje", "dilehi.de", "hero-medieval", "Wiesbaden"];

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

  it("der Browserreiter trägt nicht den Namen eines fremden Vereins", () => {
    // Was in index.html steht, sieht man, bevor die Anwendung geladen ist:
    // im Reiter, in der Vorschau eines geteilten Links, beim ersten Besuch
    // einer Suchmaschine. Den richtigen Titel setzt danach SEO.tsx aus den
    // Vereinsdaten.
    const html = readFileSync("index.html", "utf-8");
    for (const wort of DILEHI) {
      expect(html.includes(wort), `index.html: ${wort}`).toBe(false);
    }
    expect(html).toContain("<title>");
  });

  it("nennt ohne Vereinsdaten keinen Namen, der jemandem gehört", () => {
    // Fällt die Abfrage aus, stand hier DileHis Name – auf der Seite eines
    // fremden Vereins.
    const code = ohneKommentare(readFileSync("src/hooks/useBranding.ts", "utf-8"));
    for (const wort of DILEHI) {
      expect(code.includes(wort), `useBranding: ${wort}`).toBe(false);
    }
    expect(code).toContain('org_name: "Verein"');
  });

  it("teilt kein Bild, das einem fremden Verein gehört", () => {
    const code = ohneKommentare(readFileSync("src/components/SEO.tsx", "utf-8"));
    expect(code.includes("hero-medieval")).toBe(false);
    // Ohne hinterlegtes Bild gibt es schlicht keines.
    expect(code).toContain("seoImageUrl");
  });

  it("liefert keine Bilder mit, die einem Verein gehören", () => {
    // 4,6 MB Fotos aus Wiesbaden lagen in src/assets und wurden in jede
    // Installation mitgeliefert. Wer kein eigenes Bild hochgeladen hatte, sah
    // unsere. Seit sie in DileHis eigenem Speicher liegen, gibt es hier
    // nichts mehr zu vererben.
    expect(existsSync("src/assets"), "src/assets ist wieder da").toBe(false);

    const code = ohneKommentare(readFileSync("src/hooks/useSiteImage.ts", "utf-8"));
    expect(code.includes("@/assets"), "useSiteImage bündelt wieder Bilder").toBe(false);
    expect(code.includes("SITE_IMAGE_FALLBACKS")).toBe(false);
    // Ohne hinterlegte Datei bleibt die Adresse leer – die Bausteine zeigen
    // dann den Farbverlauf, kein fremdes Foto.
    expect(code).toContain('{ src: "", alt: "" }');
  });

  it("das Menü fällt auf die Startseite zurück, nicht auf unseres", () => {
    const text = readFileSync("src/hooks/useSiteMenu.ts", "utf-8");
    const fallback = text.slice(text.indexOf("const FALLBACK"), text.indexOf("export function useSiteMenu"));
    // Die Startseite und die beiden Pflichtseiten im Fuss – mehr nicht.
    const pfade = [...fallback.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(pfade.sort()).toEqual(["/", "/datenschutz", "/impressum"]);
  });
});
