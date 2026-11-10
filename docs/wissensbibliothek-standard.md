# Wissensbibliothek – Standard

Die Wissensbibliothek ist das Nachschlagewerk eines Vereins für seine
Rechercheergebnisse. Sie liegt im Mitgliederbereich (`/intern/bibliothek`) und
richtet sich an zwei Gruppen: an Einsteiger, die einen erzählenden Leitfaden
lesen, und an Erfahrene, die auf einer Veranstaltung in wenigen Minuten einen
Beleg zeigen wollen. Beim Nachschlagen sind weder Bücher noch Dateiordner zur
Hand. Deshalb stehen Fundstelle, geprüfter Wortlaut und Seitenbild in der
Bibliothek selbst.

Diese Datei ist der Standard für Aufbau, Dateiformat und Einpflegen. Ändert
sich der Standard, wird er hier geändert.

## 1 Aufbau

| Bereich | Inhalt | Stand |
|---|---|---|
| Start | Suche über alles (Themenseiten zuerst) mit „Häufig gesucht“, drei Einstiege (nachsehen, Darstellung erkunden, Ausrüstung prüfen), Darstellungen mit Bild, offene Fragen, zuletzt ergänzte Karten, die drei Belegstufen | da |
| Darstellungen | je Darstellung zehn Kapitel mit Themenseiten; daneben die Reiter Belege (Karten nach Sachbereich), Bildtafeln, Quellen, Offen; Schalter „Ich stelle dar“ und Prüfliste je Rolle | da |
| Quellen | gemeinsames Register aller Werke, Archivalien und Bildtafeln, filterbar nach Darstellung und Rechtsstatus | da |
| Methode | freie Seiten (`seiten/*.md`): Belegstufen, Zitierstandard, Prüfregeln, Rechte | da, Inhalt fehlt noch |
| Begriffe | gemeinsames Glossar mit Namensfallen | später |
| Leitfaden als PDF, Am Lagerplatz | je Darstellung | später |

### Zwei Schichten je Darstellung

1. **Themenseiten** sind die Navigation und der Lesetext. Wer etwas sucht,
   landet zuerst hier. Jede Seite trennt Quellen, Befund und unsere
   Darstellung.
2. **Belege** sind Belegkarten (eine Aussage, Fundstelle, Seitenbild) und
   Bildtafeln. Die Themenseite verweist auf sie; jede Karte zeigt umgekehrt,
   zu welchen Themenseiten sie gehört.

### Die zehn Kapitel

Gleich für alle Darstellungen. Die Nummern stehen fest, die Bezeichnungen
darf eine Darstellung in `kapitel` anpassen.

| Nr. | Kapitel | Beispiel Pi 21 |
|---|---|---|
| 1 | Region | Nassau 1916/17, Garnison, Heimatfront |
| 2 | Zeitgeist | Kriegswinter, Versorgung, Stimmung |
| 3 | Weg in die Rolle | Wehrpflicht, Ausbildung, Ersatzweg |
| 4 | Rollen und Ränge | Dienstgrade, Funktionen, Abzeichen |
| 5 | Gliederung | Armee bis Kompanie, mit Gliederungsbaum |
| 6 | Sonderformen | Ersatz-, Reserve-, Landwehr-, Festungspioniere |
| 7 | Eigenheiten | Pioniere gegen Infanterie |
| 8 | Ausrüstung | je Stück, von Kopf bis Fuß; hier greift der Rollenfilter |
| 9 | Dienst und Alltag | Stellungsbau, Lager, Verpflegung |
| 10 | Nützliche Nebeninfos | Sprache, Feldpost, Geld, Namensfallen |

### Die neun Sachbereiche der Karten

Sie sind nicht mehr der Einstieg, bleiben aber als Feld und Filter (Reiter
„Belege“). Sie haben in jeder Darstellung dieselbe Nummer. Nur der Name darf sich
unterscheiden und steht in der Darstellung (`bereiche`).

| Nr. | Bereich |
|---|---|
| 1 | Rahmen: wer, wann, wo |
| 2 | Personen und Rollen |
| 3 | Kleidung |
| 4 | Ausrüstung, Gerät, Waffen |
| 5 | Tätigkeit |
| 6 | Alltag |
| 7 | Ordnung und Umgang |
| 8 | Begriffe und Fallen |
| 9 | Darstellung (Soll, Abweichungen, Prüfliste) |

