import { PDFDocument, StandardFonts, TextRenderingMode, beginText, endText, popGraphicsState, pushGraphicsState,
  setCharacterSqueeze, setFontAndSize, setTextMatrix, setTextRenderingMode, showText, type PDFFont, type PDFName } from "pdf-lib";
import { fuerSuche } from "./text";

/**
 * Ein durchsuchbares PDF aus Seitenbildern.
 *
 * Jede Seite ist das Foto, darüber liegt unsichtbar der erkannte Text, Wort
 * für Wort an seiner Stelle. Wer im PDF sucht oder markiert, trifft die
 * richtige Zeile – so wie bei einem PDF aus dem Kopierer mit Texterkennung.
 *
 * Die unsichtbare Schrift ist Helvetica aus dem PDF-Standard: Sie muss nicht
 * eingebettet werden, kann aber nur westeuropäische Zeichen. Das lange ſ
 * wird deshalb zum runden s – im PDF dient der Text nur dem Suchen. Den
 * Wortlaut mit ſ hält die Datenbank (source_pages).
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
}

/** Angenommene Auflösung, aus der sich die Seitengrösse ergibt. */
const DPI = 200;

/** Nur Zeichen, die die Schrift kennt; der Rest fällt weg. */
function darstellbar(text: string, zeichen: Set<number>): string {
  let aus = "";
  for (const z of fuerSuche(text)) {
    const code = z.codePointAt(0)!;
    if (zeichen.has(code)) aus += z;
  }
  return aus.trim();
}

function textEbene(font: PDFFont, schluessel: PDFName, zeichen: Set<number>, seite: PdfSeite, mass: number, hoehePt: number) {
  const ops = [pushGraphicsState(), beginText(), setTextRenderingMode(TextRenderingMode.Invisible)];
  for (const w of seite.woerter ?? []) {
    const text = darstellbar(w.text, zeichen);
    if (!text) continue;
    const hoehe = Math.max(1, (w.y1 - w.y0) * mass);
    const breite = Math.max(1, (w.x1 - w.x0) * mass);
    const groesse = hoehe;
    const natuerlich = font.widthOfTextAtSize(text, groesse);
    if (natuerlich <= 0) continue;
    // Grundlinie etwa ein Fünftel über der Unterkante des Rahmens.
    const x = w.x0 * mass;
    const y = hoehePt - w.y1 * mass + hoehe * 0.2;
    ops.push(
      setFontAndSize(schluessel, groesse),
      setCharacterSqueeze((breite / natuerlich) * 100),
      setTextMatrix(1, 0, 0, 1, x, y),
      showText(font.encodeText(text)),
    );
  }
  ops.push(endText(), popGraphicsState());
  return ops;
}

export async function pdfBauen(seiten: PdfSeite[], titel: string): Promise<Uint8Array> {
  if (seiten.length === 0) throw new Error("Es gibt keine Seiten.");
  const pdf = await PDFDocument.create();
  pdf.setTitle(titel);
  pdf.setLanguage("de-DE");
  pdf.setCreator("Quellensammlung – Scannen");
  pdf.setProducer("pdf-lib");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const zeichen = new Set(font.getCharacterSet());

  for (const s of seiten) {
    const mass = 72 / DPI;
    const breitePt = s.breite * mass;
    const hoehePt = s.hoehe * mass;
    const page = pdf.addPage([breitePt, hoehePt]);
    const bild = await pdf.embedJpg(s.jpeg);
    page.drawImage(bild, { x: 0, y: 0, width: breitePt, height: hoehePt });
    if (s.woerter && s.woerter.length > 0) {
      // Die Schrift muss als Ressource an der Seite hängen, sonst kennt der
      // Leser den Namen im Textbefehl nicht.
      const schluessel = page.node.newFontDictionary(font.name, font.ref);
      page.pushOperators(...textEbene(font, schluessel, zeichen, s, mass, hoehePt));
    }
  }
  return await pdf.save();
}
