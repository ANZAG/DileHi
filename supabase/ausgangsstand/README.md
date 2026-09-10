# Ausgangsstand

Eine leere Datenbank zu einer lauffähigen DING-Installation machen.

## Warum es das gibt

Die Migrationen unter `../migrations/` können die Datenbank nicht vollständig
aufbauen: `role_catalog` und `permission_catalog` werden dort befüllt und
abgefragt, aber nirgends angelegt. Fünf Funktionen fehlten ebenfalls; die sind
inzwischen nachgetragen.

Für die laufende Installation ist das folgenlos — sie steht ja. Für eine zweite
nicht: Wer die Migrationen der Reihe nach einspielt, bekommt eine Datenbank, in
der die Rechteverwaltung nicht lädt.

Das ist zugleich die Antwort auf die Frage nach dem „Squash". Beides ist
dieselbe Aufgabe, und der Anlass ist nicht die Zahl der Dateien, sondern dass
sie nicht ausreichen.

## Der Weg

**Eine** Abfrage in der alten Datenbank, **eine** Datei als Ergebnis. Wie und
warum: [EXPORT.md](EXPORT.md).

Der erste Anlauf ging über vier getrennte Abfragen. Drei davon liegen vor, aber
aus zwei verschiedenen Momenten — dazwischen liefen Migrationen, und die
Rechtedatei vergibt Rechte auf eine Funktion, die der Aufbau nicht anlegt. Ein
Abzug ist eine Momentaufnahme; vier Momentaufnahmen aus vier Momenten sind
keine. Deshalb jetzt alles in einem Zug.

## Wohin die Datei kommt

Nach `../migrations/00000000000000_ausgangsstand.sql` — nicht in diesen Ordner.
Damit wird sie zur ersten Migration, und eine neue Installation ist ein
Knopfdruck auf den Arbeitsablauf „Supabase ausrollen" statt einer Reihe von
Einfügungen im SQL-Editor.

Die bisherigen Migrationen wandern gleichzeitig ins Archiv. Beides zusammen
stehen zu lassen ginge nicht: Eine neue Installation liefe erst den
Ausgangsstand und danach achtzig Schritte, die dasselbe noch einmal anlegen
wollen.

## Erst prüfen, dann tauschen

Auf einem leeren Supabase-Projekt durchspielen, siehe
[../../docs/installation.md](../../docs/installation.md). Erst wenn dort eine
Anmeldung gelingt, ist der Ausgangsstand mehr als eine gut aussehende
Behauptung.
