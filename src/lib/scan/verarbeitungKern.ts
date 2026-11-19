import {
  bundTeile, grauMachen, inPixel, kontrastStrecken, seiteAbtasten, seitenrahmen, type Drehung, type Gitter, type Viereck,
} from "./geometrie";
import { fingerEntfernen } from "./finger";
import { gitterBerechnen, MODELL_BREITE, MODELL_HOEHE } from "./glaetten";

/**
 * Aus einem Kamerabild die fertigen Seiten: drehen, Viereck gerade ziehen,
 * bei einer Doppelseite am Bund teilen, Wölbung glätten, Finger entfernen,
 * Kontrast, als JPEG.
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
  /** Finger am Seitenrand entfernen (fehlt das Feld: ja). */
  finger?: boolean;
  /** Gewölbte Seiten glätten (lib/scan/glaetten.ts; fehlt das Feld: nein). */
  glaetten?: boolean;
  /** Das Viereck folgt dem Buch in der Vorschau (lib/scan/seitenFinden.ts; fehlt das Feld: ja). */
  randAuto?: boolean;
}

export interface Verarbeitet {
  seiten: FertigeSeite[];
  /** Etwas ging nicht, die Seiten sind trotzdem da – etwa ohne Glätten. */
  hinweis?: string;
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
): Promise<Verarbeitet> {
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
  const kamera = { breite, hoehe, daten: ctx.getImageData(0, 0, breite, hoehe).data };

  const rahmen = seitenrahmen(inPixel(z.viereck, breite, hoehe));
  const teile = z.doppelseite ? bundTeile(rahmen.breite, z.bund) : [[0, rahmen.breite] as [number, number]];
  // Finger erkennt man an der Farbe – also farbig abtasten, Finger
  // entfernen, dann grau.
  const mitFinger = z.finger !== false;
  let hinweis: string | undefined;

  const seiten: FertigeSeite[] = [];
  for (const [x0, teilBreite] of teile) {
    let gitter: Gitter | null = null;
    if (z.glaetten === true && !hinweis) {
      try {
        const klein = seiteAbtasten(kamera, rahmen, { x0, breite: teilBreite, ausBreite: MODELL_BREITE, ausHoehe: MODELL_HOEHE, farbig: true });
        gitter = await gitterBerechnen(klein);
      } catch (err) {
        hinweis = `Glätten ging nicht (${err instanceof Error ? err.message : String(err)}); die Seiten sind ungeglättet aufgenommen.`;
      }
    }
    // Viereck, Bund und Glätten in einer Abtastung.
    const seite = seiteAbtasten(kamera, rahmen, { x0, breite: teilBreite, gitter, farbig: z.farbig || mitFinger });
    if (mitFinger) fingerEntfernen(seite);
    if (!z.farbig) {
      if (mitFinger) grauMachen(seite);
      kontrastStrecken(seite);
    }
    const l = leinwand(seite.breite, seite.hoehe);
    l.getContext("2d")!.putImageData(new ImageData(seite.daten, seite.breite, seite.hoehe), 0, 0);
    seiten.push({ bild: await jpeg(l, QUALITAET), breite: seite.breite, hoehe: seite.hoehe });
  }
  return { seiten, hinweis };
}
