import { aufbereiten } from "./aufbereitung";
import { createWorker, OEM, PSM, type Worker } from "tesseract.js";
import type { Wort } from "./pdf";
import { seitentextAufraeumen, spracheRaten } from "./text";

/**
 * Texterkennung im Browser, mit Tesseract.
 *
 * Zwei Modelle: `deu` für Antiqua (heutige Schrift) und `frak2021` der UB
 * Mannheim für Fraktur. Beide liegen auf dem eigenen Webspace unter /ocr/
 * (scripts/ocr-dateien.mjs); der Browser merkt sie sich nach dem ersten Laden.
 *
 * Erkannt wird in einem Web Worker, die Seite bleibt also bedienbar,
 * während im Hintergrund schon die vorigen Seiten gelesen werden.
 */

/**
 * Schrift und Sprache des Buches. Deutsch in Antiqua oder Fraktur, dazu
 * Latein, Französisch und Englisch – etwa für Quelleneditionen wie Canivez
 * (lateinische Statuten, französische Einleitung und Anmerkungen; dafür die
 * Mischung „Latein + Französisch“). Das richtige Wörterbuch hilft der
 * Erkennung vor allem bei Akzenten und abgenutztem Druck.
 */
export type Schrift = "antiqua" | "fraktur" | "latein" | "franzoesisch" | "englisch" | "latein_franzoesisch";
export type SchriftWahl = Schrift | "auto";

export const SCHRIFT_NAME: Record<Schrift, string> = {
  antiqua: "Deutsch (Antiqua)",
  fraktur: "Deutsch (Fraktur)",
  latein: "Latein",
  franzoesisch: "Französisch",
  englisch: "Englisch",
  latein_franzoesisch: "Latein + Französisch",
};
export const MODELL: Record<Schrift, string> = {
  antiqua: "deu",
  fraktur: "frak2021",
  latein: "lat",
  franzoesisch: "fra",
  englisch: "eng",
  latein_franzoesisch: "lat+fra",
};
/** Welche Schrift zu einer erratenen Sprache gehört (lib/scan/text.ts, spracheRaten). */
export const ZUR_SPRACHE: Record<string, Schrift> = {
  deu: "antiqua", lat: "latein", fra: "franzoesisch", eng: "englisch", "lat+fra": "latein_franzoesisch",
};

/**
 * Welche Erkennung gewinnt? Die sicherste – Deutsch (Antiqua) aber schon,
 * wenn es höchstens zwei Punkte zurückliegt, und Fraktur nur mit deutlichem
 * Vorsprung (fünf Punkte), wie bisher.
 */
export function besteSchrift<T extends { schrift: Schrift; sicherheit: number }>(ergebnisse: T[]): T {
  const wert = (e: T) => e.sicherheit + (e.schrift === "antiqua" ? 2 : 0) - (e.schrift === "fraktur" ? 5 : 0);
  return ergebnisse.reduce((a, b) => (wert(b) > wert(a) ? b : a));
}

export interface OcrErgebnis {
  text: string;
  woerter: Wort[];
  /** Mittlere Sicherheit der Erkennung, 0…100. */
  sicherheit: number;
  schrift: Schrift;
}

/**
 * Unter dieser Breite wird das Bild für die Erkennung vergrössert. Tesseract
 * liest am besten, wenn ein kleiner Buchstabe gut 20 Punkte hoch ist – bei
 * einer Doppelseite aus der Webcam sind es oft nur 12.
 */
const MINDESTBREITE = 2400;

const arbeiter = new Map<Schrift, Promise<Worker>>();

function arbeiterFuer(schrift: Schrift): Promise<Worker> {
  let w = arbeiter.get(schrift);
  if (!w) {
    const basis = `${window.location.origin}/ocr`;
    w = createWorker(MODELL[schrift], OEM.LSTM_ONLY, {
      workerPath: `${basis}/worker.min.js`,
      corePath: basis,
      langPath: basis,
      // Ohne Blob-Adresse: Steht die Seite hinter einem Passwort, lädt der
      // Worker sonst seine eigenen Dateien ohne Anmeldung.
      workerBlobURL: false,
      gzip: true,
    }).then(async (worker) => {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: "1",
      });
      return worker;
    });
    w.catch(() => arbeiter.delete(schrift));
    arbeiter.set(schrift, w);
  }
  return w;
}

