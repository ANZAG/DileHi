# Modelle der Texterkennung

`frak2021.traineddata.gz` – Fraktur, trainiert von der UB Mannheim
(Stefan Weil) auf Daten aus GT4HistOCR, AustrianNewspapers und weiteren.
Fassung `tessdata_fast/frak2021_0.905`, mit gzip gepackt.

Herkunft: https://ub-backup.bib.uni-mannheim.de/~stweil/tesstrain/frak2021/tessdata_fast/

Die schnelle Fassung (Ganzzahlen) und nicht `tessdata_best`: Die Fassung mit
Gleitkommazahlen bricht in Tesseract.js ab („missing function DotProductSSE"),
und sie wäre ohnehin langsamer.

Das Modell für Antiqua (`deu`) kommt aus dem npm-Paket `@tesseract.js-data/deu`.
Beide werden vor `dev` und `build` nach `public/ocr/` gelegt
(`scripts/ocr-dateien.mjs`).

## Glätten: `uvdoc.onnx`

UVDoc (Verhoeven, Magne, Sorkine-Hornung, ETH Zürich, SIGGRAPH Asia 2023),
Lizenz MIT: https://github.com/tanguymagne/UVDoc

Die Fassung mit Gitter-Ausgabe (`grid_2d`, 1 × 2 × 45 × 31) stammt von
https://huggingface.co/fredcallagan/uvdoc-grid-onnx (Apache-2.0), Stand
`39c8284d324446cfbbba3fd0695c2b3358fefaca`. Dort liegen die Gewichte in einer
zweiten Datei (`UVDoc_grid.onnx.data`); hier sind beide mit dem Python-Paket
`onnx` zu einer Datei zusammengelegt, sonst unverändert:

    m = onnx.load("UVDoc_grid.onnx", load_external_data=True)
    onnx.save_model(m, "uvdoc.onnx", save_as_external_data=False)

SHA-256 von `uvdoc.onnx`: siehe `sha256sum ocr-modelle/uvdoc.onnx`, beginnt mit
`16cb598b88b186d4`.

Gerechnet wird mit onnxruntime-web (MIT); dessen Rechenkern
(`ort-wasm-simd-threaded.wasm` und `.mjs`) kommt aus `node_modules` und wird
mit nach `public/ocr/` gelegt.
