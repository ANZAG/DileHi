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

describe("Schrift und Sprache", () => {
  it("nimmt die sicherste Erkennung, Deutsch bei Gleichstand, Fraktur nur mit Vorsprung", async () => {
    const { besteSchrift } = await import("@/lib/scan/ocr");
    const e = (schrift: "antiqua" | "fraktur" | "latein" | "franzoesisch", sicherheit: number) => ({ schrift, sicherheit });
    expect(besteSchrift([e("antiqua", 90), e("franzoesisch", 95)]).schrift).toBe("franzoesisch");
    expect(besteSchrift([e("antiqua", 92), e("latein", 93)]).schrift).toBe("antiqua");
    expect(besteSchrift([e("antiqua", 80), e("fraktur", 84)]).schrift).toBe("antiqua");
    expect(besteSchrift([e("antiqua", 60), e("fraktur", 80)]).schrift).toBe("fraktur");
  });
});

describe("Sprache raten", () => {
  it("erkennt Deutsch, Latein, Französisch, Englisch und die Mischung einer Edition", async () => {
    const { spracheRaten } = await import("@/lib/scan/text");
    expect(spracheRaten("Allerdings kam es trotz der Überlegenheit der Franzosen nur zu Scharmützeln, und das Bataillon wurde mit den anderen von der Front abgelöst, die sich auf den Marsch machte.")).toBe("deu");
    expect(spracheRaten("Statuitur ut abbates qui ad Capitulum non venerint sint in levi culpa et in pane et aqua, et si eorum aliquis non venerit, ab officio suspendatur per annum.")).toBe("lat");
    expect(spracheRaten("Le chapitre général se réunissait chaque année à l'abbaye mère; les abbés de toutes les maisons étaient tenus d'y assister, sauf ceux qui sont des régions les plus éloignées.")).toBe("fra");
    expect(spracheRaten("The knives recovered from the excavations in London range in date from the twelfth to the fifteenth century, and most of the blades were forged with a steel edge.")).toBe("eng");
    expect(spracheRaten("Statuitur ut abbates qui ad Capitulum non venerint sint in levi culpa, et eorum quod in pane et aqua. (1) Le manuscrit de Dijon donne une leçon différente pour ce passage; nous suivons ici le texte de la plupart des témoins et la lettre de l'abbé.")).toBe("lat+fra");
    expect(spracheRaten("Karte 12")).toBeNull();
  });
});