## 2 Wo was liegt

**Gepflegt wird ein Ordner in SharePoint.** Er liegt auf einer
SharePoint-Website des Vereins – auf einer eigenen oder auf der der
Quellensammlung – und ist auf die Rechner der Pflegenden synchronisiert. Liegt
er auf der Website der Quellensammlung, nimmt deren Eingangskorb ihn aus. Karten schreiben, Ausschnitte
ablegen, Quellen eintragen: alles im Explorer, wie bei jedem anderen Ordner.
SharePoint führt dabei einen Versionsverlauf je Datei.

**„Aus SharePoint einlesen" bringt ihn in die Bibliothek.**

- **Texte** (Kopfdaten und Text der Markdown-Dateien) kommen in die Datenbank
  des Vereins, Tabellen `library_*`. Dort laufen Suche, Rechte und Verlauf
  (`library_history`, mit altem und neuem Stand; unverändertes Einlesen
  hinterlässt nichts).
- **Bilder bleiben in SharePoint.** Die Datenbank merkt sich nur, welche Datei
  zu welchem Bildpfad gehört (`library_images`). Angezeigt werden sie über
  Adressen, die die Edge Function `library-files` ausstellt und die nur Minuten
  gelten. Seitenbilder erscheinen zuerst als Vorschau mit 800 px, die
  SharePoint selbst erzeugt; die ganze Datei lädt, wer das Bild öffnet.
- **Nichts davon steht im Repository oder im Build.** Was im Build steckt,
  liegt ohne Anmeldung auf dem Webspace und ist per Adresse abrufbar, auch
  wenn die Seite in der App hinter dem Login liegt.

Lesen darf, wer das Recht `library.read` hat (bei der Einrichtung alle
Rollen). Pflegen darf, wer `library.manage` hat (bei der Einrichtung die
Leitung). Die Edge Function gibt Bildadressen nur heraus, wenn die Person die
Bibliothek lesen darf, und nur für Dateien, die im Ordner der Bibliothek
liegen.

## 3 Der Ordner

```
Bibliothek/                         Name frei wählbar, eingetragen unter Pflege → Ablage
  darstellungen/<Kürzel>.md         eine Datei je Darstellung
  seiten/<name>.md                  freie Seiten; „start" erscheint auf der Startseite
  quellen/<quellen-id>.md           Quellenregister, gemeinsam für alle Darstellungen
  themen/<Kürzel>/<id>.md           Themenseiten
  karten/<Kürzel>/<Kürzel>-NNNN.md  Belegkarten
  bilder/<quellen-id>/sNNN.jpg      Seitenbild (ganze Seite oder Doppelseite)
  bilder/<quellen-id>/sNNN_aN.jpg   Zeigebild (Ausschnitt, Stelle rot markiert)
  bilder/<Kürzel>/<Kürzel>-Tnn.md   Bildtafel mit den fünf Angaben
  bilder/<Kürzel>/Tnn.jpg           Bild der Tafel, Ausschnitte als Tnn_aN.jpg
  _arbeit/                          wird übergangen (alles, was mit _ beginnt)
  _themen_entwurf/<Kürzel>/         Entwürfe von Themenseiten; übergangen, ausser
                                    beim Einlesen mit „Entwürfe mit einlesen“
```

Seitenbilder liegen bei ihrer **Quelle**, nicht bei der Darstellung: Das
Register ist gemeinsam, und eine Seite, die zwei Darstellungen zitieren, liegt
so nur einmal da. Karten und Bildtafeln liegen je **Darstellung**.

Die README und alle anderen Dateien werden übergangen.

## 4 Einträge und Kopfdaten

Jeder Eintrag ist eine Markdown-Datei mit Kopfdaten (YAML zwischen `---` und
`---`). Der Text darunter erscheint unter dem Eintrag. Kennungen darin werden
zu Links: Karten (`PI21-0042`, beim Antippen eine Vorschau mit Kernsatz, Stufe
und Zeigebild), Bildtafeln (`PI21-T27`) und Themenseiten
(`PI21-ausruestung-kopfbedeckung`). Tabellen im Markdown werden dargestellt.
Schlüssel und Werte sind deutsch.

