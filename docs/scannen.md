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
   der Bildmitte (gemessen als kleinster Farbanteil abzüglich der Farbigkeit –
   angestrahlter Karton ist hell, aber nie farblos). Was an das Papier
   anschliesst und keine Farbe der Unterlage hat (gelernt am Bildrand, wo
   kein Buch liegt), gehört auch dazu – Abbildungen und farbige Einbände.
   Die Ecken sind die Schnittpunkte der vier Kanten, jede robust als Gerade
   durch den Rand der Fläche gelegt; so springt der Rahmen nicht nach innen,
   wenn ein Stück der Fläche fehlt. Reicht die Fläche an zwei Bildränder,
   gilt das als unsicher. Bei einer Doppelseite
   gehört die Fläche jenseits des Bundes dazu; liegt die zweite Seite im
   Schatten, wird gleich gross daneben mit milderer Schwelle nachgesehen.
   Das klappt auf einer dunklen oder farbigen Unterlage
   (Karton, Holz, Tuch); auf einem weissen Tisch verschwimmt das Papier mit
   dem Tisch – dann steht „Kein Buch erkannt", und das Viereck wird von Hand
   gezogen. Wer das Viereck von Hand verschiebt, schaltet die Automatik ab.
   Das Viereck gilt für alle Seiten, solange Kamera und Buch stehen bleiben;
   den Bund setzt man bei einer Doppelseite einmal.

   **Am Handy** wie die Kamera des iPhones: Das Kamerabild füllt den ganzen
   Bildschirm und wird nicht gedreht. Oben liegen kleine Symbole (schliessen,
   Rand automatisch, Selbst auslösen, Drehung aus der Lage, Einstellungen),
   unten „EINZELSEITE · DOPPELSEITE" über dem Auslöser, links die letzte
   Seite mit der Zahl der Seiten – ein Tipp darauf führt zur Seitenliste –,
   rechts „um 90° drehen". Hält man das Handy quer und dreht sich der
   Bildschirm mit (Drehsperre aus), wandert die Bedienung wie beim iPhone an
   die Seiten: links die Symbole, rechts Auslöser, Einzel-/Doppelseite und
   letzte Seite. Das Kamerabild steht dann ganz dazwischen, damit oben und
   unten nichts vom Buch (und von den Ecken des Rahmens) abgeschnitten ist.

   Wie man das Handy hält, sagt der Lagesensor: Hochkant oder quer, das Foto
   wird richtig herum gespeichert, und die Symbole drehen sich an ihrem
   Platz. Liegt das Handy flach über dem Buch, sieht der Sensor kaum etwas;
   dann hilft das Bild: Eine Doppelseite ist breiter als hoch, eine
   Einzelseite (und ein Einband) höher als breit. Liegt das gefundene Buch im
   Kamerabild anders, wird um 90° gedreht – in die Richtung, in die das Handy
   leicht geneigt ist; steht die Seite danach auf dem Kopf, dreht die
   Texterkennung sie zurück. Wer von Hand um 90° nachdreht (Buch im
   Querformat), schaltet diese Hilfe ab, bis er zurückdreht. Das iPhone fragt beim
   ersten Mal um Erlaubnis („Antippen: Drehung des Handys erkennen"). Was von
   Hand dazugedreht wurde oder von der Texterkennung (kopfstehende Seiten),
   bleibt erhalten, auch wenn man das Handy danach anders hält. Ausschalten
   lässt sich die Automatik in den Einstellungen.

   Hat der Browser vorher hineingezoomt (iOS tut das, wenn man in ein kleines
   Eingabefeld tippt, und zoomt nicht wieder heraus), liegt die Kamera trotzdem
   genau auf dem sichtbaren Bildschirm; auf der Seite „Scannen" haben die
   Felder am Handy deshalb auch mindestens 16 px Schrift.

   *Selbst auslösen* nimmt nach dem Umblättern von selbst auf, sobald das
   Bild einen Moment still steht; solange es an ist, steht oben ein Hinweis.

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
   Bildrand in einen Streifen am Seitenrand hereinragen, werden übermalt.
   Haut hat deutlich mehr Rot als Papier, auch vergilbtes (gemessen: Papier
   Cr 127–133, Daumen 146–149, Grenze 140). Gefüllt wird mit dem, was das
   Papier rings um den Finger zeigt, samt Licht und Schatten (Push-Pull aus
   den hellen Papierfeldern – Schrift oder eine Buchkante daneben gäben
   sonst einen grauen Fleck); Nagel und Schatten sind ganz bedeckt, danach
   läuft die Füllung weich aus. Die erste Fassung setzte eine flache Farbe in
   groben Kästchen ein, das sah man. Rötliche Abbildungen mitten auf der
   Seite bleiben unberührt; reicht eine farbige Tafel bis an den Rand, für
   diese Aufnahme ausschalten (Neu zuschneiden).

   **Bund automatisch:** Bei einer Doppelseite sucht die Seite den Bund im
   Bild – den steilsten Helligkeitssprung nahe der gesetzten Stelle (± 12 %):
   Die eine Seite wölbt sich zum Licht und glänzt, die andere liegt im
   Schatten. Jede Seite bekommt dazu 2 % Überlappung. Ein fest gesetzter
   Bund schnitt im ersten Buch auf einigen Seiten die ersten Buchstaben
   jeder Zeile ab („janische Garde" statt „Spanische Garde").

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
   der Sicherheit der Texterkennung.

   **Kopfstehende Seiten** richtet die Seite selbst: Liest die Erkennung eine
   Seite mit Text schlecht (unter 45 %), liest sie sie auch auf dem Kopf und
   notfalls quer. Ist eine Richtung deutlich besser (mindestens 15 Punkte und
   50 %), wird die Aufnahme gedreht neu verarbeitet – und steht die Kamera
   noch so, auch der Zuschnitt für die nächsten Seiten; eine kurze Meldung
   sagt es. Je Aufnahme geschieht das nur einmal. Bildtafeln lesen sich in
   jeder Richtung schlecht und bleiben, wie sie sind. Von Hand: *Alle Seiten
   um 180° drehen* über der Seitenliste, der Drehknopf oben links an jeder
   Seite (um 90°, etwa für eine quer gedruckte Tafel; der Text wird neu
   gelesen), oder *Neu zuschneiden* je Aufnahme. Aufnahmen lassen sich verschieben, neu
   zuschneiden und löschen, einzelne Seiten (eine leere Rückseite) entfernen.

   **Seiten neu aufnehmen.** Ist eine Seite unscharf, schief oder schlecht
   gelesen: *Neu* unten rechts an der Seite antippen. Die Kamera öffnet sich
   mit dem Hinweis „Nächste Aufnahme ersetzt S. …", und die nächste Aufnahme
   kommt genau an diese Stelle – ebenso das nächste übernommene Bild.
   Gehörte die Seite zu einer Doppelseite, nimmt die Kamera sie einzeln auf
   (danach gilt wieder die alte Einstellung), und die andere Seite bleibt
   stehen. Beide Seiten einer Doppelseite zusammen ersetzt der Kameraknopf
   unten an der Aufnahme. Am Handy geht es danach gleich zurück zur Liste,
   die neue Seite ist kurz grün umrandet. *Abbrechen* im Hinweis nimmt den
   Auftrag zurück.

   **Qualitätsprüfung.** Jede Seite bekommt einen Befund: *gut*, *leer*
   (bleibt drin, damit die Zählung zum Buch stimmt) oder *prüfen* – mit
   Grund: *unscharf*, *wenig Text erkannt*, *Text unsicher (… %)*. Zu
   prüfende Seiten sind orange umrandet, ein Tipp auf den Hinweis nimmt sie
   neu auf. Über dem PDF-Knopf steht die Bilanz („112 Seiten gut, 4 prüfen")
   mit Sprung zu jeder dieser Seiten. Ist eine Aufnahme unscharf, bietet die
   Kamera gleich *Neu aufnehmen* an. Karten, Abbildungen und Einbände gelten
   nicht als Textseiten: Bei ihnen zählen Schärfe und Sicherheit nicht.

5. **PDF bauen und hochladen.** Das PDF zeigt die Seitenbilder, darüber
   unsichtbar der erkannte Text – suchen und markieren geht wie bei einem
   Scan aus dem Kopierer. Danach steht der Text auch in der Datenbank und
   ist in der Quellensammlung durchsuchbar.

   Unter *Angaben fürs PDF* (freiwillig): Autor, Jahr und die
   Seitenzählung – „PDF-Seite 3 ist Seite 1 im Buch"; die Seiten davor
   zählen römisch. Der PDF-Leser zeigt dann die Seitenzahlen des Buches.

   Nach dem Hochladen gibt es den Text auch als **Markdown** zum
   Herunterladen (für die Auswertung, auch mit KI-Werkzeugen): ein Kopf mit
   Titel und Angaben, je Seite ein Trenner `--- Seite 28 (PDF-Seite 30) ---`,
   Trennungen zusammengeführt, Absätze am Stück, unsichere Seiten mit
   `[OCR unsicher]`. Bei Quellen der Sammlung liegt die Markdown-Datei auch
   in SharePoint neben dem PDF (nicht im Posteingang – dort erschiene sie als
   weitere Datei ohne Quelle).

## Bildaufbereitung

**Übernommene Fotos** (Kamera-App, „Bilder übernehmen") werden wie die
Kamera auf das Buch zugeschnitten: Tisch und Nachbarseite fallen weg.
Findet sich nichts Sicheres – etwa weil das Bild schon zugeschnitten ist –,
bleibt es ganz. Seiten aus der Software eines Buchscanners („Ordner
beobachten") werden nicht zugeschnitten. Für die beste Auflösung (12 MP
statt Videobild) am iPhone *Foto mit der Kamera-App* nehmen.


Jede Seite wird nach dem Zuschnitt aufbereitet (`lib/scan/aufbereitung.ts`),
im Hintergrund, gut eine Drittelsekunde je Seite:

- **Beleuchtung:** Fotos sind am Bund und an den Rändern dunkler als in der
  Mitte. Je Feld (1/90 der Seite) gilt das hellste Zehntel als Papier;
  Abbildungen und Farbe zählen nicht und werden aus dem Papier ringsum
  ergänzt. Das Bild wird durch diese Papierhelligkeit geteilt: Papier
  überall weiss, Schrift überall gleich dunkel. Schwarz wird das dunkelste
  Prozent der Seite – blasse Seiten werden so kräftiger.
- **Lage:** Die Tinte steht in Zeilen; quer zu ihnen hat ihr Profil scharfe
  Spitzen. Laufen die Zeilen senkrecht, wird die Seite um 90° gedreht (ob
  sie dann auf dem Kopf steht, prüft die Texterkennung und dreht zurück).
  Eine Schräglage bis 5° wird gerade gedreht.
- **Bildseiten** (Karten, Tafeln, Einbände, viel Farbe) bleiben farbig und
  werden nur sanft aufgehellt, mit Weissabgleich am Papier. Zum Lesen
  bekommt die Texterkennung eine graue, ausgeglichene Fassung.
- **Dunkle Seiten** (Einband, helle Schrift auf dunklem Grund) werden nicht
  aufgehellt; Tesseract dreht helle Schrift beim Lesen selbst um.
- **Schärfe:** Varianz des Laplace-Filters geteilt durch die Varianz der
  Helligkeit (unabhängig vom Kontrast), im Inneren der Seite. Scharfe
  Textseiten aus dem Handy liegen bei 3800–4700, verwackelte bei
  1600–2300; die Grenze ist 3000.

Gemessen am Buch „Stein: Uniformen der Armeen von Waterloo" (12 Seiten
als Regressionstest, darunter die schwierigen S. 14, 27, 30, 38, 46, 116):
erkannte Wörter 1922 → 3080. S. 46 („Husaren") hat jetzt den ganzen ersten
Absatz mit allen Zahlen, S. 14 liest „der Franzosen einige / Stunden lang".
Sauvola-Binarisierung in Tesseract brachte danach nichts mehr.

## Das PDF

- **Textebene zeilenweise**, in der Reihenfolge, in der Tesseract liest
  (Blöcke, Absätze, Zeilen): je Zeile ein Stück Text mit echten
  Leerzeichen auf der Grundlinie, so breit gezogen wie die Zeile im Bild.
  `pdftotext` und Kopieren liefern ganze Zeilen in richtiger Reihenfolge.
  Trennungen bleiben, wie gedruckt.
- **Schrift Noto Sans**, eingebettet als Teilmenge (`ocr-modelle/`, OFL):
  Auch Zeichen ausserhalb von Windows-1252 lassen sich suchen und kopieren.
- **Eine Seitengrösse** für alle Seiten (Median der Seitenverhältnisse),
  jedes Bild mittig darauf; querformatige Seiten bleiben quer, in gleicher
  Höhe.
- **Grösse:** JPEG-Qualität 0,75; die ausgeglichenen Seiten mit weissem
  Papier sind etwa halb so gross wie vorher. Seiten über 2400 Punkte (Fotos
  aus der Kamera-App) werden fürs PDF auf 2400 verkleinert – gut 300 ppi bei
  A5. Ziel: unter 250 KB je Seite.
- **Angaben:** Titel, Autor, Thema, Stichwörter, Sprache `de-DE`, Erzeuger
  „DileHi Quellensammlung", Seitenbeschriftungen nach der Zählung des Buches.

## Texterkennung

Tesseract im Browser, zwei Modelle:

| Schrift | Modell | Herkunft |
| --- | --- | --- |
| Antiqua | `deu` | npm-Paket `@tesseract.js-data/deu` |
| Fraktur | `frak2021` | UB Mannheim, liegt in `ocr-modelle/` |

Fürs Glätten kommen `uvdoc.onnx` (aus `ocr-modelle/`) und der Rechenkern von
onnxruntime-web dazu; Herkunft und Lizenzen in `ocr-modelle/README.md`.

Dazu **Latein, Französisch und Englisch** (`lat`, `fra`, `eng` aus
`@tesseract.js-data/…`) und die Mischung **Latein + Französisch** – für
Quelleneditionen wie Canivez (*Statuta capitulorum generalium ordinis
Cisterciensis*: lateinische Statuten, französische Einleitung und
Anmerkungen). Das richtige Wörterbuch zählt vor allem bei Akzenten und
abgenutztem Druck: Eine französische Probeseite las das deutsche Modell zu
81 % richtig, das französische zu 100 %.

*Schrift und Sprache: Automatisch* lässt Antiqua und Fraktur die erste Seite
lesen; das sicherere gilt (Fraktur nur mit fünf Punkten Vorsprung). Bei
Antiqua verrät der gelesene Text die Sprache – an den häufigen kleinen
Wörtern (der/und, et/ad/qui, le/les/des, the/of/and); ist es nicht Deutsch,
liest das passende Modell die Seite noch einmal. Liegen Latein und
Französisch beide bei mindestens einem Viertel, gilt die Mischung. Die Wahl
gilt dann für das ganze Buch; wer umstellt, lässt alle Seiten neu lesen.
Dasselbe gilt in „Quellen nachbearbeiten“.

Handschriften liest Tesseract nicht (dafür bräuchte es ein eigenes
Handschriftenmodell, etwa Kraken mit CATMuS Medieval); die Nachbearbeitung
erkennt sie an der geringen Sicherheit und lässt sie aus.

Gelesen wird im Hintergrund, während weiter gescannt wird – am Rechner gut
zwei Sekunden je Seite, am Handy länger. Seiten schmaler als 2400 Punkte
werden für die Erkennung vergrössert; Tesseract liest am besten, wenn ein
kleiner Buchstabe gut 20 Punkte hoch ist.

Alle Dateien der Erkennung kommen vom eigenen Webspace (`/ocr/`, gefüllt
von `scripts/ocr-dateien.mjs` vor `dev` und `build`). Tesseract.js lädt sie
sonst von jsDelivr – jeder Scan meldete dann einem Dritten die Adresse des
Mitglieds.

Der Text wird gespeichert, wie er erkannt wurde, **mit langem ſ** – für
Zitate; in der Datenbank mit zusammengeführten Trennungen, damit „wurde"
auch das gedruckte „wur-⏎de" findet. Gesucht wird mit rundem s: „Gehorsam"
findet „Gehorſam". In der Textebene des PDF steht ebenfalls rundes s, damit
die Suche im PDF-Leser dasselbe findet.

Der gelesene Text merkt sich, zu welchem Bild er gehört: Wird eine Seite
gedreht oder ersetzt, während sie gelesen wird, wird das alte Ergebnis
verworfen und neu gelesen.

Erkannter Text ist ein Entwurf. Für den geprüften Wortlaut auf einer
Belegkarte bleibt der Blick auf das Seitenbild Pflicht.

## Vorhandene Quellen nachbearbeiten

Was beim Scannen greift, gilt auch für die Quellen, die schon in der
Sammlung liegen: GitHub-Action **„Quellen nachbearbeiten“**
(`.github/workflows/quellen.yml`, Skript `scripts/quellen-nachbearbeiten.ts`,
Edge Function `quellen-werkstatt`). Starten unter Actions → Quellen
nachbearbeiten → Run workflow.

- **pruefen:** nur nachsehen und berichten – je PDF, wie viele Seiten
  schon Text haben und wie viele Scans sind. Schreibt nichts.
- **text (Stufe 1):** jede Quelle durchsuchbar machen, ohne die Datei
  anzufassen. Seiten, die am Rechner entstanden sind, behalten ihren Text.
  Scan-Seiten (ein grosses Bild füllt die Seite) werden mit 300 dpi
  gerendert, wie ein Scan aufbereitet (Beleuchtung, Lage, Schräglage) und
  gelesen – Antiqua oder Fraktur entscheidet die erste Seite; steht eine
  Seite auf dem Kopf, wird sie gedreht gelesen. Hatte das PDF schon eine
  Textebene mit mehr echten Wörtern, bleibt diese. Der Text kommt in die
  Suche (`source_pages`).

- **probe (Stufe 2 zum Ansehen):** Für reine Scans (jede Seite ein grosses
  Bild – gemischte PDFs bleiben, sonst würden am Rechner gesetzte Seiten zu
  Bildern) ein neues PDF bauen: aufbereitete Seiten, Textebene je Zeile,
  eine Seitengrösse, nicht feiner als das Bild im Original. Nur als
  Artefakt `quellen-neu` (14 Tage), nichts wird ersetzt.
- **verbessern (Stufe 2):** dasselbe, und ist das neue PDF besser
  (mindestens so viel echter Text, höchstens 5 % grösser), ersetzt es die
  Datei in SharePoint – dieselbe Datei, neue Fassung; die alte bleibt im
  Versionsverlauf (SharePoint: Datei → Versionsverlauf → Wiederherstellen).
  Der Text in der Suche wird mit ersetzt.

Am Stein-Auszug: 7,5 MB → 3,5 MB, echte Wörter im PDF 1506 → 2677.

Quellen mit Text in der Suche werden übersprungen (ausser mit *neu*); ein
abgebrochener Lauf macht beim nächsten Mal dort weiter. *grenze* begrenzt
die Zahl der Quellen je Lauf, *quellen* wählt einzelne aus. Der Bericht
(Seiten, aus dem PDF, gelesen, leer, unsicher, Wörter, Schrift, Dauer) steht
in der Zusammenfassung des Laufs und als Artefakt `quellen-bericht`.

Einzurichten: das Secret `QUELLEN_TOKEN`, **derselbe Wert** in GitHub
(Settings → Secrets and variables → Actions) und bei Supabase (Edge
Functions → Secrets). Ein eigenes Geheimnis, nicht das der Sicherung.

Am Stein-Buch (12 Seiten): alle als Scans erkannt und neu gelesen, 2948
Wörter, S. 14 vollständig, die quer liegende S. 27 aufrecht; ein am
Rechner erstelltes PDF behält seinen Text, ohne gelesen zu werden.

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
(Geometrie, Rand finden, Glätten, Finger, Aufbereitung, Prüfung, Ordner,
Auslöser, Texterkennung, PDF, Zwischenspeicher, Abschluss),
Tests in `src/test/scanGeometrie.test.ts`, `src/test/scanPdf.test.ts`,
`src/test/quelltext.test.ts`, `src/test/scanOrdner.test.ts`,
`src/test/scanFinger.test.ts`, `src/test/scanRand.test.ts`,
`src/test/scanDrehen.test.ts`, `src/test/scanLage.test.ts`, `src/test/scanErsetzen.test.ts`,
`src/test/scanAufbereitung.test.ts`, `src/test/scanText.test.ts`.

## Später

- Ausschnitte aus einer Seite an eine Belegkarte der Wissensbibliothek
  (`bilder/<quellen-id>/sNNN_aN.jpg`).
- Vorhandene PDFs nachträglich durchsuchbar machen: Text aus PDFs lesen, die
  schon eine Textebene haben, und Scans ohne Text im Browser erkennen lassen.
