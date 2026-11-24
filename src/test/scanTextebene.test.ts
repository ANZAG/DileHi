// @vitest-environment node
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, PDFName, StandardFonts, TextRenderingMode, degrees } from "pdf-lib";
import { angabenVervollstaendigen, textEbeneEinfuegen, utf8Reparieren } from "@/lib/scan/pdf";
import { alteTextebeneEntfernen, schriftSchluessel, textBloeckeEntfernen } from "@/lib/scan/textebeneEntfernen";
import fontkit from "@pdf-lib/fontkit";

/**
 * Nie zwei Textebenen übereinander (Becker/Hefner Band 06: die alte
 * Fraktur-Erkennung von archive.org und unsere vermischt).
 */

const bytes = (s: string) => new Uint8Array(Buffer.from(s, "latin1"));
const text = (b: Uint8Array) => Buffer.from(b).toString("latin1");

describe("Textblöcke entfernen", () => {
  it("entfernt fremde Blöcke und lässt Bilder, Pfade und eigene stehen", () => {
    const inhalt = bytes([
      "q 600 0 0 800 0 0 cm /Im0 Do Q",
      "BT 3 Tr /F1 12 Tf 10 10 Td (Jn\\(\\)alt0 ET BT) Tj ET",
      "0 0 m 10 10 l S",
      "BT /Noto 10 Tf <0041> Tj ET",
      "BT 3 Tr /F1 9 Tf [(Stdberfebes) -20 (Juftitut)] TJ ET",
    ].join("\n"));
    const { bytes: aus, entfernt } = textBloeckeEntfernen(inhalt, (s) => s === "Noto");
    expect(entfernt).toBe(2);
    const t = text(aus);
    expect(t).toContain("/Im0 Do");
    expect(t).toContain("0 0 m 10 10 l S");
    expect(t).toContain("<0041> Tj");
    expect(t).not.toContain("Jn");
    expect(t).not.toContain("Juftitut");
  });

  it("kennt die Schrift auch aus einem früheren Block und nach q/Q", () => {
    const inhalt = bytes("q BT /Noto 10 Tf ET Q BT /F1 8 Tf ET BT (alt) Tj ET q BT /Noto 9 Tf (neu) Tj ET Q");
    const t = text(textBloeckeEntfernen(inhalt, (s) => s === "Noto").bytes);
    expect(t).not.toContain("(alt)");
    expect(t).toContain("(neu)");
  });

  it("überspringt eingebettete Bilder, auch wenn darin „BT“ vorkommt", () => {
    const inhalt = bytes("BI /W 2 /H 1 /BPC 8 /CS /G ID \x00BT\xff EI\nBT /F1 8 Tf (alt) Tj ET");
    const r = textBloeckeEntfernen(inhalt, () => false);
    expect(r.entfernt).toBe(1);
    expect(text(r.bytes)).toContain("ID \x00BT\xff EI");
  });
});

describe("Textebene einfügen", () => {
  it("ersetzt eine alte Textebene statt sie zu stapeln", async () => {
    const alt = await PDFDocument.create();
    const seite = alt.addPage([400, 600]);
    const helv = await alt.embedFont(StandardFonts.Helvetica);
    seite.drawText("Stdberfebes Juftitut", { x: 20, y: 500, size: 12, font: helv, renderMode: TextRenderingMode.Invisible } as never);
    const original = await alt.save();

    const schrift = new Uint8Array(readFileSync("ocr-modelle/NotoSans-Regular.ttf"));
    const r = await textEbeneEinfuegen(original, [{
      seite: 1, bildBreite: 1000, bildHoehe: 1500,
      woerter: [{ text: "Stadel'sches", x0: 50, y0: 200, x1: 300, y1: 240 }, { text: "Institut", x0: 320, y0: 200, x1: 500, y1: 240 }],
    }], schrift, { titel: "Becker Band 06", sprache: "de-DE" });
    expect(r.entfernt).toBe(1);

    const ordner = mkdtempSync(join(tmpdir(), "ebene-"));
    writeFileSync(join(ordner, "a.pdf"), r.bytes);
    const gelesen = execFileSync("pdftotext", [join(ordner, "a.pdf"), "-"]).toString("utf8");
    expect(gelesen).toContain("Stadel'sches Institut");
    expect(gelesen).not.toContain("Juftitut");

    const pdf = await PDFDocument.load(r.bytes);
    expect(pdf.getTitle()).toBe("Becker Band 06");
    expect(pdf.catalog.lookup(PDFName.of("Lang"))?.toString()).toContain("de-DE");
  });
});

