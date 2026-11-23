import {
  PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRef, PDFStream, PDFString, StandardFonts, TextRenderingMode, beginText, endText,
  popGraphicsState, pushGraphicsState, setCharacterSqueeze, setFontAndSize, setTextMatrix, setTextRenderingMode,
  showText, type PDFFont,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { alteTextebeneEntfernen } from "./textebeneEntfernen";
import { fuerSuche, type Bereich } from "./text";

/**
 * Ein durchsuchbares PDF aus Seitenbildern.
 *
 * Jede Seite ist das Foto, darüber liegt unsichtbar der erkannte Text –
 * Zeile für Zeile in der Reihenfolge, in der Tesseract liest (Blöcke,
 * Absätze, Zeilen). Jede Zeile ist ein Stück Text mit echten Leerzeichen,
 * auf einer Grundlinie, so breit gezogen wie die Zeile im Bild. So findet
 * die Suche Wortfolgen, Markieren trifft die richtige Zeile, und wer den
 * Text herauskopiert oder mit `pdftotext` liest, bekommt ganze Zeilen in der
 * richtigen Reihenfolge – nicht Wortfetzen. Trennungen bleiben, wie sie
 * gedruckt sind („wur-“), damit der Text zum Bild passt.
 *
 * Die Schrift ist Noto Sans, eingebettet als Teilmenge: Auch Zeichen
 * ausserhalb von Windows-1252 lassen sich suchen und kopieren. Fehlt sie,
 * gilt Helvetica (nur westeuropäische Zeichen). Das lange ſ wird zum runden
 * s, damit die Suche „Haus“ auch „Hauſ“ findet; den Wortlaut mit ſ hält die
 * Datenbank (source_pages).
 *
 * Alle Seiten bekommen dieselbe Grösse (Median der Seitenverhältnisse);
 * jedes Bild steht mittig darauf. Querformatige Seiten (ausklappbare Karten)
 * bleiben quer, in gleicher Höhe.
 */

export interface Wort {
  text: string;
  /** Rahmen in Bildpunkten der Seite: links, oben, rechts, unten. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PdfSeite {
  /** JPEG der Seite. */
  jpeg: Uint8Array;
  breite: number;
  hoehe: number;
  woerter?: Wort[];
  /**
   * Auflösung dieses Bildes, wenn bekannt (Nachbearbeitung: aus dem alten
   * PDF). Dann wird die Seite in wahrer Grösse gesetzt statt aufs Format
   * gezogen – sonst wirkt ein Bild mit etwas mehr Rand kleiner gedruckt als
   * seine Nachbarn.
   */
  dpi?: number;
}

export interface PdfAngaben {
  titel: string;
  autor?: string;
  thema?: string;
  stichwoerter?: string[];
  /** Noto Sans (TTF); ohne: Helvetica. */
  schrift?: Uint8Array;
  /** Seitenzählung wie im Buch: PDF-Seite `pdfSeite` (ab 1) ist Buchseite `buchSeite`. */
  zaehlung?: { pdfSeite: number; buchSeite: number };
  /** Zählung in Abschnitten (geht vor `zaehlung`), etwa mit eingeschobenen Tafeln. */
  bereiche?: Bereich[];
  /** Bildpunkte je Zoll der Seitenbilder, wenn bekannt (aus einem PDF gerendert); sonst 200. */
  dpi?: number;
  /** Seitengrösse in Punkten vorgeben (Seiten in ein vorhandenes PDF einsetzen). */
  format?: { breite: number; hoehe: number };
  /** Sprache des Textes (BCP 47, etwa „de-DE“, „la“); ohne: de-DE. */
  sprache?: string;
}

/** Titel ohne Dateiendung („Klosterleben … .pdf“ → „Klosterleben …“). */
export function titelOhneEndung(titel: string): string {
  return titel.replace(/\.pdf$/i, "").trim();
}

/**
 * Als Latin-1 gelesenes UTF-8 reparieren („GerÃ¤thschaften“ →
 * „Geräthschaften“), sonst unverändert.
 */
export function utf8Reparieren(s: string): string {
  if (!/[ÃÂ][\u0080-\u00bf]/.test(s)) return s;
  const bytes = Uint8Array.from([...s].map((c) => c.charCodeAt(0)));
  if (bytes.some((b) => b > 0xff)) return s;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return s;
  }
}

