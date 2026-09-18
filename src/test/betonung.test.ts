import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { betonung, maskiereHtml } from "@/lib/betonung";

describe("Betonung in Quellenangaben", () => {
  it("setzt Sternchen kursiv", () => {
    expect(betonung("Vgl. *Die Nassauer Chronik*, Bd. 2")).toBe(
      "Vgl. <em>Die Nassauer Chronik</em>, Bd. 2"
    );
  });

  it("lässt Text ohne Sternchen unverändert", () => {
    expect(betonung("Landesarchiv Wiesbaden, Bestand 133")).toBe(
      "Landesarchiv Wiesbaden, Bestand 133"
    );
  });

  it("kommt mit leerer Eingabe klar", () => {
    expect(betonung(null)).toBe("");
    expect(betonung(undefined)).toBe("");
    expect(betonung("")).toBe("");
  });

  /**
   * Der eigentliche Grund für diese Datei.
   *
   * Vorher entstand das HTML aus einem schlichten replace, und alles andere im
   * Text ging ungeprüft mit durch. Wer Quellen pflegen darf, konnte damit ein
   * Skript auf jeder öffentlichen Themenseite unterbringen.
   */
  describe("kein fremdes HTML", () => {
    const angriffe = [
      "<script>alert(1)</script>",
      "<img src=x onerror=alert(1)>",
      "<a href=\"javascript:alert(1)\">Quelle</a>",
      "*<script>alert(1)</script>*",
      "</em><script>alert(1)</script><em>",
      "<iframe src=\"https://example.invalid\"></iframe>",
    ];

    for (const eingabe of angriffe) {
      it(`maskiert ${eingabe.slice(0, 30)}`, () => {
        const ergebnis = betonung(eingabe);
        // Nicht auf einzelne Words pruefen: „onerror" als Text ist
        // harmlos, sobald die spitzen Klammern maskiert sind. Massgeblich ist,
        // dass ausser den eigenen <em> ueberhaupt keine Auszeichnung uebrig
        // bleibt – das schliesst auch Angriffe ein, an die hier niemand
        // gedacht hat.
        expect(ergebnis.replace(/<\/?em>/g, "")).not.toContain("<");
        expect(ergebnis.replace(/<\/?em>/g, "")).not.toContain(">");
      });
    }
  });

  it("maskiert auch das kaufmännische Und", () => {
    // Ohne das entstuende aus „&lt;" beim zweiten Durchlauf wieder „<".
    expect(maskiereHtml("Satzung & Ordnungen")).toBe("Satzung &amp; Ordnungen");
    expect(maskiereHtml("&lt;script&gt;")).toBe("&amp;lt;script&amp;gt;");
  });
});

describe("Verkabelung", () => {
  it("baut die Quellenangaben nicht mehr von Hand zusammen", () => {
    const quelle = readFileSync("src/components/epochs/EpochSources.tsx", "utf-8");
    expect(quelle).toContain("betonung(s.text)");
    expect(quelle).not.toContain("<em>$1</em>");
  });

  it("lässt kein rohes innerHTML ohne Reinigung stehen", () => {
    // Jede Stelle mit dangerouslySetInnerHTML muss durch eine der beiden
    // Reinigungen laufen. Eine neue Stelle ohne faellt hier auf.
    const dateien = [
      "src/components/epochs/EpochSources.tsx",
      "src/components/forum/PostBody.tsx",
      "src/components/admin/ContactMessages.tsx",
      "src/components/sitebuilder/bausteine.tsx",
      "src/components/sitebuilder/bausteineStartseite.tsx",
      "src/components/sitebuilder/Hinweiskasten.tsx",
    ];
    for (const datei of dateien) {
      const inhalt = readFileSync(datei, "utf-8");
      const stellen = [...inhalt.matchAll(/__html: ([^}]+)/g)].map((m) => m[1].trim());
      for (const stelle of stellen) {
        expect(
          /DOMPurify\.sanitize|sanitizePostHtml|betonung\(|^final$/.test(stelle),
          `${datei}: ${stelle}`
        ).toBe(true);
      }
    }
  });
});