### Darstellung (`darstellungen/PI21.md`)

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | Kürzel, Grossbuchstaben und Ziffern, 2–10 Zeichen (`PI21`, `ZIS`) |
| `titel` | ja | |
| `epoche`, `zeitraum` | | |
| `ebenen` | | Ebenen-Vokabular von allgemein nach konkret; die `ebene` jeder Karte muss daraus stammen |
| `bereiche` | | Namen der neun Sachbereiche, `1: "…"` bis `9: "…"` |
| `kapitel` | | Bezeichnungen der zehn Kapitel: `- {nr: 3, titel: "Weg in die Truppe"}`; fehlende Kapitel tragen den Namen aus Abschnitt 1. Sind Kapitel angegeben, darf eine Themenseite nur diese benutzen |
| `kapitel` (Fortsetzung) | | je Kapitel freiwillig `status` und `text`: `- {nr: 6, titel: "Sonderformen", status: nicht-relevant, text: "Pi 21 war ein aktives Bataillon."}`. `status` ist `bereit`, `entwurf`, `recherche` oder `nicht-relevant`; angezeigt als „Bereit“, „Im Entwurf“, „Recherche geplant“, „Für diese Darstellung nicht relevant“ |
| `rollen` | | Rollen für „Ich stelle dar“: `- {id: pionier, titel: "Pionier", text: "…"}`; `id` aus Kleinbuchstaben, Ziffern, `-`, `_` |
| `bild` | | Bild für die Startseite, Pfad wie bei Fundstellen (`PI21/T27.jpg`). Nur eine Tafel mit `rechte_status: frei` oder ein eigenes Foto; liegt das Bild nicht im Ordner, ist das eine Warnung |
| `stand` | | Datum `JJJJ-MM-TT` |

`zeitraum` dient auch der Zählung (Abschnitt 7): Alle vierstelligen Jahre darin
ergeben den Darstellungszeitraum, ein Jahr Luft auf jeder Seite.

### Quelle (`quellen/hiss-ir116-1924.md`)

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | sprechender Schlüssel, Kleinbuchstaben, Ziffern, Bindestrich; zugleich Name des Bildordners |
| `titel` | ja | |
| `rechte_status` | ja | `frei`, `intern` oder `offen`. Ohne Rechtsstatus keine Quelle und damit keine Bilder |
| `art`, `ort_verlag`, `jahr`, `hinweis`, `vorlage`, `ebene`, `rechte`, `ausgewertet`, `titelblatt` | | freier Text |

Zwei freiwillige Verbindungen setzt man auf der Seite der Quelle, nicht in der
Datei: zum Buch in der **Quellensammlung** (wo die geteilte Datei liegt) und zur
Angabe auf der **öffentlichen Epochenseite**. Ein erneutes Einspielen der Datei
lässt beide stehen.

### Bildtafel (`bilder/PI21/PI21-T27.md`)

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | `<Kürzel>-T<Nummer>` |
| `darstellung` | ja | Kürzel |
| `titel` | ja | |
| `rechte_status` | ja | wie bei der Quelle |
| `datei` | | Bilddatei im selben Ordner (`T27.jpg`) |
| `objekt`, `datierung`, `reproduktion`, `ablesbar`, `nicht_ablesbar` | | die fünf Angaben |
| `einheit`, `rechte`, `stand` | | |
| `jahr` | | Aufnahmejahr als Zahl, nur wenn belastbar |
| `datierung_herkunft` | | `rueckseite`, `aufschrift`, `poststempel`, `beschriftung`, `dateiname`, `objekt` oder `keine`. `objekt` heisst: datiert nur durch ein abgebildetes Stück (Stahlhelm → frühestens 1916) |
| `lage` | | `front`, `ruhe`, `heimat`, `uebungsplatz`, `atelier` oder `unbekannt` |
| `zeigt` | | was die Tafel für welche Themenseite zeigt: `- {thema: PI21-ausruestung-kopfbedeckung, merkmal: "Stahlhelm ohne Überzug", anzahl: 3}`; `anzahl` freiwillig |

Unbekannte Werte bei `jahr`, `datierung_herkunft` und `lage` lehnt das
Einlesen ab; eine unbekannte Themenseite in `zeigt` ist eine Warnung.