/** Sind alle Einträge der Seitenbeschriftung leer (weder Stil noch Vorsatz)? Dann zeigt jeder Leser leere Labels. */
export function seitenBeschriftungLeer(pdf: PDFDocument): boolean {
  const labels = pdf.catalog.lookupMaybe(PDFName.of("PageLabels"), PDFDict);
  if (!labels) return false;
  // Zahlenbaum: Einträge in /Nums, oder verteilt auf /Kids.
  const offen: PDFDict[] = [labels];
  while (offen.length) {
    const knoten = offen.pop()!;
    const nums = knoten.lookupMaybe(PDFName.of("Nums"), PDFArray);
    if (nums) for (let i = 1; i < nums.size(); i += 2) {
      const d = nums.lookup(i);
      if (d instanceof PDFDict && (d.has(PDFName.of("S")) || d.has(PDFName.of("P")))) return false;
    }
    const kids = knoten.lookupMaybe(PDFName.of("Kids"), PDFArray);
    if (kids) for (let i = 0; i < kids.size(); i++) { const k = kids.lookup(i); if (k instanceof PDFDict) offen.push(k); }
  }
  return true;
}

/**
 * Angaben eines vorhandenen PDF vervollständigen: Titel (fehlt, endet auf
 * „.pdf“ oder ist kaputt kodiert), Sprache (/Lang), Autor, Thema,
 * Stichwörter; vorhandene gute Angaben bleiben. Alles als Unicode.
 */
export function angabenVervollstaendigen(pdf: PDFDocument, a: Partial<Omit<PdfAngaben, "schrift" | "dpi" | "format">>) {
  const titel = pdf.getTitle();
  const repariert = titel ? titelOhneEndung(utf8Reparieren(titel)) : "";
  if (repariert) { if (repariert !== titel) pdf.setTitle(repariert); }
  else if (a.titel) pdf.setTitle(titelOhneEndung(a.titel));
  if (!pdf.catalog.has(PDFName.of("Lang"))) pdf.setLanguage(a.sprache ?? "de-DE");
  const autor = pdf.getAuthor();
  if (autor) { const r = utf8Reparieren(autor); if (r !== autor) pdf.setAuthor(r); }
  else if (a.autor) pdf.setAuthor(a.autor);
  const thema = pdf.getSubject();
  if (thema) { const r = utf8Reparieren(thema); if (r !== thema) pdf.setSubject(r); }
  else if (a.thema) pdf.setSubject(a.thema);
  if (a.stichwoerter?.length && !pdf.getKeywords()) pdf.setKeywords([a.stichwoerter.join(", ")]);
  const z = a.bereiche ?? a.zaehlung;
  const leer = seitenBeschriftungLeer(pdf);
  if (z && (leer || !pdf.catalog.has(PDFName.of("PageLabels")))) seitenBeschriftung(pdf, z);
  else if (leer) pdf.catalog.delete(PDFName.of("PageLabels"));
}

/** Angenommene Auflösung, aus der sich die Seitengrösse ergibt. */
const DPI = 200;

export interface Zeile {
  woerter: Wort[];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Grundlinie (y in Bildpunkten). */
  grund: number;
}

