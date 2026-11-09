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
| Start | Suche über alles, Kurzerklärung (Seite `start`), Einstieg je Darstellung | da |
| Darstellungen | je Darstellung die Belegkarten in neun Sachbereichen | da |
| Quellen | gemeinsames Register aller Werke, Archivalien und Bildtafeln, filterbar nach Darstellung und Rechtsstatus | da |
| Methode | freie Seiten (`seiten/*.md`): Belegstufen, Zitierstandard, Prüfregeln, Rechte | da, Inhalt fehlt noch |
| Begriffe | gemeinsames Glossar mit Namensfallen | später |
| Leitfaden, Am Lagerplatz, Offen | je Darstellung | später |

### Die neun Sachbereiche

Sie haben in jeder Darstellung dieselbe Nummer. Nur der Name darf sich
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

**Die Datenbank ist die Quelle der Wahrheit.** Jede Änderung hält die Tabelle
`library_history` mit altem und neuem Stand fest. Eine unveränderte
Einspielung hinterlässt dort nichts.

- **Texte** liegen in der Datenbank des Vereins (Supabase), Tabellen
  `library_*`.
- **Bilder** liegen als Webfassung im privaten Speicher `library`.
- **Originale** (Scans, Fotos, PDFs) bleiben im Dateiordner des Vereins. Sie
  kommen weder in die Bibliothek noch in dieses Repository.
- **Nichts davon steht im Repository oder im Build.** Was im Build steckt, liegt
  ohne Anmeldung auf dem Webspace und ist per Adresse abrufbar, auch wenn die
  Seite in der App hinter dem Login liegt.

Lesen darf, wer das Recht `library.read` hat (bei der Einrichtung alle
Rollen). Pflegen darf, wer `library.manage` hat (bei der Einrichtung die
Leitung). Bilder holt die Seite über signierte Adressen, die zehn Minuten
gelten.

## 3 Ordner zum Hochladen

So, wie der Ordner im Dateiordner des Vereins liegt:

```
Bibliothek/
  darstellungen/<Kürzel>.md         eine Datei je Darstellung
  seiten/<name>.md                  freie Seiten; „start" erscheint auf der Startseite
  quellen/<quellen-id>.md           Quellenregister, gemeinsam für alle Darstellungen
  karten/<Kürzel>/<Kürzel>-NNNN.md  Belegkarten
  bilder/<quellen-id>/sNNN.jpg      Seitenbild (ganze Seite oder Doppelseite)
  bilder/<quellen-id>/sNNN_aN.jpg   Zeigebild (Ausschnitt, Stelle rot markiert)
  bilder/<Kürzel>/<Kürzel>-Tnn.md   Bildtafel mit den fünf Angaben
  bilder/<Kürzel>/Tnn.jpg           Bild der Tafel, Ausschnitte als Tnn_aN.jpg
  _arbeit/                          wird übergangen (alles, was mit _ beginnt)
```

Die README und alle anderen Dateien werden übergangen.

## 4 Einträge und Kopfdaten

Jeder Eintrag ist eine Markdown-Datei mit Kopfdaten (YAML zwischen `---` und
`---`). Der Text darunter erscheint unter dem Eintrag; Kartenkennungen darin
(`PI21-0042`, `PI21-T27`) werden zu Links. Schlüssel und Werte sind deutsch.

### Darstellung (`darstellungen/PI21.md`)

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | Kürzel, Grossbuchstaben und Ziffern, 2–10 Zeichen (`PI21`, `ZIS`) |
| `titel` | ja | |
| `epoche`, `zeitraum` | | |
| `ebenen` | | Ebenen-Vokabular von allgemein nach konkret; die `ebene` jeder Karte muss daraus stammen |
| `bereiche` | | Namen der neun Sachbereiche, `1: "…"` bis `9: "…"` |
| `stand` | | Datum `JJJJ-MM-TT` |

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

### Belegkarte (`karten/PI21/PI21-0042.md`)

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | `<Kürzel>-NNNN`. Die Nummer enthält bewusst nicht die Gliederung: Wandert die Karte in einen anderen Bereich, bleibt sie gültig |
| `darstellung` | ja | Kürzel; muss zum Anfang der `id` passen |
| `bereich` | ja | 1–9 |
| `kernsatz` | ja | die Sachaussage in einem Satz |
| `stufe` | ja | `Q`, `F` oder `A` |
| `stufe_hinweis` | | wenn die Stufe einer Erklärung bedarf („A eng an Q: …“) |
| `ebene` | | aus dem Vokabular der Darstellung |
| `gilt_stand` | | auf welchen Stand sich der Beleg bezieht („1910 (Vorkriegsvorschrift)“) |
| `schlagworte` | | Liste; Zahlen in Anführungszeichen (`"21"`) |
| `status` | | `entwurf` (Vorgabe), `geprüft`, `bild-fehlt`, `bild-ersetzen` |
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