### Belegkarte (`karten/PI21/PI21-0042.md`)

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | `<Kürzel>-NNNN`. Die Nummer enthält bewusst nicht die Gliederung: Wandert die Karte in einen anderen Bereich, bleibt sie gültig |
| `darstellung` | ja | Kürzel; muss zum Anfang der `id` passen |
| `bereich` | ja | 1–9 |
| `kernsatz` | ja | die Sachaussage in einem Satz. Faustregel 120–180 Zeichen; ab 250 Zeichen gibt das Einlesen einen Hinweis (kein Fehler) |
| `stufe` | ja | `Q` Belegt, `F` Forschungsmeinung oder `A` Annahme oder Analogie (Abschnitt 7, Belegstufen) |
| `stufe_hinweis` | | wenn die Stufe einer Erklärung bedarf („A eng an Q: …“) |
| `ebene` | | aus dem Vokabular der Darstellung |
| `gilt_stand` | | auf welchen Stand sich der Beleg bezieht („1910 (Vorkriegsvorschrift)“) |
| `schlagworte` | | Liste; Zahlen in Anführungszeichen (`"21"`) |
| `status` | | `entwurf` (Vorgabe), `geprüft`, `bild-fehlt`, `bild-ersetzen` |
| `thema` | | Liste von Themenseiten, auf die die Karte zeigt; eine Karte kann auf mehrere Seiten gehören. Unbekannte Seiten sind eine Warnung |
| `rollen` | | nur, wenn der Beleg nur für bestimmte Rollen gilt (z. B. Unteroffiziersborte); leer heisst: für alle |
| `stand` | | Datum |
| `fundstellen` | ja, mindestens eine | siehe unten |

Jede Fundstelle nennt **genau eins**: `quelle` (Schlüssel aus dem Register)
oder `bild` (Kennung einer Bildtafel). Dazu:

| Feld | Inhalt |
|---|---|
| `seite` | Druckseite, auch mit Zusatz („118, Beilage 1, IV. Pioniere“); in Anführungszeichen |
| `pdf_seite` | Seite in der PDF-Vorlage, als Zahl |
| `wortlaut` | geprüfter Wortlaut, ohne Anführungszeichen; `null` bei Bildern |
| `wortlaut_hinweis` | wo genau und wie zu lesen (Tabellenkopf, Transkription …) |
| `zeigebild` | `<ordner>/<datei>`, z. B. `becher-2018/s29_a1.jpg` |
| `seitenbild` | `<ordner>/<datei>`, z. B. `becher-2018/s29.jpg` |

Der Text unter den Kopfdaten trägt die Einschränkung, Gegenpositionen und
Bezugspunkte, jeweils mit fettem Stichwort am Absatzanfang
(`**Einschränkung:** …`).

### Themenseite (`themen/PI21/PI21-ausruestung-kopfbedeckung.md`)

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | `<Kürzel>-<sprechender-name>` in Kleinbuchstaben, Ziffern und Bindestrichen, z. B. `PI21-ausruestung-kopfbedeckung`; eindeutig |
| `darstellung` | ja | Kürzel; muss zum Anfang der `id` passen |
| `titel` | ja | |
| `kapitel` | ja | 1–10, aus der Darstellung |
| `eltern` | | `id` der übergeordneten Themenseite; leer heisst: oben im Kapitel. Fehlt die Elternseite, ist das eine Warnung, und die Seite steht so lange oben. Ein Kreis (A unter B unter A) wird abgelehnt |
| `reihenfolge` | | Zahl für die Sortierung unter der Elternseite |
| `gruppe` | | Zwischentitel in der Kapitelübersicht, z. B. „Uniform“, „Gepäck“, „Waffen“. Seiten derselben Gruppe stehen beieinander; Seiten ohne Gruppe vorne |
| `suchbegriffe` | | Liste; Schreibweisen, unter denen man die Seite sucht („Helm Bezug“, „Krätzchen“). Ein Treffer hier stellt die Seite an die Spitze der Suche |
| `rollen` | | Rollen-ids der Darstellung; leer heisst: für alle. Wirkt in Kapitel 8 |
| `karten` | | Karten-ids in der Reihenfolge der Anzeige |
| `tafeln` | | Tafel-ids |
| `baum` | | Gliederungsbaum, nur für Kapitel 5 (Abschnitt 7) |
| `rahmen` | | Darstellungsrahmen: was wir wie darstellen, Zeile für Zeile (Abschnitt 7). Daraus entsteht die Prüfliste |
| `stand` | ja | Datum |

