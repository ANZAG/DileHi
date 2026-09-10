# Erste Schritte

Was neue Mitglieder und ein frisch aufgesetzter Verein als Erstes sehen.

| Datei                              | Inhalt                                             |
| ---------------------------------- | -------------------------------------------------- |
| `onboarding_schritte` (Tabelle)    | Die Inhalte. Pflegbar unter Verwaltung → System.    |
| `onboarding_hilfe` (Tabelle)       | Die Erklärungen hinter dem Fragezeichen.            |
| `onboarding_erledigt()` (Funktion) | Woran die Anwendung erkennt, dass etwas getan ist.  |
| `useOnboarding.ts`                 | Der Stand für die angemeldete Person.               |
| `ErsteSchritte.tsx`                | Die Aufgabenliste auf der Startseite.               |
| `OnboardingTour.tsx`               | Die Führung mit Hervorhebung, auf Aufforderung.     |
| `icons.ts`                         | Name aus der Datenbank → Zeichen.                   |
| `Hilfe.tsx`                        | Das Fragezeichen am Feld.                           |

## Aufgaben statt Diashow

Die erste Fassung war eine Reihe von Fenstern in der Bildschirmmitte. Wer sie
durchklickte, hatte elf Texte gelesen und danach dieselbe unerklärte Oberfläche
vor sich. Beim zweiten Anmelden war nichts mehr da.

Jetzt gibt es zwei Dinge, und das wichtigere ist die Liste:

**Die Aufgabenliste** steht auf der Startseite des Mitgliederbereichs und
zeigt, was noch zu tun ist. Sie verschwindet, wenn alles erledigt ist, und
kommt wieder, wenn etwas dazukommt. Das ist ihr eigentlicher Vorteil: Sie ist
beim zweiten und dritten Anmelden noch da.

**Die Führung** startet nur, wenn jemand sie startet – über „Zeigen" an einer
Aufgabe oder den Knopf im Profil. Sie hebt das Element hervor, von dem sie
spricht, statt in der Mitte davon zu erzählen.

## Warum eine Aufgabe kein Kästchen hat

Ein Schritt mit `aufgabe` ist etwas, das jemand tut. Ob es getan ist, weiß die
Datenbank: Das Profil hat Vor- und Nachnamen und einen Ort, es gibt ein
eingetragenes Zelt, es gibt eine Zusage. `onboarding_erledigt()` sieht nach.

Deshalb gibt es dort nichts zum Anklicken. Ein Häkchen, das man setzen kann,
ohne die Sache getan zu haben, wäre nur eine höflichere Diashow.

Wen eine Aufgabe nicht betrifft – kein Zelt, kein Interesse am Steckbrief –
der blendet sie aus. Das steht in `user_tours` mit dem Präfix `aufgabe:`.

## Einen Schritt hinzufügen

Eine Zeile in `onboarding_schritte`. Die Spalten, die zählen:

| Spalte    | Bedeutung                                                         |
| --------- | ----------------------------------------------------------------- |
| `recht`   | Nur mit diesem Recht sichtbar. Leer = für alle.                    |
| `modul`   | Nur bei eingeschaltetem Modul. Leer = immer.                       |
| `anker`   | Das Element mit `data-tour="<anker>"` wird hervorgehoben.          |
| `aufgabe` | Gesetzt = echte Aufgabe. Braucht einen Zweig in `onboarding_erledigt()`. |

Es gibt **keine** Rollenabfrage. Wer eine eigene Rolle „Zeugwart" anlegt und
ihr das passende Recht gibt, bekommt den Schritt, ohne dass am Programm etwas
geändert wird.

Für eine neue **Aufgabe** kommt ein Zweig in `onboarding_erledigt()` dazu. Das
ist die einzige Stelle, an der eine Aufgabe mit der Wirklichkeit verbunden
wird – und die einzige, die dafür Programmcode braucht.

Bei Aufgaben lieber großzügig prüfen. Eine Aufgabe, die sich nie abhaken lässt,
weil ein selten benutztes Feld fehlt, ist schlimmer als gar keine.

## Einen Anker setzen

`data-tour="..."` an das Element, das gemeint ist. Findet die Führung den Anker
nicht, steht die Karte in der Mitte – ein fehlender Anker ist ein
Schönheitsfehler, kein Fehler.

Liegt das Ziel hinter einem Reiter (die Kacheln der Verwaltung), muss dieser
sich öffnen. Dafür sagt die Führung vorher an, worauf sie zielt:

```ts
window.dispatchEvent(new CustomEvent("tour-anker", { detail: { anker } }));
```

Die Verwaltung hört zu und öffnet den passenden Reiter. Wer nichts damit
anfangen kann, ignoriert es. Ein Sonderfall in der Führung wäre der falsche
Ort dafür.

## Hilfe am Feld

```tsx
<Label>Zeltmasse <Hilfe k="zeltmasse" /></Label>
```

Zwei Sätze dort, wo die Frage entsteht. Gibt es zum Schlüssel keinen Text,
erscheint gar nichts: Ein Fragezeichen, das nichts erklärt, ist schlimmer als
keines. Die Texte stehen in `onboarding_hilfe` und lassen sich in der
Verwaltung anpassen.

## Warum die Inhalte in der Datenbank stehen

Solange die Texte im Quelltext standen, war das Onboarding für jeden anderen
Verein falscher Inhalt: unsere Formulierungen über unsere Bereiche. Ein Verein
mit anderen Worten für seine Dinge muss sie hinschreiben können, ohne den
Quelltext anzufassen.

Nicht anpassbar sind `recht`, `modul`, `anker` und `aufgabe`. Das sind
Verkabelungen zum Programm, keine Inhalte – ein Anker, den jemand umbenennt,
zeigt auf nichts mehr. Zu jedem Text gibt es einen Weg zurück auf den
Auslieferungszustand.

## Was der Test prüft

`src/test/onboarding.test.ts` vergleicht die Migration mit dem Markup: zu jedem
Anker ein Element, zu jeder Aufgabe ein Zweig in `onboarding_erledigt()`, zu
jedem Zeichennamen ein Zeichen. Dazu die drei Fehler der Vorgängerfassung, die
nicht zurückkommen sollen: kein Start von selbst, kein Verbrennen des Rests
beim Schliessen, kein Abhaken von Hand.

Siehe auch [module.md](module.md) – ein Schritt zu einem abgeschalteten Modul
wird nicht gezeigt.
