// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { pdfBauen } from "@/lib/scan/pdf";
import { fuerSuche, seitentextAufraeumen } from "@/lib/scan/text";

/**
 * Das PDF aus dem Scanner. Was nicht passieren darf: dass ein Zeichen, das
 * die PDF-Schrift nicht kennt (das lange ſ, ein Pfeil aus der
 * Texterkennung), den ganzen Scan scheitern lässt.
 */

// Ein JPEG mit 1 × 1 Punkt, grau.
const JPEG = Uint8Array.from(Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/" +
  "wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==", "base64"));

describe("Durchsuchbares PDF", () => {
  it("legt je Bild eine Seite an, in der Grösse des Bildes", async () => {
    const bytes = await pdfBauen([
      { jpeg: JPEG, breite: 1000, hoehe: 1400 },
      { jpeg: JPEG, breite: 1000, hoehe: 1400, woerter: [{ text: "Gehorſam", x0: 10, y0: 10, x1: 200, y1: 50 }] },
    ], "Probe");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getTitle()).toBe("Probe");
    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width)).toBe(360);
    expect(Math.round(height)).toBe(504);
  });

  it("übersteht Zeichen, die die Schrift nicht kennt", async () => {
    const bytes = await pdfBauen([
      { jpeg: JPEG, breite: 500, hoehe: 500, woerter: [
        { text: "→", x0: 0, y0: 0, x1: 10, y1: 10 },
        { text: "Dieſe„Truppen“—", x0: 20, y0: 0, x1: 120, y1: 10 },
      ] },
    ], "Zeichen");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("verweigert ein leeres Buch", async () => {
    await expect(pdfBauen([], "leer")).rejects.toThrow(/keine Seiten/);
  });
});

describe("Text", () => {
  it("sucht mit rundem s, wie die Datenbank", () => {
    expect(fuerSuche("Gehorſam der Soldaten Friedꝛichs")).toBe("Gehorsam der Soldaten Friedrichs");
  });

  it("räumt Leerzeilen auf, ohne den Wortlaut zu ändern", () => {
    expect(seitentextAufraeumen("  Zeile  \n\n\n\nZwei \n")).toBe("Zeile\n\nZwei");
  });
});

describe("Einheitliches PDF mit Textebene", () => {
  it("gibt allen Seiten dieselbe Grösse, Querformat in gleicher Höhe", async () => {
    const bytes = await pdfBauen([
      { jpeg: JPEG, breite: 1000, hoehe: 1400 },
      { jpeg: JPEG, breite: 1100, hoehe: 1500 },
      { jpeg: JPEG, breite: 900, hoehe: 1300 },
      { jpeg: JPEG, breite: 2000, hoehe: 1400 },
    ], "Format");
    const pdf = await PDFDocument.load(bytes);
    const g = pdf.getPages().map((p) => p.getSize());
    expect(g[0]).toEqual(g[1]);
    expect(g[1]).toEqual(g[2]);
    expect(g[3].height).toBeCloseTo(g[0].height, 5);
    expect(g[3].width).toBeGreaterThan(g[3].height);
  });

  it("bettet Noto Sans ein, setzt Sprache, Angaben und Seitenzählung", async () => {
    const { readFileSync } = await import("node:fs");
    const schrift = new Uint8Array(readFileSync("ocr-modelle/NotoSans-Regular.ttf"));
    const bytes = await pdfBauen([
      { jpeg: JPEG, breite: 1000, hoehe: 1400 },
      { jpeg: JPEG, breite: 1000, hoehe: 1400, woerter: [{ text: "Łódź", x0: 10, y0: 10, x1: 200, y1: 50 }, { text: "Gehorſam", x0: 210, y0: 12, x1: 400, y1: 50 }] },
    ], { titel: "Probe", autor: "Stein", schrift, zaehlung: { pdfSeite: 2, buchSeite: 1 } });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getAuthor()).toBe("Stein");
    expect(pdf.getCreator()).toBe("DileHi Quellensammlung");
    const katalog = pdf.catalog.toString();
    expect(katalog).toContain("/Lang (de-DE)");
    expect(katalog).toContain("/PageLabels");
    const schriften = pdf.context.enumerateIndirectObjects().map(([, o]) => o.toString()).filter((t) => t.includes("/BaseFont"));
    expect(schriften.some((t) => t.includes("NotoSans"))).toBe(true);
  });
});
