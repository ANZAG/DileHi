# Bücher scannen

Quellensammlung → **Scannen**. Ein Buch mit der Webcam am Rechner oder mit
dem Handy aufnehmen, den Text erkennen lassen und als durchsuchbares PDF in
die Quellensammlung legen. Läuft im Browser, ohne Installation, auf Windows
wie auf dem iPhone. Voraussetzung ist die Dateiablage in SharePoint
([sharepoint.md](sharepoint.md)).

## Ablauf

1. **Wohin gehört das Buch?** Die Weiche vor dem Scannen:
   - *Neue Quelle* – Titel, Epoche, Ordner. Die Quelle wird beim Hochladen
     angelegt.
   - *Vorhandene Quelle* – eine Quelle, die schon eingetragen ist, aber noch
     keine Datei hat. Anhängen darf, wer sie angelegt hat oder die
     Dateiablage verwaltet.
   - *Weiß ich noch nicht* – in den Posteingang. Der Eingangskorb ordnet die
     Datei später einer Quelle zu.

   Alle drei Wege enden in der Quellensammlung. Ausschnitte für die
   Wissensbibliothek entstehen erst danach, an einer Karte.

2. **Aufnehmen.** Einmal das Viereck um die Doppelseite ziehen und den Bund
   setzen; das gilt für alle Seiten, solange Kamera und Buch stehen bleiben.
   Ausgelöst wird
   - mit dem Knopf oder der **Leertaste** (ein USB-Fusstaster schickt meist
     eine Taste),
   - oder **von selbst nach dem Umblättern**: Bewegung im Bild, dann einen
     Moment Ruhe, dann ein Foto mit kurzem Ton.

   Jede Aufnahme wird gerade gezogen, in Graustufen mit gestrecktem Kontrast
   gebracht und am Bund in zwei Seiten geteilt. *Farbig* behält die Farben,
   für Bildtafeln.

3. **Bilder übernehmen** nimmt fertige Seiten in dieselbe Reihe auf: Fotos
   aus der Kamera-App des Handys (volle Auflösung) oder die Seiten aus der
   Software eines Buchscanners (etwa CZUR). Sortiert nach Dateinamen; geteilt
   wird nur, wenn *Doppelseite* eingeschaltet ist.

4. **Prüfen.** Unter der Kamera stehen die Seiten in ihrer Reihenfolge, mit
   der Sicherheit der Texterkennung. Aufnahmen lassen sich verschieben, neu
   zuschneiden und löschen, einzelne Seiten (eine leere Rückseite) entfernen.

5. **PDF bauen und hochladen.** Das PDF zeigt die Seitenbilder, darüber
   unsichtbar der erkannte Text – suchen und markieren geht wie bei einem
   Scan aus dem Kopierer. Danach steht der Text auch in der Datenbank und
   ist in der Quellensammlung durchsuchbar.

## Texterkennung

Tesseract im Browser, zwei Modelle:

| Schrift | Modell | Herkunft |
| --- | --- | --- |
| Antiqua | `deu` | npm-Paket `@tesseract.js-data/deu` |
| Fraktur | `frak2021` | UB Mannheim, liegt in `ocr-modelle/` |

*Schrift: Automatisch* lässt beide Modelle die erste Seite lesen und nimmt
das sicherere für das ganze Buch. Wer umstellt, lässt alle Seiten neu lesen.

Gelesen wird im Hintergrund, während weiter gescannt wird – am Rechner gut
zwei Sekunden je Seite, am Handy länger. Seiten schmaler als 2400 Punkte
werden für die Erkennung vergrössert; Tesseract liest am besten, wenn ein
kleiner Buchstabe gut 20 Punkte hoch ist.

Alle Dateien der Erkennung kommen vom eigenen Webspace (`/ocr/`, gefüllt
von `scripts/ocr-dateien.mjs` vor `dev` und `build`). Tesseract.js lädt sie
sonst von jsDelivr – jeder Scan meldete dann einem Dritten die Adresse des
Mitglieds.

Der Text wird gespeichert, wie er erkannt wurde, **mit langem ſ** – für
Zitate. Gesucht wird mit rundem s: „Gehorsam" findet „Gehorſam". Die
unsichtbare Schrift im PDF kann kein ſ; dort steht s.

Erkannter Text ist ein Entwurf. Für den geprüften Wortlaut auf einer
Belegkarte bleibt der Blick auf das Seitenbild Pflicht.

## Volltextsuche

Die Suche der Quellensammlung zeigt unter den Titeln **„Im Text der
Quellen"**: je Quelle die Fundseiten mit Ausschnitt, über alle Epochen.
Ein Klick öffnet die Vorschau; die Seite steht im Titel (die Vorschau von
SharePoint springt nicht von selbst dorthin).

Datenbank: Tabelle `source_pages` (Text je Seite), `source_text_save()`
zum Ablegen, `source_text_search()` zum Suchen
(Migration `20261119100000_quelltext.sql`). Der Text hängt an der **Datei**
(Kennung in SharePoint), nicht an der Quelle: Ein Scan im Posteingang hat
noch keine Quelle, sein Text liegt trotzdem bereit und gehört ab dem
Zuordnen im Eingangskorb zur Quelle. Wird die Quelle gelöscht, geht ihr
Text mit.

## Zwischenspeicher

Jede Aufnahme liegt sofort im Browser (IndexedDB), bis das PDF hochgeladen
ist. Ein Absturz, ein gesperrtes Handy oder ein geschlossener Reiter kosten
also nichts; beim nächsten Öffnen von *Scannen* geht es weiter. Scheitert
das Hochladen auf halbem Weg, merkt sich die Seite, was schon geschafft ist,
und lädt beim zweiten Versuch nicht noch einmal hoch.

Ein Buch mit 200 Doppelseiten aus einer 4K-Kamera braucht im Browser grob
300–500 MB. Das schaffen Rechner und aktuelle Handys; bei sehr dicken
Büchern lieber in Bänden scannen.

## Aufbau für gute Ergebnisse

- **Kamera senkrecht über dem Buch**, nicht schräg vom Monitor: Das Buch
  soll das Bild füllen. In 4K sind das bei einer Doppelseite gut 200 dpi.
- **Dunkle Unterlage**, gleichmässiges Licht ohne Spiegelung. Ein weisser
  Tisch mit Licht von hinten überstrahlt die Seiten.
- **Schärfe festhalten** (wenn die Kamera es anbietet), sonst springt der
  Autofokus beim Umblättern. Geht es im Browser nicht, bei Logitech in
  Logi Tune feststellen.
- Unter der Vorschau steht, welche Auflösung die Kamera wirklich liefert.

## Code

`src/pages/intern/Scannen.tsx`, `src/components/scan/`, `src/lib/scan/`
(Geometrie, Auslöser, Texterkennung, PDF, Zwischenspeicher, Abschluss),
Tests in `src/test/scanGeometrie.test.ts`, `src/test/scanPdf.test.ts`,
`src/test/quelltext.test.ts`.

## Später

- Ausschnitte aus einer Seite an eine Belegkarte der Wissensbibliothek
  (`bilder/<quellen-id>/sNNN_aN.jpg`).
- Vorhandene PDFs nachträglich durchsuchbar machen: Text aus PDFs lesen, die
  schon eine Textebene haben, und Scans ohne Text im Browser erkennen lassen.
- Gewölbte Seiten am Bund flach rechnen (bis dahin: Glasplatte, oder einen
  Buchscanner und *Bilder übernehmen*).
