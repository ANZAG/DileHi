// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buchSeite, lesetext, markdownBauen, roemisch } from "@/lib/scan/text";
import { zeilenBilden, seitenFormat } from "@/lib/scan/pdf";

describe("Lesetext", () => {
  it("führt Trennungen zusammen und macht aus Zeilen Absätze", () => {
    const roh = "Nachdem die Husarenregimenter zunächst drei Schwadronen umfassten, wur-\nden sie bis 1815 erhöht.\n\nDas Braunschweig-\nLüneburgische Korps";
    expect(lesetext(roh)).toBe("Nachdem die Husarenregimenter zunächst drei Schwadronen umfassten, wurden sie bis 1815 erhöht.\n\nDas Braunschweig-Lüneburgische Korps");
  });

  it("zählt wie das Buch", () => {
    expect(roemisch(4)).toBe("iv");
    expect(buchSeite(2, { pdfSeite: 3, buchSeite: 1 })).toBe("ii");
    expect(buchSeite(30, { pdfSeite: 3, buchSeite: 1 })).toBe("28");
    expect(buchSeite(30)).toBe("30");
  });

  it("baut das Markdown mit Trennern und Markierung", () => {
    const md = markdownBauen({
      titel: "Uniformen", autor: "Stein", datum: "2026-11-20", zaehlung: { pdfSeite: 2, buchSeite: 1 },
      seiten: [{ text: "Umschlag", unsicher: false }, { text: "Erste Zei-\nle", unsicher: true }],
    });
    expect(md).toContain("# Uniformen\n\nAutor: Stein · 2 Seiten · aufgenommen am 2026-11-20");
    expect(md).toContain("--- Seite i (PDF-Seite 1) ---\n\nUmschlag");
    expect(md).toContain("--- Seite 1 (PDF-Seite 2) ---\n[OCR unsicher]\n\nErste Zeile");
  });
});

describe("PDF-Aufbau", () => {
  const w = (text: string, x0: number, y0: number, x1: number, y1: number) => ({ text, x0, y0, x1, y1 });

  it("fasst Wörter in Lesereihenfolge zu Zeilen", () => {
    const z = zeilenBilden([w("Allerdings", 10, 100, 80, 120), w("kam", 85, 102, 110, 120), w("es", 115, 104, 130, 120), w("Stunden", 10, 130, 70, 150), w("lang", 75, 131, 100, 154)]);
    expect(z.map((x) => x.woerter.map((y) => y.text).join(" "))).toEqual(["Allerdings kam es", "Stunden lang"]);
    expect(z[0].grund).toBe(120);
  });

  it("gibt allen Seiten dieselbe Grösse (Median), Querformat zählt nicht mit", () => {
    const f = seitenFormat([{ breite: 1200, hoehe: 1700 }, { breite: 1160, hoehe: 1690 }, { breite: 1250, hoehe: 1720 }, { breite: 3000, hoehe: 2000 }]);
    expect(f.breite).toBeCloseTo((1200 * 72) / 200, 5);
    expect(f.hoehe / f.breite).toBeCloseTo(1700 / 1200, 2);
  });
});