Der Text hat feste Abschnitte, in dieser Reihenfolge; jeder darf fehlen. Die
früheren, längeren Überschriften gelten weiter und meinen denselben Abschnitt:

| Überschrift | gleichwertig | Inhalt |
|---|---|---|
| `## Kurzantwort` | | drei Sätze für den Besucher. Steht oben, hervorgehoben; erscheint auch in der Suche und in der Prüfliste |
| `## Historischer Hintergrund` | | Zusammenhang für Einsteiger; steht unter der Kurzantwort, eingeklappt. Regel unten |
| `## Unsere Darstellung` | `## Was das für uns heißt` | Folgerung, Soll, Abweichungen. Mit `rahmen` steht darüber die Tabelle; der Text ergänzt sie |
| `## Quellen` | `## Was die Quellen sagen` | Vorschrift, Regel, Literatur |
| `## Befund` | `## Was sich in der Realität findet` | Fotos, Funde, Häufigkeit; darüber die Zähltabelle (Abschnitt 7) |
| `## Offen` | `## Offene Fragen` | was nicht belegt ist, eine Frage je Absatz oder Listenpunkt. Erscheint als einzelne Fragen auf der Seite, im Reiter „Offen“ und auf der Startseite |

Andere Überschriften zeigt die Seite an, das Einlesen gibt aber einen Hinweis.
Die Seite ordnet nach Antwort → Erklärung → Nachweis: Kurzantwort, Hintergrund,
unsere Darstellung, dann Quellen, Befund, Offen und die Belege.

**Historischer Hintergrund: keine neuen Fakten ohne Karte.** Jeder Satz nennt
eine Karte oder Tafel (`PI21-0042`, `PI21-T27`) oder ist als redaktionelle
Einordnung gekennzeichnet: entweder mit „(Einordnung)“ am Satzende oder als
Absatz, der mit `**Einordnung:**` beginnt. Sätze ohne beides meldet das
Einlesen als Hinweis.

Unter dem Text zeigt die Seite ihre Unterseiten und die Belege: zuerst die
Karten aus `karten`, dann weitere Karten, die über `thema` auf die Seite
zeigen, dann die Tafeln aus `tafeln` und die, deren `zeigt` auf die Seite
verweist.

### Seite (`seiten/methode.md`)

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | Kleinbuchstaben. Alle Seiten ausser `start` erscheinen als Link auf der Startseite, `methode` zuerst |
| `titel` | ja | |
| `reihenfolge` | | Zahl |
| `haeufig` | | nur bei `start`: Liste der Begriffe unter „Häufig gesucht“, z. B. `[Stahlhelm, Helmüberzug, Feldmütze]` |

Der Text von `start` erscheint nicht mehr auf der Startseite (Z0, 10.11.2026);
was dort stand, gehört nach `methode`.

## 5 Bilder

- **Seitenbild:** die ganze Seite oder Doppelseite.
  **Zeigebild:** der Ausschnitt mit der Stelle, rot markiert.
- JPEG, PNG oder WebP. Was im Ordner liegt, wird so gezeigt; für das Handy
  reichen Seitenbilder mit etwa 2000 px an der langen Seite (300 dpi, 0,5–1 MB).
  Originalscans mit 3–4 MB gehen auch, laden am Lagerplatz aber spürbar länger,
  wenn jemand die ganze Seite öffnet.
- Ein Bild liegt im Ordner seiner Quelle oder seiner Darstellung. Gibt es
  keine Quelle bzw. Darstellung dieses Namens, wird es nicht verzeichnet, denn
  es hätte keinen Rechtsstatus. Die Pflegeseite meldet das.
- Wird eine Datei überschrieben, behält sie in SharePoint ihre Kennung; die
  Karte zeigt nach dem nächsten Einlesen das neue Bild.

## 6 Einpflegen

### Einmalig: Website und Freigabe

1. Den Ordner `Bibliothek` in die **Dokumente** einer SharePoint-Website legen,
   etwa der Website der Quellensammlung. Mit
   **Synchronisieren** erscheint er im Explorer, etwa unter
   `D:\Diu lebendec Histôrje e.V\<Website> - Dokumente\Bibliothek`.
