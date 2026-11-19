/// <reference lib="webworker" />
import { verarbeiten, type Zuschnitt } from "./verarbeitungKern";

/** Die Bildverarbeitung des Scanners, abseits der Seite (siehe verarbeitungKern.ts). */
self.onmessage = async (e: MessageEvent<{ id: number; roh: Blob; zuschnitt: Zuschnitt }>) => {
  const { id, roh, zuschnitt } = e.data;
  try {
    const ergebnis = await verarbeiten(
      roh,
      zuschnitt,
      (b, h) => new OffscreenCanvas(b, h),
      (l, q) => (l as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality: q })
    );
    self.postMessage({ id, ergebnis });
  } catch (err) {
    self.postMessage({ id, fehler: err instanceof Error ? err.message : String(err) });
  }
};
