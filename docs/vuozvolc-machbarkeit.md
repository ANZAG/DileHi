# Vuozvolc mit unserem Baukasten — was ginge, was fehlt

Analyse von [vuozvolc.de](https://vuozvolc.de) am 10.09.2026, Seite für Seite
durchgesehen. Ziel: Bevor wir die Seite nachbauen, wissen, ob unsere Bausteine
reichen.

## Was dort steht

WordPress mit dem Theme **Divi 4.27.1**. Dreizehn Inhaltsseiten, drei
Rechtsseiten, dazu ein externes Forum unter `forum-vuozvolc.de`.

Bemerkenswert ist, wie **wenig** Divi dort genutzt wird. Über die ganze Seite
kommen nur drei Bausteintypen vor: Text, Bild, Trennlinie. Kein Slider, keine
Akkordeons, keine Reiter, keine Zähler. Das ist eine gute Nachricht — die Seite
ist inhaltlich reich und technisch schlicht.

| Seite | Aufbau | Umfang |
| --- | --- | --- |
| Startseite | Zwei Abschnitte: Willkommen mit zwei Bildern, „Was wir sind" | ~2.000 Zeichen |
| Aktive Mitglieder | Raster aus ~30 Personen: Bild, Name, Fähigkeit | 30 Bilder |
| Die Ernährung im 13./14. Jh. | Artikel, 5 Zwischenüberschriften, 2 Bilder, Quellenbelege | ~8.400 Zeichen |
| Männerkleidung | Artikel | mittel |
| Frauenkleidung | Artikel | mittel |
| Naalbinding / Nadelbinden | Artikel, 4 Bilder | ~3.100 Zeichen |
| Still- und Schwangerschaftskleidung | Erfahrungsbericht | mittel |
| Ausrüstungsleitfaden | Fliesstext | ~3.100 Zeichen |
| Historie der Gruppe | 18 Jahreseinträge, 2007 bis 2025 | ~4.600 Zeichen |
| Termine | Vier Jahre, Datum plus Veranstaltung | ~1.500 Zeichen |
| Kontakt | Formular: Name, E-Mail, Nachricht, Rechenaufgabe | — |
| Impressum, Datenschutz, Cookie-Richtlinie | Rechtstexte | — |

Ein wiederkehrendes Gestaltungsmittel: Über jeder Überschrift steht ein
**lateinisches Schlagwort in Kapitälchen** — PROMPTUS, SOCIUS, SOCIUS GREX,
INSTITUTIONES, CONTACTUS —, darunter eine Trennlinie, dann die Überschrift. Das
ist ihre Handschrift, auf jeder Seite.

**Gestaltung:** Fliesstext Open Sans 14 px in Grau (#666), Überschriften Antic
Didone in Dunkelgrau (#333), Abschnittsflächen in warmem Creme (#faf2e9), Logo
als Rasterbild in der Kopfzeile.

## Was unsere Bausteine abdecken

| Ihre Seite | Unser Baustein | Passt |
| --- | --- | --- |
| Startseite | Seitenkopf, Textabschnitt, Einzelbild | ja |
| Artikel (fünf Stück) | Seitenkopf, Textabschnitt, Einzelbild, Text neben Bild | ja |
| Ausrüstungsleitfaden | Textabschnitt | ja |
| Historie der Gruppe | **Zeitstrahl** (Titel, Zeitraum, Untertitel, Bild) | ja, besser als dort |
| Aktive Mitglieder | **Karten** (Titel, Text, Bild, Verweis) | ja, aber siehe unten |
| Kontakt | **Kontaktformular** | ja, besser als dort |
| Impressum, Datenschutz | Vereinsangaben, Textabschnitt | ja |
| Termine | **Termine** — zieht kommende Termine aus dem Modul | anders, siehe unten |

**Gestaltung:** Open Sans steht in unserer Schriftauswahl. Antic Didone nicht —
dazu unten. Das warme Creme der Flächen ist seit der Kastenfarbe einstellbar.
Logo, Farben, Schriften kommen ohnehin aus den Vereinsangaben.

## Drei Lücken, und was sie wirklich bedeuten

### 1. Die Oberzeile — echte Lücke, kleiner Aufwand

PROMPTUS, SOCIUS, INSTITUTIONES: ein kurzes Schlagwort in Kapitälchen über der
Überschrift. Steht auf **jeder** Seite und ist das Erkennungsmerkmal ihrer
Gestaltung. Unsere Bausteine `Seitenkopf` und `Ueberschrift` haben dafür kein
Feld.

Ein Textfeld plus ein wenig CSS. Der kleinste der drei Punkte und der mit der
grössten Wirkung aufs Ergebnis — ohne ihn sieht der Nachbau fremd aus, obwohl
jeder Absatz stimmt.

### 2. Aktive Mitglieder — geht, aber von Hand

Der Baustein `Karten` kann Bild, Titel und Textzeile. Dreissig Karten
einzutippen und dreissig Bilder hochzuladen ist allerdings der grösste
Einzelposten der ganzen Übung.

Die Frage dahinter ist wichtiger als der Aufwand: Wir haben das schon einmal
gebaut, als **Darstellungssteckbriefe**. Dort pflegt jedes Mitglied seinen
eigenen Eintrag, der Vorstand gibt frei, und die öffentliche Übersicht entsteht
von selbst. Nur zeigen wir dort bewusst **keine Namen** — bei Vuozvolc ist der
Name gerade der Punkt.

Also kein neuer Baustein, sondern ein Schalter am vorhandenen: „Namen zeigen".
Dann pflegt sich die Seite selbst, statt einmal abgetippt zu werden.

### 3. Termine — kein Mangel, ein Unterschied

Ihre Terminseite ist eine von Hand gepflegte Liste, nach Jahr gruppiert, mit
Vergangenem als Archiv. Unser Baustein zeigt die **kommenden** Termine aus dem
Veranstaltungsmodul.

Das ist kein Rückschritt, sondern der Grund, warum man so ein System einsetzt:
Ein Termin wird einmal angelegt und steht dann auf der Website, im Kalenderabo
und in der Anmeldung. Was fehlt, ist die Rückschau — ein Schalter „auch
vergangene zeigen, nach Jahr gruppiert" am Termin-Baustein.

Für den Nachbau reicht zur Not ein Textabschnitt.

### Antic Didone

Die Überschriftenschrift steht nicht in unserer Auswahl. Sie liegt bei Google
Fonts unter der SIL Open Font License, ist also unbedenklich —
Aufnahme heisst: eine Zeile in `src/lib/schriften.ts`.

Wenn ein Verein eine Schrift will, die wir nicht anbieten, ist das der
Normalfall und keine Ausnahme. Die Liste sollte wachsen dürfen.

## Einschätzung

**Die Bausteine reichen.** Von dreizehn Seiten lassen sich elf ohne jede
Änderung bauen, zwei brauchen einen Schalter, und ein Gestaltungsmerkmal fehlt.
Nichts davon ist ein Umbau.

| Arbeit | Aufwand |
| --- | --- |
| Oberzeile an Seitenkopf und Überschrift | klein |
| Schalter „Namen zeigen" an den Darstellungen | klein |
| Schalter „auch vergangene Termine" | klein |
| Antic Didone in die Schriftauswahl | winzig |
| Die dreizehn Seiten mit Inhalt füllen | der eigentliche Posten |

Der Aufwand liegt nicht im Baukasten, sondern im Abtippen — wie ich es in der
Machbarkeitsanalyse vom 8. September schon vermutet hatte (die Datei ist
am 17. September gelöscht worden, sie steht in der Git-Historie):
„Der Umzug ist der unangenehme Teil, nicht der Editor."

## Stand: die vier Vorarbeiten sind erledigt

| Arbeit | Wie umgesetzt |
| --- | --- |
| Oberzeile | Feld an „Seitenkopf" und „Überschrift". Leer bleibt leer, kein Platzhalter |
| Namen an den Darstellungen | **Zwei** Schalter: die Person stimmt im eigenen Steckbrief zu, der Verein schaltet es am Baustein ein. Beides muss zutreffen |
| Vergangene Termine | Auswahl am Termin-Baustein: nur Kommendes, oder ein bis zehn Jahre zurück. Mit Rückschau nach Jahr gruppiert |
| Antic Didone | In der Schriftauswahl, selbst ausgeliefert wie die übrigen |

Zum zweiten Punkt: Ein Name im Netz ist die Entscheidung der Person, nicht des
Vereins. Ein Schalter am Baustein allein hätte gereicht, um die Seite zu bauen
— und hätte dreissig Namen veröffentlicht, ohne dass jemand gefragt wurde. Die
Vorgabe ist „nein"; wer nichts tut, steht nicht mit Namen im Netz.

## Vorschlag zum Vorgehen

1. ~~Die drei Schalter und die Schrift bauen.~~ Erledigt.
2. ~~**Zwei Seiten bauen**, die verschiedenste: die Startseite und „Die
   Ernährung im 13./14. Jahrhundert".~~ Erledigt — und gleich alle elf, siehe
   unten.
3. **Die Texte einsetzen.** Ab hier ist es Fleissarbeit ohne
   Erkenntnisgewinn — und der einzige Teil, der noch fehlt.

## Der Nachbau steht (17. September)

[`vuozvolc-aufbau.sql`](vuozvolc-aufbau.sql) legt im Projekt DING elf Seiten
an, dazu das Menü, 92 Bildplätze und die Gestaltung. Es ist **keine
Migration**: Migrationen laufen in jeder Installation, auch in DileHis
Datenbank, und dort haben Vuozvolcs Seiten nichts zu suchen. Das Skript
weigert sich von selbst, wenn schon ein Verein in der Datenbank steht.

**Die Texte sind echt und wortgetreu.** Grundlage ist der HTML-Abzug der Seite
vom 17. September. Übernommen sind Absätze, Zwischenüberschriften, Listen,
Hervorhebungen, Literaturangaben und die Autorenzeilen. Die Zeichenzahlen
decken sich mit der Analyse oben — Ernährung 8.351 (geschätzt 8.400),
Ausrüstungsleitfaden 3.100 (3.100), Historie 4.593 (4.600), Naalbinding 3.138
(3.100). Das ist die beste Bestätigung, dass nichts verlorengegangen ist.

Auch die Oberzeilen stehen: `promptus`, `socius`, `socius grex`, `contactus`,
`historia`, `institutiones`, `NAAL OBLIGATIO`, `MATERNITAS VESTIMENTUM`,
`Mulierum indumentis in Saeculum 13`. Und zwar nicht nur oben, sondern auch
mitten auf der Seite, wo ein Schlagwort zur Überschrift unter ihm gehört
(„über uns / Was wir sind" auf der Startseite). Genau das war die Lücke, die
diese Analyse als „die mit der grössten Wirkung aufs Ergebnis" bezeichnet hat.

**Die Frage ist beantwortet:** Fünf Bausteintypen tragen alle elf Seiten —
Seitenkopf, Überschrift, Textabschnitt, Einzelbild, Karten. Kein neuer war
nötig, keiner musste geändert werden.

### Zwei Dinge sind mit Absicht anders

**Die Vornamen der Mitglieder sind erfunden.** Die Fertigkeiten stehen
wortgetreu da — die gehören der Gruppe, nicht einer Person —, die Namen nicht.
Ein Name im Netz ist die Entscheidung dessen, der ihn trägt, und für eine
Vorführung braucht es ihn nicht. „Dein Name?" und „unser Nachwuchs" sind keine
Namen und stehen unverändert da. Eine Prüfung hält fest, dass kein echter
Vorname aus der Vorlage im Skript landet.

Für die echte Installation bleibt es beim Steckbrief-Weg: Jede Person pflegt
ihren Eintrag selbst und entscheidet selbst über ihren Namen, der Verein
schaltet die Namen am Baustein frei. Beides muss zutreffen. Das Umstellen ist
ein Baustein-Tausch im Editor.

**Die Bilder fehlen.** 92 Plätze sind angelegt, mit sprechenden Schlüsseln aus
den Dateinamen der Vorlage; die Dateien selbst gehören Vuozvolc und werden
nicht mitkopiert. Wo ein Bild war, ist ein leerer Platz — der Aufbau der Seite
bleibt sichtbar, und das Hochladen ist ein Klick je Bild.

**Impressum, Datenschutz und Cookie-Richtlinie sind nicht übernommen.** Die
baut DING aus den Vereinsangaben; eine fremde Rechtsseite zu kopieren wäre in
jeder Hinsicht falsch.

### Geprüft, nicht vermutet

Ausgangsstand und alle 29 Migrationen laufen in eine frische PostgreSQL 16,
dann das Skript: 13 Seiten, 121 Bausteine, fehlerfrei. Dabei kamen zwei Fehler
heraus, die kein Nachdenken gefunden hätte:

- `site_menu_target_check` verlangt von **jedem** Menüpunkt genau ein Ziel,
  auch von einem, der bloss ein Untermenü aufklappt. „Info" zeigt deshalb
  selbst auf den ersten Artikel.
- Die Oberzeile steht je nach Seite **vor oder hinter** der Überschrift. Sie
  ist am `<h4>` zu erkennen, nicht an ihrer Stelle. Beim ersten Anlauf trug
  „Kontakt" das Schlagwort als Überschrift und umgekehrt.

Was bleibt: der Blick darauf im Browser. Dafür muss das Skript erst in das
Projekt DING.
