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

2. **Aufnehmen.** *Einzelseite* oder *Doppelseite* wählen (Einband,
   Titelblatt: Einzelseite). Mit *Rand automatisch* sucht die Seite das Buch
   in der Vorschau selbst, zweimal je Sekunde: die helle, farblose Fläche in
   der Bildmitte. Das klappt auf einer dunklen oder farbigen Unterlage
   (Karton, Holz, Tuch); auf einem weissen Tisch verschwimmt das Papier mit
   dem Tisch – dann steht „Kein Buch erkannt", und das Viereck wird von Hand
   gezogen. Wer das Viereck von Hand verschiebt, schaltet die Automatik ab.
   Das Viereck gilt für alle Seiten, solange Kamera und Buch stehen bleiben;
   den Bund setzt man bei einer Doppelseite einmal.

   **Am Handy** öffnet sich die Kamera im Vollbild, die Knöpfe liegen über
   dem Bild: Einzel-/Doppelseite, Rand, Drehen, weitere Einstellungen
   (Zahnrad), der grosse Auslöser, „Auto" und links die Zahl der Seiten mit
   der letzten Seite – ein Tipp darauf führt zur Seitenliste. Liegt das Handy
   flach über dem Buch, dreht iOS die Ansicht nicht mit, auch wenn man es
   quer hält. Für eine Doppelseite lohnt es trotzdem, das Handy quer zu
   halten (das Buch füllt dann mehr vom Bild) und einmal auf *Drehen* zu
   tippen.

   Jede Aufnahme bestätigen ein heller Blitz über der Vorschau, ein grosses
   „Aufgenommen", ein Ton und – wo das Gerät es kann (Android) – ein kurzes
   Vibrieren. Den Ton schluckt am iPhone der Stummschalter.
   Ausgelöst wird
   - mit dem Knopf oder der **Leertaste** (ein USB-Fusstaster schickt meist
     eine Taste),
   - oder **von selbst nach dem Umblättern**: Bewegung im Bild, dann einen
     Moment Ruhe, dann ein Foto mit kurzem Ton.

   Jede Aufnahme wird gerade gezogen, in Graustufen mit gestrecktem Kontrast
   gebracht und am Bund in zwei Seiten geteilt. *Farbig* behält die Farben,
   für Bildtafeln.

   *Gewölbte Seiten glätten* (bei der Kamera eingeschaltet): Ein neuronales
   Netz (UVDoc, ETH Zürich, MIT-Lizenz) erkennt die Wölbung zum Bund hin und
   rechnet die Seite flach. Gerade ziehen, am Bund teilen und glätten
   geschehen in einem Zug, das Bild wird nur einmal neu berechnet. Beim
   ersten Mal lädt der Browser das Modell (32 MB) und legt es ab; danach
   kostet es gut eine Sekunde je Seite am Rechner, am Handy mehr. Geht es
   nicht (zu wenig Speicher, sehr alter Browser), werden die Seiten
   ungeglättet aufgenommen und ein Hinweis erscheint.

   Gemessen an zwei Probefotos (Sicherheit der Texterkennung, ohne → mit):
   Fraktur, gewölbte Seite 57 → 75 %, flache Seite 77 → 79 %; Antiqua,
   gewölbte Seite 84 → 88 %, flache Seite 90 → 88 % bei 21 erkannten Wörtern
   mehr. Ein Glätten entlang der erkannten Textzeilen machte es in allen
   Fällen schlechter und wurde verworfen.

   *Finger am Rand entfernen* (eingeschaltet): Hautfarbene Flächen, die vom
   Bildrand in einen Streifen am Seitenrand hereinragen, werden mit der
   Papierfarbe gefüllt. Haut hat deutlich mehr Rot als Papier, auch
   vergilbtes (gemessen: Papier Cr 127–133, Daumen 146–149, Grenze 140).
   Rötliche Abbildungen mitten auf der Seite bleiben unberührt; reicht eine
   farbige Tafel bis an den Rand, für diese Aufnahme ausschalten
   (Neu zuschneiden).

3. **Bilder übernehmen** nimmt fertige Seiten in dieselbe Reihe auf: Fotos
   aus der Kamera-App des Handys (volle Auflösung) oder die Seiten aus der
   Software eines Buchscanners (etwa CZUR). Sortiert nach Dateinamen; geteilt
   wird nur, wenn *Doppelseite* eingeschaltet ist.

   Bei *Bilder übernehmen* gilt die Einstellung *Glätten* (Fotos aus der
   Kamera-App sind ja gewölbt); beim Beobachten eines Ordners wird nicht
   geglättet – die Software eines Buchscanners hat das schon getan.

   **Ordner beobachten** (Chrome und Edge am Rechner) macht das von selbst:
   Einmal den Ordner wählen, in den die Scanner-Software ihre Seiten legt –
   jede neue Seite kommt dann ohne Zutun in die Reihe. Übernommen wird eine
   Datei erst, wenn sie bei zwei Blicken im Abstand von zwei Sekunden gleich
   gross ist; eine halb geschriebene Seite kommt also nicht mit. Was beim
   Start schon im Ordner liegt, bleibt liegen (ausser man hakt es an). Den
   Ordner merkt sich der Browser; nach dem Neuladen genügt ein Klick auf
   „… wieder beobachten". Die Software muss JPG oder PNG schreiben – TIFF
   kann der Browser nicht lesen. Liefert sie schon einzelne Seiten,
   *Doppelseite* ausschalten.

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

Fürs Glätten kommen `uvdoc.onnx` (aus `ocr-modelle/`) und der Rechenkern von
onnxruntime-web dazu; Herkunft und Lizenzen in `ocr-modelle/README.md`.

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
(Geometrie, Rand finden, Glätten, Finger, Ordner, Auslöser, Texterkennung, PDF,
Zwischenspeicher, Abschluss),
Tests in `src/test/scanGeometrie.test.ts`, `src/test/scanPdf.test.ts`,
`src/test/quelltext.test.ts`, `src/test/scanOrdner.test.ts`,
`src/test/scanFinger.test.ts`, `src/test/scanRand.test.ts`.

## Später

- Ausschnitte aus einer Seite an eine Belegkarte der Wissensbibliothek
  (`bilder/<quellen-id>/sNNN_aN.jpg`).
- Vorhandene PDFs nachträglich durchsuchbar machen: Text aus PDFs lesen, die
  schon eine Textebene haben, und Scans ohne Text im Browser erkennen lassen.