describe("Aufräumen", () => {
  it("entfernt unter unserer Textebene die alte, Seiten ohne unsere bleiben", async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const noto = await doc.embedFont(readFileSync("ocr-modelle/NotoSans-Regular.ttf"), { subset: true });
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const s1 = doc.addPage([400, 600]);
    s1.drawText("Jnhalt alt", { x: 20, y: 500, size: 12, font: helv });
    s1.drawText("Inhalt neu", { x: 20, y: 400, size: 12, font: noto });
    const s2 = doc.addPage([400, 600]);
    s2.drawText("nur alt", { x: 20, y: 500, size: 12, font: helv });
    const pdf = await PDFDocument.load(await doc.save());
    const [a, b] = pdf.getPages();
    const unsere = schriftSchluessel(a, /NotoSans/);
    expect(unsere.size).toBe(1);
    expect(alteTextebeneEntfernen(pdf, a, (s) => s !== null && unsere.has(s))).toBe(1);
    expect(schriftSchluessel(b, /NotoSans/).size).toBe(0);
    const ordner = mkdtempSync(join(tmpdir(), "ebene-"));
    writeFileSync(join(ordner, "b.pdf"), await pdf.save());
    const gelesen = execFileSync("pdftotext", [join(ordner, "b.pdf"), "-"]).toString("utf8");
    expect(gelesen).toContain("Inhalt neu");
    expect(gelesen).not.toContain("Jnhalt alt");
    expect(gelesen).toContain("nur alt");
  });

  it("repariert Titel, setzt /Lang und ersetzt leere Seitenlabels", async () => {
    expect(utf8Reparieren("Kunstwerke und GerÃ¤thschaften")).toBe("Kunstwerke und Geräthschaften");
    expect(utf8Reparieren("Geräthschaften")).toBe("Geräthschaften");
    const doc = await PDFDocument.create();
    for (let i = 0; i < 4; i++) doc.addPage([100, 100]);
    doc.setTitle("Klosterleben im Mittelalter - Zisterzienser.pdf");
    const ctx = doc.context;
    doc.catalog.set(PDFName.of("PageLabels"), ctx.obj({ Nums: ctx.obj([0, ctx.obj({})]) }));
    angabenVervollstaendigen(doc, { titel: "x", sprache: "la", bereiche: [{ pdfSeite: 1, art: "roemisch", start: 1 }, { pdfSeite: 3, art: "zahl", start: 1 }] });
    expect(doc.getTitle()).toBe("Klosterleben im Mittelalter - Zisterzienser");
    expect(String(doc.catalog.get(PDFName.of("Lang")))).toContain("la");
    expect(String(doc.catalog.lookup(PDFName.of("PageLabels")))).toContain("/S /D");
  });
});

describe("Gedrehte Seiten", () => {
  for (const drehung of [0, 90, 180, 270]) {
    it(`setzt die Ebene auch bei /Rotate ${drehung} an die richtige Stelle`, async () => {
      const doc = await PDFDocument.create();
      const seite = doc.addPage([400, 600]);
      seite.setRotation(degrees(drehung));
      const quer = drehung % 180 !== 0;
      const [bb, bh] = quer ? [1200, 800] : [800, 1200]; // Bild in der Ansicht, 2 Punkte je PDF-Punkt
      const r = await textEbeneEinfuegen(await doc.save(), [{
        seite: 1, bildBreite: bb, bildHoehe: bh,
        woerter: [{ text: "Waffenrock", x0: 100, y0: 100, x1: 400, y1: 160 }],
      }], new Uint8Array(readFileSync("ocr-modelle/NotoSans-Regular.ttf")));
      expect(r.gesetzt).toBe(1);
      const ordner = mkdtempSync(join(tmpdir(), "dreh-"));
      writeFileSync(join(ordner, "d.pdf"), r.bytes);
      const html = execFileSync("pdftotext", ["-bbox", join(ordner, "d.pdf"), "-"]).toString("utf8");
      const m = /xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">Waffenrock/.exec(html);
      expect(m).not.toBeNull();
      const [x0, y0, x1, y1] = m!.slice(1).map(Number);
      // In der Ansicht: x 50…200, y 50…80 (Punkte, oben links)
      expect(Math.abs(x0 - 50)).toBeLessThan(4);
      expect(Math.abs(x1 - 200)).toBeLessThan(6);
      // Die Box enthält Ober- und Unterlänge der Schrift; ihre Mitte liegt in der Zeile (50…80).
      expect(Math.abs((y0 + y1) / 2 - 65)).toBeLessThan(5);
    });
  }
});