### Seite (`seiten/methode.md`)

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | Kleinbuchstaben; `start` erscheint auf der Startseite, alle anderen als Link dort |
| `titel` | ja | |
| `reihenfolge` | | Zahl |

## 5 Bilder

- **Seitenbild:** die ganze Seite oder Doppelseite.
  **Zeigebild:** der Ausschnitt mit der Stelle, rot markiert.
- Beim Hochladen entsteht im Browser eine **Webfassung** (WebP, höchstens
  2000 px an der langen Seite, nie vergrössert) und eine **Vorschau** (600 px).
  Zeigebilder sind meist kleiner und bleiben dann in Originalgrösse.
- Ein Bild liegt im Ordner seiner Quelle oder seiner Darstellung. Gibt es
  keine Quelle bzw. Darstellung dieses Namens, lehnt die Datenbank das Bild ab,
  denn es hätte keinen Rechtsstatus.
- Ein Bild, das schon in derselben Dateigrösse hochgeladen ist, wird beim
  nächsten Hochladen übersprungen.
- Kosten: Der Probesatz Pi 21 hat als Originale 4,1 MB. Geschätzt sind es je
  Darstellung 150–200 MB Webfassungen. Der kostenlose Supabase-Tarif hat 1 GB
  Speicher insgesamt; was der Verein schon belegt, zeigt das Supabase-Dashboard
  unter *Storage*.

## 6 Einpflegen

Beide Wege laufen durch dieselbe Funktion `library_import()` und damit durch
dieselben Prüfungen: Pflichtfelder, Rechtsstatus, Ebene aus dem Vokabular,
Fundstelle mit bekannter Quelle oder Tafel.

### Ordner hochladen

**Wissensbibliothek → Pflege → Ordner wählen**, den Ordner `Bibliothek`
auswählen, **Einspielen**. Neues kommt dazu, Geändertes wird ersetzt. Was
abgelehnt wird, steht mit Grund in der Liste. Die Seite zeigt ausserdem, wo
Bilder fehlen, welche Karten nicht geprüft sind und was zuletzt geändert wurde.

Gelöscht wird beim Hochladen nichts. Eine Datei, die im Ordner fehlt, bleibt in
der Bibliothek.

### Per SQL, etwa aus einem Claude-Chat mit Supabase-Konnektor

Kopfdaten als JSON, Text als dritter Wert. Reihenfolge: Darstellung, Quelle,
Bildtafel, Karte.

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

Bilder lassen sich so nicht hochladen. Sie kommen über die Pflegeseite herein;
bis dahin zeigt die Karte „Bild fehlt“.

Löschen geht nur per SQL und landet ebenfalls im Verlauf:

```sql
delete from public.library_cards where id = 'PI21-0042';   -- Fundstellen gehen mit
```

### Verlauf

```sql
select changed_at, table_name, operation, old_row, new_row
from public.library_history where entry_id = 'PI21-0042' order by id;
```

## 7 In der Datenbank

| Tabelle | Inhalt |
|---|---|
| `library_presentations` | Darstellungen |
| `library_sources` | Quellenregister (`rights_status`: `free`, `internal`, `open`) |
| `library_plates` | Bildtafeln |
| `library_cards` | Belegkarten (`status`: `draft`, `checked`, `image_missing`, `image_replace`) |
| `library_findings` | Fundstellen, je Karte in Reihenfolge |
| `library_images` | welches Bild unter welchem Namen im Speicher liegt, mit Grösse |
| `library_pages` | freie Seiten |
| `library_history` | Verlauf, nur für die Pflege lesbar |

Funktionen: `library_import(art, kopfdaten, text)`, `library_search(begriff)`
(deutsche Volltextsuche, Wortanfänge, Kennungen direkt).
Migration: `supabase/migrations/20261109100000_wissensbibliothek.sql`.

## 8 Später

- PDF-Fassung von Nachschlagewerk und Leitfaden, wenn die Inhalte zu etwa 95 %
  stehen. Erzeugt wird sie aus der Datenbank, nicht aus Dateien.
- Glossar (Begriffe mit Epoche, Namensfallen markiert), Leitfaden-Kapitel,
  Antwortkarten „Am Lagerplatz“, Bereich „Offen“.
- Offline am Lagerplatz deckt erst die PDF-Fassung ab.