2. Ist es nicht die Website der Quellensammlung: die Website für DING
   freigeben. Das ist derselbe Schritt wie bei der
   Quellensammlung (docs/sharepoint.md, Schritt 5), nur mit der Adresse dieser
   Website: im Graph Explorer die Kennung der Website holen und für die
   Anwendung „DING Dateiablage" `write` eintragen. Eine neue App-Registrierung
   oder neue Geheimnisse braucht es nicht. (`read` genügte auch; `write` hält
   die Tür offen, falls DING später etwas ablegen soll.)
3. In DING unter **Wissensbibliothek → Pflege → Ablage in SharePoint** die
   Adresse der Website und den Ordner eintragen, **Speichern**, **Verbindung
   prüfen**.

### Einlesen

**Wissensbibliothek → Pflege → Aus SharePoint einlesen.** Neues kommt dazu,
Geändertes wird ersetzt. Was abgelehnt wird, steht mit Grund in der Liste.
Die Seite zeigt ausserdem, wo Bilder fehlen, welche Karten nicht geprüft sind,
welche Themenseiten keine Kurzantwort haben, welche Karten auf keiner
Themenseite vorkommen („verwaiste Belege“) und was zuletzt geändert wurde.

**Fehler** halten einen Eintrag auf: doppelte Kennung, fehlendes Pflichtfeld,
ein Kapitel, das die Darstellung nicht hat, ein Kreis in `eltern`. **Hinweise**
lassen ihn durch und stehen aufklappbar darunter: unbekannte Karten, Tafeln
oder Themenseiten in Text, `karten`, `tafeln`, `baum.belege`, `thema` und
`zeigt.thema`; eine fehlende Elternseite; Rollen, die die Darstellung nicht
kennt; Ebenen im Baum ausserhalb des Vokabulars; Abschnitte ausserhalb der
fünf festen.

**Entwürfe ansehen:** Mit „Entwürfe aus `_themen_entwurf` mit einlesen“ kommen
die Seiten aus dem Entwurfsordner herein, als lägen sie in `themen/`. So lässt
sich eine Musterseite am Handy prüfen, bevor sie verschoben wird. Beim
nächsten normalen Einlesen erscheinen sie unter „nicht mehr im Ordner“ und
lassen sich dort wieder entfernen.

Gelöschtes wird nicht von selbst entfernt: Was in der Bibliothek steht, aber
nicht mehr im Ordner, listet die Seite auf. Entfernt wird es erst mit
**Aus der Bibliothek entfernen**. Eine Datei, die nur gerade nicht
synchronisiert ist, soll keine Karte mitnehmen. Ist eine Datei nicht lesbar,
bietet die Seite gar nichts zum Entfernen an, weil sie deren Kennung nicht
kennt.

Bilder, die im Ordner fehlen, werden dagegen sofort ausgetragen: Sie sind nur
ein Verweis, und die Karte zeigt dann „Bild fehlt".

### Per SQL, etwa aus einem Claude-Chat mit Supabase-Konnektor

Für Texte geht es auch ohne Ordner: Kopfdaten als JSON, Text als dritter
Wert. Reihenfolge: Darstellung, Quelle, Bildtafel, Themenseite (Art `thema`),
Karte. **Aber:** Beim
nächsten Einlesen gilt der Ordner. Was nur per SQL eingetragen wurde,
erscheint dann unter „nicht mehr im Ordner". Für Dauerhaftes also die Datei
in den Ordner legen.

```sql
select public.library_import('karte', $json${
  "id": "PI21-0042", "darstellung": "PI21", "bereich": 1, "stufe": "Q", "ebene": "Regiment",
  "kernsatz": "Die 3./Pi 21 half dem IR 116 von Januar bis März 1917 beim Stellungsbau.",
  "fundstellen": [{ "quelle": "hiss-ir116-1924", "seite": "130",
                    "wortlaut": "trotz der wackeren Hilfe der 3. Pi. 21",
                    "zeigebild": "hiss-ir116-1924/s130_a1.jpg", "seitenbild": "hiss-ir116-1924/s130.jpg" }],
  "status": "bild-fehlt", "stand": "2026-11-09"
}$json$::jsonb, $text$**Einschränkung:** belegt die 3. Kompanie, nicht die 2.$text$);
```

### Verlauf

```sql
select changed_at, table_name, operation, old_row, new_row
from public.library_history where entry_id = 'PI21-0042' order by id;
```

## 7 Themenseiten im Einzelnen

### Zähltabelle

