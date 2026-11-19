import { verarbeiten, type FertigeSeite, type JpegMacher, type LeinwandMacher, type Zuschnitt } from "./verarbeitungKern";

export type { FertigeSeite, Zuschnitt } from "./verarbeitungKern";

/**
 * Aufruf der Bildverarbeitung von der Seite aus: im Web Worker, wenn der
 * Browser dort eine Leinwand hat, sonst auf der Seite selbst.
 */

let worker: Worker | null | undefined;
let naechste = 0;
const offen = new Map<number, { ok: (s: FertigeSeite[]) => void; fehler: (e: Error) => void }>();

function holeWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    if (typeof OffscreenCanvas === "undefined") throw new Error("keine Leinwand im Worker");
    worker = new Worker(new URL("./verarbeitung.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; seiten?: FertigeSeite[]; fehler?: string }>) => {
      const auftrag = offen.get(e.data.id);
      if (!auftrag) return;
      offen.delete(e.data.id);
      if (e.data.seiten) auftrag.ok(e.data.seiten);
      else auftrag.fehler(new Error(e.data.fehler ?? "Das Bild liess sich nicht verarbeiten."));
    };
  } catch {
    worker = null;
  }
  return worker;
}

const aufDerSeite: LeinwandMacher = (b, h) => {
  const c = document.createElement("canvas");
  c.width = b;
  c.height = h;
  return c;
};

const jpegAufDerSeite: JpegMacher = (l, q) =>
  new Promise((ok, fehler) =>
    (l as HTMLCanvasElement).toBlob((b) => (b ? ok(b) : fehler(new Error("JPEG fehlgeschlagen."))), "image/jpeg", q)
  );

/** Ein Kamerabild zu fertigen Seiten – im Hintergrund, wenn der Browser es kann. */
export function seitenAusAufnahme(roh: Blob, z: Zuschnitt): Promise<FertigeSeite[]> {
  const w = holeWorker();
  if (!w) return verarbeiten(roh, z, aufDerSeite, jpegAufDerSeite);
  const id = ++naechste;
  return new Promise((ok, fehler) => {
    offen.set(id, { ok, fehler });
    w.postMessage({ id, roh, zuschnitt: z });
  });
}
