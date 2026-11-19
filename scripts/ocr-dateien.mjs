/**
 * Legt die Dateien der Texterkennung nach public/ocr/ – vor `dev` und `build`.
 *
 * Tesseract.js holt sich Programm und Sprachdaten sonst von einem fremden
 * Server (jsDelivr). Das hiesse: Jeder Scan meldet einem Dritten die Adresse
 * des Mitglieds. Deshalb kommt alles vom eigenen Webspace:
 *
 *   worker.min.js                     aus tesseract.js
 *   tesseract-core-*-lstm.wasm.js     aus tesseract.js-core (drei Fassungen;
 *                                     der Browser nimmt die schnellste, die er kann)
 *   deu.traineddata.gz                Antiqua, aus @tesseract.js-data/deu
 *   frak2021.traineddata.gz           Fraktur, UB Mannheim, liegt in ocr-modelle/
 *
 * public/ocr/ steht in .gitignore: Die Dateien kommen aus node_modules und
 * würden sonst bei jeder neuen Fassung von tesseract.js doppelt im Verlauf liegen.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
const ziel = join(wurzel, "public", "ocr");
mkdirSync(ziel, { recursive: true });

const dateien = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["node_modules/@tesseract.js-data/deu/4.0.0_best_int/deu.traineddata.gz", "deu.traineddata.gz"],
  ["ocr-modelle/frak2021.traineddata.gz", "frak2021.traineddata.gz"],
];

for (const [von, nach] of dateien) {
  const quelle = join(wurzel, von);
  if (!existsSync(quelle)) {
    console.error(`Texterkennung: ${von} fehlt. Erst „npm install".`);
    process.exit(1);
  }
  copyFileSync(quelle, join(ziel, nach));
}
console.log(`Texterkennung: ${dateien.length} Dateien in public/ocr/`);