Unter „Befund“ zählt die Seite alle Tafeln, deren
`zeigt` auf sie verweist: Merkmal × Lage, Anzahl der **Tafeln** (nicht der
Personen auf einem Foto). Gezählt werden nur Tafeln mit `datierung_herkunft`
`rueckseite`, `aufschrift`, `poststempel` oder `beschriftung`. Ein Schalter
wechselt zwischen „nur Darstellungszeitraum“ (Jahr nötig) und „alle“.
Darunter steht fest: „Gezählt sind nur belastbar datierte Fotos unserer
Sammlung; die Auswahl ist zufällig und nicht repräsentativ.“ Die übrigen
Tafeln stehen aufklappbar unter „Nicht gezählt“, mit Grund. Eine Handtabelle
im Text wird damit überflüssig.

### Gliederungsbaum (Kapitel 5)

`baum` ist eine Liste von Knoten:

| Feld | Inhalt |
|---|---|
| `id` | eindeutig im Baum |
| `titel` | |
| `ebene` | aus dem Ebenen-Vokabular der Darstellung (sonst Hinweis) |
| `stufe` | `Q`, `F`, `A` oder `offen` |
| `text` | |
| `belege` | Karten-ids |
| `kinder` | Knoten darunter |
| `darstellung: true` | unsere Einheit, hervorgehoben |
| `fremd: true` | nicht Teil des eigenen Verbands, gestrichelt |

Die Seite zeigt ihn als aufklappbare Kästen von oben nach unten: oberste
Ebene offen, darunter zu, der Weg zur eigenen Einheit von Anfang an offen. Jeder
Kasten trägt die Stufe als Abzeichen und die Belege als Links mit Vorschau.

### Darstellungsrahmen (`rahmen`)

Was wir wie darstellen, als Liste von Zeilen:

```yaml
rahmen:
  - lage: Winter, Stellung
    gegenstand: Stahlhelm M16 mit Überzug
    status: bevorzugt
    karten: [PI21-0042, PI21-0051]
  - gegenstand: Feldmütze
    status: variante
    text: In Ruhe und hinter der Front.
    karten: [PI21-0044]
  - gegenstand: Pickelhaube
    status: nicht-empfohlen
    karten: [PI21-0047]
```

| Feld | Pflicht | Inhalt |
|---|---|---|
| `gegenstand` | ja | was |
| `status` | ja | `pflicht`, `bevorzugt`, `variante`, `offen` oder `nicht-empfohlen` |
| `lage` | | wann oder wo; frei, z. B. „Winter“, „Stellung“, „Ruhe“, „Heimat“ (ein eigener Status „situativ“ entfällt) |
| `text` | | kurze Erläuterung |
| `karten` | | Belege; unbekannte Karten sind eine Warnung |
| `rollen` | | nur für diese Rollen; leer heisst: für alle |
| `stufe` | | überschreibt die Stufe der Zeile |

Die Stufe einer Zeile ist die **schwächste** ihrer Karten (A vor F vor Q),
ausser `stufe` ist gesetzt. Bewusste Abweichungen der Gruppe (Karten aus
Bereich 9, z. B. PI21-0078 Tombakschloss) stehen als `variante` mit Verweis
auf die Abweichungskarte. Varianten sind zulässig, keine Fehler.

### Belegstufen

| Stufe | Name | wann |
|---|---|---|
| Q | Belegt | Quelle oder Literatur mit Fundstelle |
| F | Forschungsmeinung | ein Autor schätzt es veröffentlicht so ein |
| A | Annahme oder Analogie | Rückschluss, Analogie, kein Beleg für unsere Einheit selbst |

Interpretationen zählen nur dann als F, wenn sie veröffentlicht sind.
Deutungen der Gruppe oder einer KI sind A. Eigene Befunde der Gruppe kommen
nur mit Fundstelle (Foto, Fundstück, Dokument) in eine Karte, sonst als Frage
unter „Offen“. Das gilt auch für Material aus OneNote: Es wird nicht
übernommen, sondern geprüft und mit Fundstelle neu als Karte angelegt.

### Kapitel

Die Darstellung zeigt die zehn Kapitel als ruhige Liste: Nummer, Name, der
Arbeitsstand in Worten (`status`) und ein Satz (`text`), wenn gesetzt;
daneben die Themenseiten, nach `gruppe` geordnet. Ein Kapitel ohne Seite heisst
nie „fehlt“.

### Rollen