/** Ein Bild auf eine Breite bringen, mit der die Erkennung zurechtkommt. */
async function vorbereiten(bild: Blob, breite: number, aufhellen: boolean, zusatz = 1): Promise<{ bild: Blob; faktor: number }> {
  if (breite >= MINDESTBREITE && !aufhellen && zusatz === 1) return { bild, faktor: 1 };
  const faktor = (breite >= MINDESTBREITE ? 1 : Math.min(2, MINDESTBREITE / breite)) * zusatz;
  const bitmap = await createImageBitmap(bild);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * faktor);
  canvas.height = Math.round(bitmap.height * faktor);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  if (aufhellen) {
    // Bildseite (farbig im PDF): Zum Lesen grau und mit ausgeglichener
    // Beleuchtung, sonst gehen Beschriftungen in der Farbe unter.
    const daten = ctx.getImageData(0, 0, canvas.width, canvas.height);
    aufbereiten({ breite: canvas.width, hoehe: canvas.height, daten: daten.data }, { farbig: false });
    ctx.putImageData(daten, 0, 0);
  }
  const gross = await new Promise<Blob>((ok, fehler) =>
    canvas.toBlob((b) => (b ? ok(b) : fehler(new Error("Bild nicht vergrössert."))), "image/png")
  );
  return { bild: gross, faktor };
}

export interface LeseOptionen {
  /** Eine farbige Bildseite: vor dem Lesen grau machen und Beleuchtung ausgleichen. */
  aufhellen?: boolean;
}

/**
 * Ab so vielen unsicheren Wörtern (unter 60 %) wird eine Seite auch etwas
 * kleiner und grösser gelesen. Tesseract findet die Zeilen einer leicht
 * gewölbten Seite je nach Bildgrösse verschieden gut: Stein S. 26 las es
 * bei 1540 Punkten Breite mit 4 unsicheren Wörtern, bei 1600 mit 29 und
 * Lücken mitten im Absatz („eine breite Bor am (gen un len Auf“).
 */
const UNSICHER_NOCHMAL = 8;

/** Eine Seite lesen. `breite` ist die Breite des Bildes in Punkten. */
export async function erkennen(bild: Blob, breite: number, schrift: Schrift, o: LeseOptionen = {}): Promise<OcrErgebnis> {
  let beste = await einmalLesen(bild, breite, schrift, o, 1);
  if (beste.unsicher < UNSICHER_NOCHMAL) return beste.ergebnis;
  for (const zusatz of [0.8, 1.2]) {
    const r = await einmalLesen(bild, breite, schrift, o, zusatz);
    if (r.unsicher < beste.unsicher || (r.unsicher === beste.unsicher && r.ergebnis.sicherheit > beste.ergebnis.sicherheit)) beste = r;
  }
  return beste.ergebnis;
}

async function einmalLesen(bild: Blob, breite: number, schrift: Schrift, o: LeseOptionen, zusatz: number): Promise<{ ergebnis: OcrErgebnis; unsicher: number }> {
  const worker = await arbeiterFuer(schrift);
  const { bild: eingabe, faktor } = await vorbereiten(bild, breite, o.aufhellen === true, zusatz);
  const { data } = await worker.recognize(eingabe, {}, { text: true, blocks: true });
  let unsicher = 0;
  const woerter: Wort[] = [];
  for (const block of data.blocks ?? []) {
    for (const absatz of block.paragraphs) {
      for (const zeile of absatz.lines) {
        for (const w of zeile.words) {
          if (!w.text.trim()) continue;
          if (w.confidence < 60) unsicher++;
          woerter.push({
            text: w.text,
            x0: w.bbox.x0 / faktor,
            y0: w.bbox.y0 / faktor,
            x1: w.bbox.x1 / faktor,
            y1: w.bbox.y1 / faktor,
          });
        }
      }
    }
  }
  return { ergebnis: { text: seitentextAufraeumen(data.text ?? ""), woerter, sicherheit: data.confidence ?? 0, schrift }, unsicher };
}

/**
 * Welche Schrift und Sprache? An der ersten Seite eines Buches: Antiqua
 * gegen Fraktur (das sicherere gewinnt, `besteSchrift`). Bei Antiqua
 * verrät der gelesene Text die Sprache (`spracheRaten`); ist es nicht
 * Deutsch, liest das passende Modell die Seite noch einmal. Danach bleibt
 * es bei der Wahl.
 */