const median = (werte: number[]) => {
  if (!werte.length) return 0;
  const s = [...werte].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * Die Wörter kommen von Tesseract schon in Lesereihenfolge. Zu einer Zeile
 * gehört, was danach rechts weitergeht und sich in der Höhe überschneidet.
 */
export function zeilenBilden(woerter: Wort[]): Zeile[] {
  const zeilen: Wort[][] = [];
  for (const w of woerter) {
    const z = zeilen[zeilen.length - 1];
    const letzte = z?.[z.length - 1];
    if (letzte) {
      const ueber = Math.min(letzte.y1, w.y1) - Math.max(letzte.y0, w.y0);
      const hoehe = Math.min(letzte.y1 - letzte.y0, w.y1 - w.y0);
      if (w.x0 >= letzte.x0 && ueber > hoehe * 0.4) { z.push(w); continue; }
    }
    zeilen.push([w]);
  }
  return zeilen.map((ws) => ({
    woerter: ws,
    x0: Math.min(...ws.map((w) => w.x0)),
    y0: Math.min(...ws.map((w) => w.y0)),
    x1: Math.max(...ws.map((w) => w.x1)),
    y1: Math.max(...ws.map((w) => w.y1)),
    // Die Unterkante der meisten Wörter ist die Grundlinie (Unterlängen sind seltener).
    grund: median(ws.map((w) => w.y1)),
  }));
}

/** Nur Zeichen, die die Schrift kennt; der Rest fällt weg. */
function darstellbar(text: string, zeichen: Set<number> | null): string {
  const t = fuerSuche(text);
  if (!zeichen) return t;
  let aus = "";
  for (const z of t) if (zeichen.has(z.codePointAt(0)!)) aus += z;
  return aus;
}

interface Lage {
  /** Punkte je Bildpunkt. */
  mass: number;
  /** Ecke unten links des Bildes auf der Seite. */
  x: number;
  y: number;
  /** Höhe des Bildes auf der Seite. */
  hoehe: number;
}

function textEbene(font: PDFFont, schluessel: PDFName, zeichen: Set<number> | null, seite: PdfSeite, l: Lage) {
  const ops = [pushGraphicsState(), beginText(), setTextRenderingMode(TextRenderingMode.Invisible)];
  for (const z of zeilenBilden(seite.woerter ?? [])) {
    const text = z.woerter.map((w) => darstellbar(w.text, zeichen).trim()).filter(Boolean).join(" ");
    if (!text) continue;
    // Schriftgrösse aus der Höhe über der Grundlinie (Oberlänge ≈ 0,75 Geviert).
    const ueberGrund = Math.max(1, z.grund - z.y0);
    const groesse = Math.max(1, (ueberGrund / 0.75) * l.mass);
    const breite = Math.max(1, (z.x1 - z.x0) * l.mass);
    const natuerlich = font.widthOfTextAtSize(text, groesse);
    if (natuerlich <= 0) continue;
    ops.push(
      setFontAndSize(schluessel, groesse),
      setCharacterSqueeze(Math.max(1, Math.min(1000, (breite / natuerlich) * 100))),
      setTextMatrix(1, 0, 0, 1, l.x + z.x0 * l.mass, l.y + l.hoehe - z.grund * l.mass),
      showText(font.encodeText(text)),
    );
  }
  ops.push(endText(), popGraphicsState());
  return ops;
}

/** Eine Seite eines vorhandenen PDF, die eine Textebene bekommt. */
export interface TextFuerSeite {
  /** Seite, ab 1. */
  seite: number;
  /** Wörter in Bildpunkten des gerenderten Bildes (CropBox, ohne Drehung). */
  woerter: Wort[];
  bildBreite: number;
  bildHoehe: number;
}

/**
 * Einem vorhandenen PDF eine unsichtbare Textebene geben – nur auf den
 * genannten Seiten, die Bilder bleiben, wie sie sind. Für Schwarzweiss-Scans
 * (CCITT, JBIG2): Sie neu zu bauen, machte sie als JPEG um ein Vielfaches
 * grösser (IR87: 15 MB -> 208 MB). Gedrehte Seiten (/Rotate) bleiben ohne
 * Text, weil das Bild dann quer zur Seite liegt.
 */
export async function textEbeneEinfuegen(
  original: Uint8Array,
  seiten: TextFuerSeite[],
  schrift: Uint8Array,
  angaben: Partial<Omit<PdfAngaben, "schrift" | "dpi" | "format">> = {}
): Promise<{ bytes: Uint8Array; gesetzt: number; gedreht: number; entfernt: number }> {
  const pdf = await PDFDocument.load(original, { updateMetadata: false });
  // Angaben und Zählung nur ergänzen oder reparieren, gute bleiben.
  angabenVervollstaendigen(pdf, angaben);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(schrift, { subset: true });
  const zeichen = new Set(font.getCharacterSet());
  const alle = pdf.getPages();
  let gesetzt = 0, gedreht = 0, entfernt = 0;
  for (const t of seiten) {
    const page = alle[t.seite - 1];
    if (!page || !t.woerter.length) continue;
    if (page.getRotation().angle % 360 !== 0) { gedreht++; continue; }
    // Nie zwei Textebenen: eine alte (schlechte) Erkennung kommt weg.
    if (alteTextebeneEntfernen(pdf, page)) entfernt++;
    const box = page.getCropBox();
    const mass = box.width / t.bildBreite;
    const l: Lage = { mass, x: box.x, y: box.y, hoehe: t.bildHoehe * mass };
    const schluessel = page.node.newFontDictionary(font.name, font.ref);
    page.pushOperators(...textEbene(font, schluessel, zeichen, { jpeg: new Uint8Array(), breite: t.bildBreite, hoehe: t.bildHoehe, woerter: t.woerter }, l));
    gesetzt++;
  }
  pdf.setCreator("DileHi Quellensammlung (Textebene ergänzt)");
  verwaisteEntfernen(pdf);
  return { bytes: await pdf.save(), gesetzt, gedreht, entfernt };
}

/** Eine einheitliche Seitengrösse: Median der hochkanten Seiten. */
export function seitenFormat(seiten: { breite: number; hoehe: number; dpi?: number }[], dpi = DPI): { breite: number; hoehe: number } {
  const hoch = seiten.filter((s) => s.hoehe >= s.breite);
  const basis = hoch.length ? hoch : seiten;
  const breite = median(basis.map((s) => (s.breite * 72) / (s.dpi ?? dpi)));
  const verhaeltnis = median(basis.map((s) => s.hoehe / s.breite)) || Math.SQRT2;
  return { breite, hoehe: breite * verhaeltnis };
}

/** Römische Zahl für die Seiten vor der Zählung (Umschlag, Vorsatz). */
export function seitenBeschriftung(pdf: PDFDocument, zaehlung: { pdfSeite: number; buchSeite: number } | Bereich[]) {
  const bereiche: Bereich[] = Array.isArray(zaehlung) ? zaehlung : [
    ...(zaehlung.pdfSeite > 1 ? [{ pdfSeite: 1, art: "roemisch" as const, start: 1 }] : []),
    { pdfSeite: zaehlung.pdfSeite, art: "zahl" as const, start: Math.max(1, zaehlung.buchSeite) },
  ];
  const ctx = pdf.context;
  const nums = [];
  for (const b of bereiche) {
    const stil = b.art === "roemisch" ? { S: PDFName.of("r") }
      : b.art === "tafel" ? { S: PDFName.of("D"), P: PDFString.of("Tafel "), St: PDFNumber.of(Math.max(1, b.start)) }
      : { S: PDFName.of("D"), St: PDFNumber.of(Math.max(1, b.start)) };
    nums.push(PDFNumber.of(b.pdfSeite - 1), ctx.obj(stil));
  }
  pdf.catalog.set(PDFName.of("PageLabels"), ctx.obj({ Nums: ctx.obj(nums) }));
}

export async function pdfBauen(seiten: PdfSeite[], angaben: PdfAngaben | string): Promise<Uint8Array> {
  if (seiten.length === 0) throw new Error("Es gibt keine Seiten.");
  const a: PdfAngaben = typeof angaben === "string" ? { titel: angaben } : angaben;
  const pdf = await PDFDocument.create();
  pdf.setTitle(titelOhneEndung(a.titel));
  if (a.autor) pdf.setAuthor(a.autor);
  if (a.thema) pdf.setSubject(a.thema);
  if (a.stichwoerter?.length) pdf.setKeywords([a.stichwoerter.join(", ")]);
  pdf.setLanguage(a.sprache ?? "de-DE");
  pdf.setCreator("DileHi Quellensammlung");
  pdf.setProducer("pdf-lib");

  let font: PDFFont;
  let zeichen: Set<number> | null = null;
  if (a.schrift) {
    pdf.registerFontkit(fontkit);
    font = await pdf.embedFont(a.schrift, { subset: true });
    zeichen = new Set(font.getCharacterSet());
  } else {
    font = await pdf.embedFont(StandardFonts.Helvetica);
    zeichen = new Set(font.getCharacterSet());
  }

  const format = a.format ?? seitenFormat(seiten, a.dpi);
  for (const s of seiten) {
    const quer = s.breite > s.hoehe * 1.05;
    // Querformat: gleiche Höhe, Breite nach dem Bild. Mit bekannter
    // Auflösung (eine im Buch quer gedruckte Tafel): das Hochformat gedreht.
    const seiteB = quer ? (s.dpi ? format.hoehe : format.hoehe * (s.breite / s.hoehe)) : format.breite;
    const seiteH = quer && s.dpi ? format.breite : format.hoehe;
    const passend = Math.min(seiteB / s.breite, seiteH / s.hoehe);
    // Wahre Grösse, wenn bekannt – aber nie über die Seite hinaus.
    const mass = s.dpi ? Math.min(passend, 72 / s.dpi) : passend;
    const l: Lage = { mass, x: (seiteB - s.breite * mass) / 2, y: (seiteH - s.hoehe * mass) / 2, hoehe: s.hoehe * mass };
    const page = pdf.addPage([seiteB, seiteH]);
    const bild = await pdf.embedJpg(s.jpeg);
    page.drawImage(bild, { x: l.x, y: l.y, width: s.breite * mass, height: l.hoehe });
    if (s.woerter && s.woerter.length > 0) {
      // Die Schrift muss als Ressource an der Seite hängen, sonst kennt der
      // Leser den Namen im Textbefehl nicht.
      const schluessel = page.node.newFontDictionary(font.name, font.ref);
      page.pushOperators(...textEbene(font, schluessel, zeichen, s, l));
    }
  }
  if (a.bereiche ?? a.zaehlung) seitenBeschriftung(pdf, (a.bereiche ?? a.zaehlung)!);
  return await pdf.save();
}

/**
 * Verwaiste Objekte entfernen: pdf-lib schreibt beim Speichern alles, was
 * je geladen wurde – auch die Bilder herausgenommener Seiten. Ohne das
 * wuchs Stein mit jedem Seitenaustausch um gut 1 MB. Gibt die Zahl der
 * entfernten Objekte zurück.
 */
export function verwaisteEntfernen(pdf: PDFDocument): number {
  const ctx = pdf.context;
  const erreicht = new Set<string>();
  const offen: unknown[] = [ctx.trailerInfo.Root, ctx.trailerInfo.Info, ctx.trailerInfo.Encrypt];
  while (offen.length) {
    const o = offen.pop();
    if (o instanceof PDFRef) {
      if (erreicht.has(o.toString())) continue;
      erreicht.add(o.toString());
      offen.push(ctx.lookup(o));
    } else if (o instanceof PDFDict) offen.push(...o.values());
    else if (o instanceof PDFArray) offen.push(...o.asArray());
    else if (o instanceof PDFStream) offen.push(o.dict);
  }
  let weg = 0;
  for (const [ref] of ctx.enumerateIndirectObjects()) if (!erreicht.has(ref.toString())) { ctx.delete(ref); weg++; }
  return weg;
}