Auf dem Reiter „Themen“ einer Darstellung steht „Ich stelle dar: …“ mit den
Rollen aus der Darstellung. Die Wahl merkt sich der Browser je Darstellung.
Mit gewählter Rolle blendet Kapitel 8 Themenseiten, Karten und
Rahmenzeilen aus, deren `rollen` die Rolle nicht enthalten (leer heisst:
immer sichtbar).

### Prüfliste

Die Prüfliste zeigt alle Themenseiten aus Kapitel 8 in ihrer Reihenfolge.
Hat eine Seite einen `rahmen`, ist jede Zeile ein Punkt mit Kästchen, Status
und Stufe; `nicht-empfohlen` steht als Warnung ohne Kästchen da. Seiten ohne
Rahmen erscheinen mit Kurzantwort und „Unsere Darstellung“ und einem Kästchen
für die ganze Seite. Oben steht „x von y abgehakt“ und der Schalter „Alle ·
Noch offen“. Abgehakt wird **nur auf dem Gerät** (Browser), je Darstellung und
Rolle; nichts geht in die Datenbank. Druckbar auf A4.

### Suche

- Themenseiten stehen vor Karten, Tafeln und Quellen. Ein Treffer in
  `suchbegriffe` stellt die Seite an die Spitze, mit ihrer Kurzantwort.
- Verglichen wird gefaltet: Kleinschreibung, Umlaute ausgeschrieben
  (ü = ue), ß = ss, Leerzeichen, Bindestriche und Satzzeichen zählen nicht.
  „Helm Bezug“, „Helm-Bezug“ und „Helmbezug“ sind gleich, ebenso „Überzug“
  und „Ueberzug“.
- Daneben die deutsche Volltextsuche mit Wortanfängen und gebeugten Formen.
- Wer nur eine Nummer eingibt („0042“, „T27“), bekommt zuerst die Karte oder
  Tafel, nicht die Seiten, die sie nennen.
- Grenze: Verschiedene Wörter werden nicht gleichgesetzt. „Helm Bezug“ findet
  „Helmüberzug“ nur, weil die Seite „Helm Bezug“ unter `suchbegriffe` führt.

## 8 In der Datenbank

| Tabelle | Inhalt |
|---|---|
| `library_presentations` | Darstellungen |
| `library_sources` | Quellenregister (`rights_status`: `free`, `internal`, `open`) |
| `library_plates` | Bildtafeln |
| `library_cards` | Belegkarten (`status`: `draft`, `checked`, `image_missing`, `image_replace`) |
| `library_findings` | Fundstellen, je Karte in Reihenfolge |
| `library_images` | welcher Bildpfad zu welcher Datei in SharePoint gehört, mit Grösse |
| `library_pages` | freie Seiten |
| `library_history` | Verlauf, nur für die Pflege lesbar |
| `library_settings` | Adresse der SharePoint-Website und Ordner |
| `library_topics` | Themenseiten; `summary` ist die herausgezogene Kurzantwort |

Darstellungen tragen `chapters` (mit `status`, `text`), `roles` und
`image`, Themenseiten `grp` und `frame`, Seiten `frequent`, Karten `topics` und `roles`,
Tafeln `year`, `dating_origin`, `situation` und `shows` (Werte wie in den
Kopfdaten).

Funktionen: `library_import(art, kopfdaten, text)`, `library_search(begriff)`
(Abschnitt 7), `library_section(text, überschrift)`, `library_fold(text)`.
Edge Function `library-files`: `status`, `scan` (Ordner lesen, auf Wunsch mit
Entwürfen), `urls` (Bildadressen). Migrationen:
`supabase/migrations/20261109100000_wissensbibliothek.sql`,
`supabase/migrations/20261110100000_wissensbibliothek_themen.sql`,
`supabase/migrations/20261110120000_wissensbibliothek_rahmen.sql`.

## 9 Später

- PDF-Fassung von Nachschlagewerk und Leitfaden, wenn die Inhalte zu etwa 95 %
  stehen. Erzeugt wird sie aus der Datenbank, nicht aus Dateien.
- Leitfaden als PDF: Themenseiten in Kapitelreihenfolge, Karten als Anhang mit
  Zeigebild.
- Glossar (Begriffe mit Epoche, Namensfallen markiert), Antwortkarten „Am
  Lagerplatz“.
- Offline am Lagerplatz deckt erst die PDF-Fassung ab.
