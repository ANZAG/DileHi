# Erste Schritte

Was jemand sieht, der zum ersten Mal im Mitgliederbereich steht.

| Datei / Tabelle                    | Inhalt                                             |
| ---------------------------------- | -------------------------------------------------- |
| `onboarding_schritte`              | Die Inhalte. Pflegbar unter Verwaltung → System.    |
| `onboarding_hilfe`                 | Die Erklärungen hinter dem Fragezeichen am Feld.    |
| `onboarding_erledigt()`            | Woran die Anwendung erkennt, dass etwas getan ist.  |
| `useOnboarding.ts`                 | Der Stand für die angemeldete Person.               |
| `NeuHier.tsx`                      | Das Angebot als Streifen, und das Fragezeichen.     |
| `OnboardingTour.tsx`               | Die Führung mit Hervorhebung.                       |
| `ErsteSchritte.tsx`                | Die Aufgabenliste im Profil.                        |
| `Hilfe.tsx`                        | Das Fragezeichen am Feld.                           |

## Zwei Ebenen

**Der Rundgang** (`tour = 'start'`) geht einmal über die Startseite, in
Lesereihenfolge, mit ein bis zwei Sätzen je Bereich. Er wechselt die Seite
nicht — wer zwölfmal umgeleitet wird, hat danach keinen Überblick, sondern
Kopfschmerzen. Der letzte Schritt springt ins Profil, weil das der erste
sinnvolle Handgriff ist.

**Die Bereichstouren** erklären, wie man in einem Bereich arbeitet, und laufen
nur dort:

| Tour              | Wo                        | Für wen                       |
| ----------------- | ------------------------- | ----------------------------- |
| `veranstaltungen` | Veranstaltungen           | alle                          |
| `anmeldeformular` | Formularbauer             | `events.moderate`             |
| `auswertung`      | Anmeldungen               | `events.moderate`             |
| `abstimmungen`    | Abstimmungen              | `elections.manage`            |
| `verwaltung`      | Verwaltung                | `admin.access` und mehr       |
| `seiten`          | Seiteneditor              | `site.content_edit`           |

Was selbsterklärend ist — Forum, Versammlungen, Dokumente, Quellensammlung,
Mitgliederkarte — wird im Rundgang genannt und bekommt keine eigene Tour.

Ihre Schritte haben **keine Route**. Eine Bereichstour läuft dort, wo sie
gestartet wurde; mit einer Route hätte der Schritt über die Speicherleiste den
Formularbauer verlassen, in dem er gerade erklärt, worauf man beim Speichern
achten muss. Navigieren ist Sache des Rundgangs, und selbst der tut es nur
einmal, ganz am Ende.

## Erklärt wird am Bildschirm, nicht an Bildern

Die Veranstaltungstour öffnet den obersten echten Termin und erklärt daran.
Ein Bildschirmfoto wäre einfacher gewesen und dreimal falsch: Es veraltet mit
der nächsten Änderung, zeigt unsere Farben statt der des Vereins und unsere
Beispieldaten statt seiner.

Damit ein Anker sichtbar wird, der hinter einem Reiter oder in einem
zugeklappten Eintrag liegt, sagt die Führung vorher an, worauf sie zielt (siehe
unten). Die Terminliste hört zu und klappt den obersten Termin auf, die
Verwaltung öffnet den passenden Reiter.

Die erste Fassung hatte beides in einer Kette: dreißig Schritte quer durch die
Anwendung. Schritt 2 war eine Aufgabe im Profil, Schritt 3 eine
Bereichsvorstellung, Schritt 5 wieder eine Aufgabe im Profil. Jeder Schritt war
für sich richtig, und niemand hatte die Reihenfolge je als Erzählung gelesen.

## Wie eine Tour angeboten wird

Nichts startet von selbst. Stattdessen steht über dem Inhalt ein Streifen:

```tsx
<NeuHier tour="veranstaltungen" text="Neu hier? Zwei Minuten, dann weisst du, wie das läuft." />
```

Er erscheint nur, solange die Tour unberührt ist. Wer einen Schritt gesehen
oder das Angebot weggeklickt hat, bekommt ihn nicht wieder. Erreichbar bleibt
die Tour über das Fragezeichen im Kopf des Bereichs:

```tsx
<TourKnopf tour="veranstaltungen" />
```

Ein Streifen fragt, ein Overlay übernimmt. Wer gerade etwas vorhatte, soll
weiterarbeiten können.

## Warum eine Aufgabe kein Kästchen hat

Ein Schritt mit `aufgabe` ist etwas, das jemand tut. Ob es getan ist, weiß die
Datenbank: Der Name steht da, ein Zelt ist eingetragen, es gibt eine Zusage.
`onboarding_erledigt()` sieht nach.

