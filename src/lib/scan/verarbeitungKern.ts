import { amBundTeilen, entzerren, inPixel, kontrastStrecken, type Drehung, type Viereck } from "./geometrie";

/**
 * Aus einem Kamerabild die fertigen Seiten: drehen, Viereck gerade ziehen,
 * Kontrast, bei einer Doppelseite am Bund teilen, als JPEG.
 *
 * Läuft in einem Web Worker (verarbeitung.worker.ts), damit die Vorschau
 * der Kamera nicht stockt – bei einem 4K-Bild sind das einige hundert
 * Millisekunden Rechenarbeit. Gibt es dort keine Leinwand (ältere Browser),
 * läuft dasselbe auf der Seite selbst.
 */

export interface Zuschnitt {
  drehung: Drehung;
  viereck: Viereck;
  doppelseite: boolean;
  /** Lage des Bundes als Anteil der Breite. */
  bund: number;
  farbig: boolean;
}

export interface FertigeSeite {
  bild: Blob;
  breite: number;
  hoehe: number;
}

/** Eine Leinwand, wie sie Worker (OffscreenCanvas) und Seite (canvas) haben. */
interface Leinwand {
  width: number;
  height: number;
  getContext(art: "2d"): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
}

export type LeinwandMacher = (breite: number, hoehe: number) => Leinwand;
export type JpegMacher = (leinwand: Leinwand, qualitaet: number) => Promise<Blob>;

const QUALITAET = 0.85;

export async function verarbeiten(
  roh: Blob,
  z: Zuschnitt,
  leinwand: LeinwandMacher,
  jpeg: JpegMacher
): Promise<FertigeSeite[]> {
  const bitmap = await createImageBitmap(roh);
  const quer = z.drehung === 90 || z.drehung === 270;
  const breite = quer ? bitmap.height : bitmap.width;
  const hoehe = quer ? bitmap.width : bitmap.height;
  const gedreht = leinwand(breite, hoehe);
  const ctx = gedreht.getContext("2d")!;
  ctx.translate(breite / 2, hoehe / 2);
  ctx.rotate((z.drehung * Math.PI) / 180);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close();
  const pixel = ctx.getImageData(0, 0, breite, hoehe);

  const gerade = entzerren({ breite, hoehe, daten: pixel.data }, inPixel(z.viereck, breite, hoehe), z.farbig);
  if (!z.farbig) kontrastStrecken(gerade);
  const teile = z.doppelseite ? amBundTeilen(gerade, z.bund) : [gerade];

  const seiten: FertigeSeite[] = [];
  for (const teil of teile) {
    const l = leinwand(teil.breite, teil.hoehe);
    const c = l.getContext("2d")!;
    c.putImageData(new ImageData(teil.daten, teil.breite, teil.hoehe), 0, 0);
    seiten.push({ bild: await jpeg(l, QUALITAET), breite: teil.breite, hoehe: teil.hoehe });
  }
  return seiten;
}
