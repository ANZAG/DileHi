import { aufbereiten } from "./aufbereitung";
import { createWorker, OEM, PSM, type Worker } from "tesseract.js";
import type { Wort } from "./pdf";
import { seitentextAufraeumen } from "./text";

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

export type Schrift = "antiqua" | "fraktur";
export type SchriftWahl = Schrift | "auto";

export const SCHRIFT_NAME: Record<Schrift, string> = { antiqua: "Antiqua", fraktur: "Fraktur" };
const MODELL: Record<Schrift, string> = { antiqua: "deu", fraktur: "frak2021" };

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
async function vorbereiten(bild: Blob, breite: number, aufhellen: boolean): Promise<{ bild: Blob; faktor: number }> {
  if (breite >= MINDESTBREITE && !aufhellen) return { bild, faktor: 1 };
  const faktor = breite >= MINDESTBREITE ? 1 : Math.min(2, MINDESTBREITE / breite);
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

/** Eine Seite lesen. `breite` ist die Breite des Bildes in Punkten. */
export async function erkennen(bild: Blob, breite: number, schrift: Schrift, o: LeseOptionen = {}): Promise<OcrErgebnis> {
  const worker = await arbeiterFuer(schrift);
  const { bild: eingabe, faktor } = await vorbereiten(bild, breite, o.aufhellen === true);
  const { data } = await worker.recognize(eingabe, {}, { text: true, blocks: true });
  const woerter: Wort[] = [];
  for (const block of data.blocks ?? []) {
    for (const absatz of block.paragraphs) {
      for (const zeile of absatz.lines) {
        for (const w of zeile.words) {
          if (!w.text.trim()) continue;
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
  return { text: seitentextAufraeumen(data.text ?? ""), woerter, sicherheit: data.confidence ?? 0, schrift };
}

/**
 * Antiqua oder Fraktur? Beide Modelle lesen die Seite; das sicherere gewinnt.
 * Für die erste Seite eines Buches – danach bleibt es bei der Wahl.
 */
export async function schriftErkennen(bild: Blob, breite: number, o: LeseOptionen = {}): Promise<OcrErgebnis> {
  const [a, f] = await Promise.all([erkennen(bild, breite, "antiqua", o), erkennen(bild, breite, "fraktur", o)]);
  return f.sicherheit > a.sicherheit + 5 ? f : a;
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