Deshalb gibt es dort nichts zum Anklicken. Ein Häkchen, das man setzen kann,
ohne die Sache getan zu haben, wäre nur eine höflichere Diashow.

Wen eine Aufgabe nicht betrifft, der blendet sie aus. Die Aufgabenliste steht
im Profil, nicht auf der Startseite: Die meisten Punkte erledigt man genau
dort, und die Startseite soll den Überblick zeigen und keine Hausaufgaben.

Die **Einrichtungsaufgaben** eines frisch aufgesetzten Vereins — Logo, Name,
erste Seite, erstes Mitglied — stehen bewusst nicht in dieser Liste. Das ist
die Installation und nicht die Sache eines Mitglieds; sie bekommt einen
eigenen Ablauf.

## Einen Schritt hinzufügen

Eine Zeile in `onboarding_schritte`:

| Spalte    | Bedeutung                                                         |
| --------- | ----------------------------------------------------------------- |
| `tour`    | Zu welcher Führung er gehört: `start` oder ein Bereichsname.       |
| `recht`   | Nur mit diesem Recht sichtbar. Leer = für alle.                    |
| `modul`   | Nur bei eingeschaltetem Modul. Leer = immer.                       |
| `anker`   | Das Element mit `data-tour="<anker>"` wird hervorgehoben.          |
| `route`   | Auf welcher Seite der Schritt liegt.                               |
| `aufgabe` | Gesetzt = echte Aufgabe. Braucht einen Zweig in `onboarding_erledigt()`. |

Es gibt **keine** Rollenabfrage. Wer eine eigene Rolle „Zeugwart" anlegt und
ihr das passende Recht gibt, bekommt den Schritt.

Bei Aufgaben lieber großzügig prüfen. Eine Aufgabe, die sich nie abhaken lässt,
weil ein selten benutztes Feld fehlt, ist schlimmer als gar keine.

## Einen Anker setzen

`data-tour="..."` an das Element, das gemeint ist. Findet die Führung den Anker
nicht, steht die Karte in der Mitte — ein fehlender Anker ist ein
Schönheitsfehler, kein Fehler.

Liegt das Ziel hinter einem Reiter (die Kacheln der Verwaltung), muss dieser
sich öffnen. Dafür sagt die Führung vorher an, worauf sie zielt:

```ts
window.dispatchEvent(new CustomEvent("tour-anker", { detail: { anker } }));
```

Die Verwaltung hört zu und öffnet den passenden Reiter. Wer nichts damit
anfangen kann, ignoriert es.

## Hilfe am Feld

```tsx
<Label>Zeltmasse <Hilfe k="zeltmasse" /></Label>
```

Zwei Sätze dort, wo die Frage entsteht. Gibt es zum Schlüssel keinen Text,
erscheint gar nichts: Ein Fragezeichen, das nichts erklärt, ist schlimmer als
keines.

## Was gemerkt wird, und wo

Alles in `user_tours`, also in der Datenbank und nicht im Browser. Ein
Gerätewechsel soll die Einführung weder zurückholen noch verlieren.

| Schlüssel         | Bedeutung                                    |
| ----------------- | -------------------------------------------- |
| `<key>`           | Diesen Schritt hat die Person gesehen.       |
| `aufgabe:<key>`   | Diese Aufgabe betrifft sie nicht.            |
| `streifen:<tour>` | Das Angebot in diesem Bereich ist weg.       |

## Warum die Inhalte in der Datenbank stehen

Solange die Texte im Quelltext standen, war die Einführung für jeden anderen
Verein falscher Inhalt: unsere Formulierungen über unsere Bereiche.

Nicht anpassbar sind `tour`, `recht`, `modul`, `anker`, `route` und `aufgabe`.
Das sind Verkabelungen zum Programm, keine Inhalte — ein Anker, den jemand
umbenennt, zeigt auf nichts mehr. Zu jedem Text gibt es einen Weg zurück auf
den Auslieferungszustand.

## Was der Test prüft

`src/test/onboarding.test.ts` vergleicht die Migration mit dem Markup: zu jedem
Anker ein Element, zu jeder Aufgabe ein Zweig in `onboarding_erledigt()`, zu
jedem Zeichennamen ein Zeichen. Dazu zwei Dinge, die nicht zurückkommen
sollen: kein Start von selbst, kein Abhaken von Hand — und dass der Rundgang
die Kacheln in genau der Reihenfolge hervorhebt, in der sie auf der Startseite
stehen.

Siehe auch [module.md](module.md) — ein Schritt zu einem abgeschalteten Modul
wird nicht gezeigt.
