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

## Das Gerüst steht (17. September)

[`vuozvolc-aufbau.sql`](vuozvolc-aufbau.sql) legt im Projekt DING elf Seiten
an, dazu das Menü, die Bildplätze und die Gestaltung. Es ist **keine
Migration**: Migrationen laufen in jeder Installation, auch in DileHis
Datenbank, und dort haben Vuozvolcs Seiten nichts zu suchen. Das Skript
weigert sich von selbst, wenn es eine Datenbank vor sich hat, in der schon ein
Verein steht.

**Der Aufbau ist echt, der Text ist es nicht.** Jeder Absatz trägt einen
Platzhalter. Der Grund ist unangenehm einfach: `vuozvolc.de` ist aus der
Umgebung, in der das Skript entstanden ist, nicht erreichbar — der Egress-Proxy
lässt die Adresse nicht durch. Erfundene Fliesstexte wären schlimmer als
sichtbar leere; man sieht ihnen nicht an, dass sie erfunden sind. Was im Skript
steht, ist aus dieser Analyse abgeleitet und nachprüfbar; was hier nie stand,
steht auch dort nicht.

Für die Frage, um die es ging, reicht das: **Ob unsere Bausteine diese Seite
tragen, entscheidet ihr Aufbau, nicht ihr Wortlaut.** Sie tragen sie. Zehn
Bausteintypen genügen für alle elf Seiten — Seitenkopf, Überschrift,
Textabschnitt, Einzelbild, Trennlinie, Willkommen, Zeitstrahl, Darstellungen,
Termine, Kontaktformular. Kein neuer war nötig.

Ausprobiert wurde es nicht im Kopf: Ausgangsstand und alle 29 Migrationen
liefen in eine frische PostgreSQL-16-Datenbank, dann das Skript. Dabei kam ein
Fehler heraus, den kein Nachdenken gefunden hätte — `site_menu_target_check`
verlangt von **jedem** Menüpunkt genau ein Ziel, auch von einem, der nur ein
Untermenü aufklappt. Der Punkt „Wissenswertes" zeigt deshalb selbst auf den
längsten der Artikel.

Was danach von Hand kommt:

| Was | Warum nicht im Skript |
| --- | --- |
| Die Texte der elf Seiten | Siehe oben — die Quelle ist von hier nicht erreichbar |
| Die Bilder | 40 Plätze stehen bereit und heissen `vuozvolc-…`; die Dateien fehlen |
| Zwei Seiten | Die Analyse zählt dreizehn Inhaltsseiten, führt aber nur elf namentlich auf. Welche beiden fehlen, ist von hier aus nicht feststellbar |

### Das Mitgliederraster: dreissig erfundene Namen

Für die Vorführung steht auf „Aktive Mitglieder" der Baustein **Karten** mit
dreissig Einträgen — erfundene Namen im Klang der Zeit, je eine Fertigkeit,
je ein leerer Bildplatz (`vuozvolc-mitglied-01` bis `-30`).

Bewusst **nicht** über die Darstellungssteckbriefe, obwohl die dafür gebaut
sind. Ein Steckbrief gehört einer Person und trägt ihre Freigabe; dreissig
davon anzulegen hiesse, eine Einwilligung zu erfinden, die niemand gegeben
hat — in einem System, dessen ganzer Punkt ist, dass diese Freigabe echt ist.
Karten sind Seiteninhalt und als Attrappe erkennbar.

Für die echte Installation bleibt es beim Steckbrief-Weg: Jede Person pflegt
ihren Eintrag selbst und entscheidet selbst über ihren Namen, der Verein
schaltet die Namen am Baustein frei. Beides muss zutreffen. Das Umstellen ist
ein Baustein-Tausch im Editor.

Die Auszeichnungsfarbe (`color_primary`) ist im Skript **geraten**. Diese
Analyse hält für Vuozvolc keine fest, und eine gibt es dort kaum; das gedeckte
Braun ist ein Vorschlag und unter Erscheinungsbild in einem Klick geändert.

Was der Nachbau **nicht** beantwortet: ob Vuozvolc das will, wer die
Installation betreibt und ob sie ihr Forum aufgeben würden. Das gehört ins
erste Gespräch, nicht ins letzte.
