import {
  bundTeile, inPixel, kontrastStrecken, seiteAbtasten, seitenrahmen, viereckDrehen, type Drehung, type Gitter,
  type Viereck,
} from "./geometrie";
import { fingerEntfernen } from "./finger";
import { seiteAufbereiten, type Befund } from "./aufbereitung";
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
  /** Am Handy: Drehung aus der Lage des Handys (lib/scan/lage.ts; fehlt das Feld: ja). */
  drehungAuto?: boolean;
  /** Was zur Lage hinzu gedreht wurde – von Hand oder weil die Seiten auf dem Kopf standen. */
  drehungVersatz?: number;
  /** Den Bund im Bild suchen statt ihn fest zu setzen (fehlt das Feld: ja). */
  bundAuto?: boolean;
}

/**
 * Einen Zuschnitt mit dem Bild weiterdrehen (im Uhrzeigersinn). Das Viereck
 * dreht mit; bei 180° liegt der Bund danach von der anderen Seite gemessen.
 */
export function zuschnittDrehen(z: Zuschnitt, grad: 90 | 180 | 270): Zuschnitt {
  let viereck = z.viereck;
  for (let i = 0; i < grad / 90; i++) viereck = viereckDrehen(viereck);
  return {
    ...z,
    drehung: ((z.drehung + grad) % 360) as Drehung,
    viereck,
    bund: grad === 180 ? 1 - z.bund : z.bund,
  };
}

/**
 * Wo liegt der Bund wirklich? Das Buch liegt nicht immer mittig im Rahmen,
 * und ein fest gesetzter Bund schnitt auf manchen Seiten die ersten
 * Buchstaben jeder Zeile ab (erstes Buch vom Handy: „janische Garde" statt
 * „Spanische Garde"; an einem Probefoto „ledrichs" statt „Friedrichs").
 *
 * Am Bund springt die Helligkeit: Die eine Seite wölbt sich zum Licht und
 * glänzt, die andere liegt im Schatten, oder der Bund ist eine schmale
 * dunkle Kerbe. Gemessen an zwei Fotos: von 243 auf 116 und von 247 auf 184
 * innerhalb weniger Spalten. Textspalten ändern ihre Helligkeit viel
 * sanfter. Gesucht wird deshalb der steilste Sprung nahe der Vorgabe
 * (± 12 % der Breite); ist keiner deutlich (mindestens 12 % der Helligkeit),
 * bleibt es bei der Vorgabe.
 *
 * `spalten` ist die mittlere Helligkeit je Spalte der gerade gezogenen
 * Doppelseite (links nach rechts).
 */
export function bundAusSpalten(spalten: Float32Array, vorgabe: number): number {
  const n = spalten.length;
  if (n < 20) return vorgabe;
  const glatt = new Float32Array(n);
  for (let i = 0; i < n; i++) glatt[i] = (spalten[Math.max(0, i - 1)] + spalten[i] + spalten[Math.min(n - 1, i + 1)]) / 3;
  const von = Math.max(2, Math.round((vorgabe - 0.12) * n));
  const bis = Math.min(n - 3, Math.round((vorgabe + 0.12) * n));
  let beste = -1, sprung = 0, hellste = 0;
  for (let i = von; i <= bis; i++) {
    hellste = Math.max(hellste, glatt[i]);
    const d = Math.abs(glatt[i + 2] - glatt[i - 2]);
    if (d > sprung) { sprung = d; beste = i; }
  }
  return beste >= 0 && sprung >= hellste * 0.12 ? beste / n : vorgabe;
}

/** Überlappung am Bund: lieber ein Streifen der Nachbarseite als abgeschnittene Buchstaben. */
export const BUND_UEBERLAPPUNG = 0.02;

export interface Verarbeitet {
  seiten: FertigeSeite[];
  /** Etwas ging nicht, die Seiten sind trotzdem da – etwa ohne Glätten. */
  hinweis?: string;
}

export interface FertigeSeite {
  bild: Blob;
  breite: number;
  hoehe: number;
  /** Was die Aufbereitung über die Seite weiss: leer, dunkel, Schärfe, Lage. */
  befund?: Befund;
}

/** Eine Leinwand, wie sie Worker (OffscreenCanvas) und Seite (canvas) haben. */
interface Leinwand {
  width: number;
  height: number;
  getContext(art: "2d"): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
}

export type LeinwandMacher = (breite: number, hoehe: number) => Leinwand;
export type JpegMacher = (leinwand: Leinwand, qualitaet: number) => Promise<Blob>;

const QUALITAET = 0.75;

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
  let bund = z.bund;
  if (z.doppelseite && z.bundAuto !== false) {
    const klein = seiteAbtasten(kamera, rahmen, { ausBreite: 400, ausHoehe: Math.max(40, Math.round((400 * rahmen.hoehe) / rahmen.breite)) });
    const spalten = new Float32Array(klein.breite);
    const y0 = Math.floor(klein.hoehe * 0.1), y1 = Math.ceil(klein.hoehe * 0.9);
    for (let x = 0; x < klein.breite; x++) {
      let s = 0;
      for (let y = y0; y < y1; y++) s += klein.daten[(y * klein.breite + x) * 4];
      spalten[x] = s / (y1 - y0);
    }
    bund = bundAusSpalten(spalten, z.bund);
  }
  const ueber = Math.round(rahmen.breite * BUND_UEBERLAPPUNG);
  const teile: [number, number][] = z.doppelseite
    ? bundTeile(rahmen.breite, bund).map(([x0, b], i) => (i === 0
      ? [x0, Math.min(rahmen.breite - x0, b + ueber)]
      : [Math.max(0, x0 - ueber), b + Math.min(ueber, x0)]))
    : [[0, rahmen.breite]];
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
    // Viereck, Bund und Glätten in einer Abtastung – farbig, denn Finger
    // und Abbildungen erkennt man an der Farbe.
    const roh = seiteAbtasten(kamera, rahmen, { x0, breite: teilBreite, gitter, farbig: true });
    if (mitFinger) fingerEntfernen(roh);
    // Lage, Schräglage, Beleuchtung (lib/scan/aufbereitung.ts).
    const { bild: seite, befund } = seiteAufbereiten(roh, { farbig: z.farbig });
    // Einband: nicht aufhellen, nur den Kontrast strecken (farbig).
    if (befund.dunkel) kontrastStrecken(seite);
    const l = leinwand(seite.breite, seite.hoehe);
    l.getContext("2d")!.putImageData(new ImageData(seite.daten, seite.breite, seite.hoehe), 0, 0);
    seiten.push({ bild: await jpeg(l, QUALITAET), breite: seite.breite, hoehe: seite.hoehe, befund });
  }
  return { seiten, hinweis };
}