export async function schriftErkennen(bild: Blob, breite: number, o: LeseOptionen = {}): Promise<OcrErgebnis> {
  const a = await erkennen(bild, breite, "antiqua", o);
  const f = await erkennen(bild, breite, "fraktur", o);
  const erst = besteSchrift([a, f]);
  if (erst.schrift === "fraktur") return erst;
  const sprache = spracheRaten(erst.text);
  const schrift = sprache ? ZUR_SPRACHE[sprache] : "antiqua";
  return schrift === "antiqua" ? erst : await erkennen(bild, breite, schrift, o);
}

/**
 * Eine Seite in der Schrift des Buches lesen – und ist das unsicher (unter
 * 70 %), bei Deutsch auch in der anderen Schrift (Antiqua ↔ Fraktur); das
 * Bessere gilt (mit fünf Punkten Vorsprung). Die erste Seite, die die
 * Schrift fürs Buch bestimmt, ist oft ein Titelblatt in Antiqua, während
 * das Buch in Fraktur gesetzt ist.
 */
export async function erkennenMitGegenprobe(bild: Blob, breite: number, schrift: Schrift, o: LeseOptionen = {}): Promise<OcrErgebnis> {
  const r = await erkennen(bild, breite, schrift, o);
  const andere: Schrift | null = schrift === "antiqua" ? "fraktur" : schrift === "fraktur" ? "antiqua" : null;
  if (!andere || r.sicherheit >= 70) return r;
  const zweit = await erkennen(bild, breite, andere, o);
  return zweit.sicherheit > r.sicherheit + 5 ? zweit : r;
}

/** Die Worker beenden, wenn die Seite verlassen wird. */
export async function ocrBeenden(): Promise<void> {
  const alle = [...arbeiter.values()];
  arbeiter.clear();
  await Promise.all(alle.map((w) => w.then((x) => x.terminate()).catch(() => undefined)));
}

/** Ein Bild drehen (im Uhrzeigersinn), als PNG. */
async function bildDrehen(bild: Blob, grad: 90 | 180 | 270): Promise<Blob> {
  const bmp = await createImageBitmap(bild);
  const quer = grad !== 180;
  const c = document.createElement("canvas");
  c.width = quer ? bmp.height : bmp.width;
  c.height = quer ? bmp.width : bmp.height;
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((grad * Math.PI) / 180);
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  bmp.close();
  return await new Promise((ok, fehler) => c.toBlob((b) => (b ? ok(b) : fehler(new Error("Drehen fehlgeschlagen."))), "image/png"));
}

/**
 * Steht die Seite auf dem Kopf (oder quer)? Nur gefragt, wenn eine Seite mit
 * Text schlecht gelesen wurde: Dann liest die Erkennung sie auch gedreht.
 * Eine Richtung gilt nur, wenn sie deutlich besser ist – eine Bildtafel
 * liest sich in jeder Richtung schlecht und bleibt, wie sie ist.
 *
 * Ergebnis: um wie viel Grad (im Uhrzeigersinn) zu drehen ist; 0 heisst, so
 * lassen.
 */
export async function ausrichtungFinden(
  bild: Blob,
  breite: number,
  hoehe: number,
  ergebnis: OcrErgebnis,
  o: LeseOptionen = {}
): Promise<0 | 90 | 180 | 270> {
  if (ergebnis.sicherheit >= 45 || ergebnis.text.length < 80) return 0;
  let beste: { grad: 0 | 90 | 180 | 270; sicherheit: number } = { grad: 0, sicherheit: ergebnis.sicherheit };
  const versuch = async (grad: 90 | 180 | 270) => {
    const r = await erkennen(await bildDrehen(bild, grad), grad === 180 ? breite : hoehe, ergebnis.schrift, o);
    if (r.sicherheit > beste.sicherheit) beste = { grad, sicherheit: r.sicherheit };
  };
  await versuch(180);
  if (beste.sicherheit < 30) {
    await versuch(90);
    await versuch(270);
  }
  return beste.grad !== 0 && beste.sicherheit >= 50 && beste.sicherheit >= ergebnis.sicherheit + 15 ? beste.grad : 0;
}
