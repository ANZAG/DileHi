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
