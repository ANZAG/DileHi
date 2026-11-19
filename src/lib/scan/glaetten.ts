import type { Gitter, Pixel } from "./geometrie";

/**
 * Gewölbte Seiten glätten, mit UVDoc (Verhoeven, Magne, Sorkine-Hornung,
 * ETH Zürich, SIGGRAPH Asia 2023; MIT). Ein neuronales Netz schaut sich die
 * Seite in 496 × 720 Punkten an und sagt für ein Gitter von 31 × 45 Punkten,
 * wo jeder Punkt der flachen Seite in der gewölbten liegt. Mit diesem Gitter
 * wird dann die Seite in voller Auflösung abgetastet (geometrie.ts,
 * seiteAbtasten) – das Netz selbst sieht nie die volle Auflösung.
 *
 * An zwei Probefotos hob das die Sicherheit der Texterkennung auf gewölbten
 * Seiten um 5–8 Punkte; ein Glätten entlang der Textzeilen machte es
 * schlechter (docs/scannen.md).
 *
 * Gerechnet wird mit onnxruntime-web (WebAssembly) im Worker der
 * Bildverarbeitung. Modell (32 MB) und Rechenkern liegen auf dem eigenen
 * Webspace unter /ocr/; das Modell wird beim ersten Mal geladen und im
 * Browser abgelegt (Cache Storage), danach kommt es von dort.
 */

export const MODELL_BREITE = 496;
export const MODELL_HOEHE = 720;
const ABLAGE = "scan-modelle-v1";

type Ort = typeof import("onnxruntime-web/wasm");
type Sitzung = Awaited<ReturnType<Ort["InferenceSession"]["create"]>>;

let geladen: Promise<{ ort: Ort; sitzung: Sitzung }> | null = null;

async function modellHolen(adresse: string): Promise<ArrayBuffer> {
  try {
    const ablage = await caches.open(ABLAGE);
    const da = await ablage.match(adresse);
    if (da) return await da.arrayBuffer();
    const antwort = await fetch(adresse);
    if (!antwort.ok) throw new Error(`Modell zum Glätten nicht geladen (${antwort.status}).`);
    await ablage.put(adresse, antwort.clone());
    return await antwort.arrayBuffer();
  } catch (err) {
    // Ohne Cache Storage (privates Fenster): direkt laden.
    if (err instanceof Error && err.message.startsWith("Modell")) throw err;
    const antwort = await fetch(adresse);
    if (!antwort.ok) throw new Error(`Modell zum Glätten nicht geladen (${antwort.status}).`);
    return await antwort.arrayBuffer();
  }
}

function laden() {
  geladen ??= (async () => {
    const ort = await import("onnxruntime-web/wasm");
    const basis = `${self.location.origin}/ocr`;
    // Ein Rechenkern: Mehrere bräuchten Kopfzeilen (cross-origin isolation),
    // die der Webspace nicht schickt.
    ort.env.wasm.numThreads = 1;
    // Rechenkern und sein Ladeprogramm (.wasm, .mjs) vom eigenen Webspace.
    ort.env.wasm.wasmPaths = `${basis}/`;
    const modell = await modellHolen(`${basis}/uvdoc.onnx`);
    const sitzung = await ort.InferenceSession.create(modell, { executionProviders: ["wasm"] });
    return { ort, sitzung };
  })();
  geladen.catch(() => (geladen = null));
  return geladen;
}

/**
 * Das Gitter für eine Seite. `eingabe` ist die Seite in 496 × 720 Punkten,
 * farbig (RGBA).
 */
export async function gitterBerechnen(eingabe: Pixel): Promise<Gitter> {
  if (eingabe.breite !== MODELL_BREITE || eingabe.hoehe !== MODELL_HOEHE) {
    throw new Error("Das Bild für das Glätten hat die falsche Grösse.");
  }
  const { ort, sitzung } = await laden();
  const n = MODELL_BREITE * MODELL_HOEHE;
  const daten = new Float32Array(3 * n);
  const d = eingabe.daten;
  for (let i = 0; i < n; i++) {
    daten[i] = d[i * 4] / 255;
    daten[n + i] = d[i * 4 + 1] / 255;
    daten[2 * n + i] = d[i * 4 + 2] / 255;
  }
  const name = sitzung.inputNames[0];
  const ergebnis = await sitzung.run({ [name]: new ort.Tensor("float32", daten, [1, 3, MODELL_HOEHE, MODELL_BREITE]) });
  const aus = ergebnis[sitzung.outputNames[0]];
  const [, kanaele, zeilen, spalten] = aus.dims;
  if (kanaele !== 2) throw new Error("Das Modell zum Glätten hat ein unerwartetes Ergebnis geliefert.");
  return { spalten, zeilen, daten: aus.data as Float32Array };
}
