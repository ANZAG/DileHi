# Öffentliche Seiten selbst pflegen – Machbarkeit und Aufwand

Stand: 08.09.2026. Anlass: Der Verein Vuozvolc hat Interesse an unserer Lösung.
Die Frage war, ob wir einen kleinen Seitenbaukasten (Menü, Seiten mit WYSIWYG,
Logo, Favicon, Farben) selbst bauen, oder ob es dafür etwas Fertiges gibt, das
wir einbinden können.

Kurzfassung: **Ja, es lohnt sich – aber nicht als Seitenbaukasten.** Ein
Blockeditor deckt den tatsächlichen Bedarf ab, ist etwa ein Drittel billiger
als ein Baukasten und für die Zielgruppe deutlich besser bedienbar. Puck
(MIT-Lizenz) wäre technisch die richtige Wahl, *wenn* wir einen echten Baukasten
wollten – wir wollen ihn aber aus gutem Grund nicht.

---

## 1. Was der andere Verein tatsächlich hat

vuozvolc.de läuft auf **WordPress mit Divi** (Elegant Themes). Struktur:

| | |
|---|---|
| Menüpunkte | 5 (Startseite, Aktive Mitglieder, Info mit Untermenü, Forum, Termine) |
| Seiten | ~12–15 |
| Inhaltstypen | Fließtext, Bilder, Mitgliederliste, Terminliste |
| Forum | separat unter forum-vuozvolc.de, **funktioniert derzeit nicht** |

Die sieben Info-Seiten behandeln Ernährung im 13. Jahrhundert, Kleidung, Textil-
handwerk und Ähnliches. Das ist **Prosa mit Bildern**. Kein einziges Element
darauf verlangt freie Positionierung, mehrspaltige Rasterlayouts oder eigene
CSS-Klassen.

Das ist der wichtigste Befund dieser Analyse: Der Bedarf ist ein *Textsystem*,
kein *Layoutsystem*.

## 2. Was DileHi heute kann – und was nicht

**Schon in der Datenbank, also pro Verein änderbar:**
Galeriebilder, Seitenbilder, Besucher-Highlights, Quellenangaben, Termine,
Formulare, Mitglieder, Abstimmungen, Beiträge, Forum, Steckbriefe.

**Noch fest im Code:**

| Was | Wo | Umfang |
|---|---|---|
| Die 8 öffentlichen Seiten | `src/pages/*.tsx` | ~2.670 Zeilen |
| Alle Texte und Überschriften | in denselben Dateien | – |
| Menü | Array in `src/components/Layout.tsx` | 7 Einträge |
| Farben | `src/index.css` | CSS-Variablen |
| SEO je Seite | jede Seite einzeln | – |

**Eine Besonderheit:** `app_settings` enthält bereits `org_name`, `logo_path`,
`color_primary` und `color_dark` – aber **nichts im Frontend liest diese
Spalten**. Die Tabelle steht, die Verkabelung fehlt. Das ist billiger
nachzuholen, als es klingt.

## 3. Gibt es etwas Fertiges?

Ja, drei ernstzunehmende Kandidaten. Alle sind quelloffen und ohne Zwang zu
einem Anbieter.

| | Lizenz | Passt zu unserem Stack | Reife |
|---|---|---|---|
| **Puck** (`@puckeditor/core`) | MIT | React, genau unser Fall | eigens dafür gemacht |
| **Craft.js** | MIT | React, aber Baukasten für Baukästen | mehr Eigenbau nötig |
| **GrapesJS** | BSD-3 | Vanilla JS, nicht React | am größten, am fremdesten |

**Puck** wäre die Wahl. Es ist eine React-Komponente, die *unsere eigenen*
Komponenten als Bausteine benutzt, exportiert reines JSON, hat eine
Lokalisierung für die Oberfläche und bindet uns an nichts. Der Paketname hat
gewechselt (`@measured/puck` → `@puckeditor/core`), was für eine junge
Bibliothek normal ist, aber ein Hinweis auf Bewegung im Projekt.

**Warum ich trotzdem davon abrate**, obwohl es Arbeit sparen würde:

1. **Ein Baukasten erlaubt kaputte Seiten.** Wer Blöcke frei ziehen darf,
   erzeugt Seiten, die auf dem Handy zerfallen. Bei einem Verein, in dem eine
   Person nebenbei die Website macht, landet das bei uns im Support.
2. **Das Aussehen ist unser Argument.** Die Seite sieht heute nicht aus wie
   WordPress von 2005, weil Abstände, Typografie und Farben festliegen. Freie
   Positionierung gibt genau das auf.
3. **Die Zielgruppe.** Die Frage aus dem ursprünglichen Auftrag war, ob ein
   50-Jähriger alles bedienen kann. Eine Leinwand mit Ziehen und Ablegen ist
   das Gegenteil einer Antwort darauf.
4. **Wir schleppen es mit.** Jede fremde Editor-Bibliothek ist eine
   Abhängigkeit, die bei jedem React-Update mitgezogen werden muss – zusätzlich
   zu Tiptap, das wir schon haben.

Punkt 1 und 3 sind die eigentlichen. Punkt 4 ist Beiwerk.

## 4. Was ich stattdessen vorschlage: ein Blockeditor

Eine Seite ist **Titel + SEO + eine geordnete Liste von Blöcken**. Keine
Leinwand, kein Ziehen über Koordinaten, keine Breakpoints. Blöcke kommen
untereinander, lassen sich hoch- und runterschieben und einzeln bearbeiten.

Die Blocktypen gibt es zum großen Teil schon als Komponenten:

| Block | Status |
|---|---|
| Text (Überschriften, Fließtext, Bilder, Tabellen, Listen) | **Tiptap ist da**, inkl. Bild-Upload |
| Bildergalerie | vorhanden (`gallery_images`) |
| Quellenangaben | vorhanden (`EpochSources`) |
| Besucher-Highlight | vorhanden (`VisitorHighlight`) |
| Bildnachweise | vorhanden (`ImageCredits`) |
| Nächste Veranstaltungen | vorhanden (Widget aus der Einbindung) |
| Kontaktformular / Mitglied werden | vorhanden (Module) |
| Titelbild mit Überschrift | neu, klein |
| Zwei Spalten Text/Bild | neu, klein |
| Kennzahlen-Kasten („Zeit / Region / Themen") | neu, klein |

Das ist der springende Punkt: **Wir haben die Bausteine schon.** Was fehlt, ist
die Verwaltung, die sie zu einer Seite zusammensetzt.

## 5. Aufwand

Geschätzt in Entwicklertagen für jemanden, der diese Codebasis kennt. Enthalten
ist jeweils Umsetzung, Migration und Test; nicht enthalten sind Abstimmung und
das Einspielen der Migrationen von Hand.

### Weg A – nur Erscheinungsbild, keine neuen Seiten

| Paket | Tage |
|---|---|
| `app_settings` im Frontend anwenden (Farben als CSS-Variablen, Logo, Favicon, Vereinsname, SEO-Vorgaben) | 1,5 |
| Menü aus der Datenbank statt aus dem Code | 1 |
| Texte der 8 Seiten aus dem Code in die Datenbank | 2,5 |
| **Summe** | **5** |

Ergebnis: Ein Verein kann Farben, Logo, Menü und alle Texte ändern – aber keine
Seite anlegen, die es bei uns nicht gibt. Für Vuozvolc mit seinen sieben
Info-Seiten reicht das **nicht**.

### Weg B – Blockeditor (Empfehlung)

| Paket | Tage |
|---|---|
| Datenmodell `pages` / `page_blocks`, Rechte, Entwurf/Veröffentlicht | 1 |
| Bestehende Komponenten als Blöcke kapseln | 2 |
| Drei neue Blöcke (Titelbild, Zwei-Spalter, Kennzahlen) | 1,5 |
| Editor-Oberfläche (Block hinzufügen, sortieren, löschen, Vorschau) | 3 |
| Öffentlicher Renderer, Routing, SEO je Seite | 1,5 |
| Menüverwaltung | 1 |
| Erscheinungsbild (wie Weg A) | 1,5 |
| Bestehende 8 Seiten in Blöcke überführen | 2 |
| **Summe** | **13,5** |

### Weg C – Puck einbinden

| Paket | Tage |
|---|---|
| Puck integrieren, eigene Komponenten als Puck-Konfiguration | 3 |
| Speichern, Routing, Rechte, Vorschau | 2 |
| Oberfläche eindeutschen | 1 |
| Menüverwaltung + Erscheinungsbild | 2,5 |
| Bestehende Seiten überführen | 2 |
| **Summe** | **10,5** |

Weg C ist billiger – **um drei Tage**. Dafür handelt man sich die vier Punkte
aus Abschnitt 3 dauerhaft ein. Drei Tage sind kein Preis, für den ich die
Bedienbarkeit hergeben würde.

### Was der andere Verein zusätzlich braucht

Unabhängig vom Weg, für die Standalone-Fassung ohnehin auf der Liste:

| Paket | Tage |
|---|---|
| `app_role`-Enum auflösen, eigene Rollen (schon geplant) | 2 |
| Modulschalter im Adminbereich (schon geplant) | 2 |
| Technischer Administrator (schon geplant) | 1,5 |
| SMTP statt Microsoft Graph (schon geplant) | 1,5 |
| Installationsroutine: Docker, Startdaten, Einrichtungsassistent | 4 |
| Umzug von WordPress: Texte und Bilder übernehmen | 1,5 |
| **Summe** | **12,5** |

## 6. Gesamtbild

| | Tage |
|---|---|
| Blockeditor (Weg B) | 13,5 |
| Standalone-Grundlagen | 12,5 |
| **Zusammen** | **26** |

Ein knapper Monat Entwicklungszeit für ein Produkt, das ein Verein selbst
aufsetzen und betreiben kann – mit Forum, Terminen, Mitgliederverwaltung,
Abstimmungen, Beiträgen und Website in einem. Das ist im Vergleich zu dem, was
WordPress plus phpBB plus Handarbeit kostet, kein schlechter Schnitt.

## 7. Risiken und offene Punkte

- **Der Umzug ist der unangenehme Teil, nicht der Editor.** Fünfzehn
  WordPress-Seiten mit gewachsenem HTML sauber zu übernehmen, ist Handarbeit.
  Die 1,5 Tage oben sind knapp kalkuliert.
- **Wer betreibt es?** Wir hosten nicht. Vuozvolc braucht jemanden, der eine
  Installation aufsetzt und aktuell hält. Ohne diese Person nützt das beste
  Produkt nichts – das gehört ins erste Gespräch, nicht ins letzte.
- **Lovable-Cloud.** Solange DileHi selbst dort läuft, ist der Weg nach draußen
  für uns nicht erprobt. Der erste Fremdverein wäre gleichzeitig der Test der
  Installationsroutine.
- **Die Schätzung ist eine Schätzung.** Erfahrungsgemäß trifft man bei
  Editoren die Hälfte der Arbeit erst beim Bauen an – die Vorschau, das
  Verhalten auf dem Handy, das Verhalten bei leeren Blöcken. Ich würde auf
  Weg B einen Puffer von 30 % rechnen, also eher 17 als 13,5 Tage.

## 8. Vorschlag zum Vorgehen

1. **Erst Weg A** (5 Tage). Er ist Voraussetzung für alles Weitere und liefert
   sofort etwas: DileHi wird von seinen eigenen Farben und Texten unabhängig.
2. **Dann eine echte Seite mit dem Blockeditor bauen**, bevor der Editor fertig
   ist – eine der sieben Info-Seiten von Vuozvolc als Muster. Zeigt binnen
   eines Tages, ob die Blocktypen reichen.
3. **Dann Weg B**, mit dem Wissen aus Schritt 2.
4. Puck bleibt der Rückfallplan, falls sich in Schritt 2 herausstellt, dass die
   Vereine doch freieres Layout brauchen. Die Blöcke aus Schritt 3 liessen sich
   in eine Puck-Konfiguration überführen – die Arbeit wäre nicht verloren.
