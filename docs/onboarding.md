# Erste Schritte

Die kurze Tour, die neue Mitglieder beim ersten Besuch im Mitgliederbereich
sehen. Sie liegt in `src/components/onboarding/`:

| Datei                | Inhalt                                                    |
| -------------------- | --------------------------------------------------------- |
| `schritte.ts`        | Was gezeigt wird. Nur Daten, kein Verhalten.               |
| `useTour.ts`         | Der Stand: was gilt, was ist offen, was wird gemerkt.      |
| `OnboardingTour.tsx` | Das Overlay beim ersten Besuch.                            |
| `ErsteSchritte.tsx`  | Die Liste auf der Startseite des Mitgliederbereichs.       |

Overlay und Liste holen ihren Stand beide aus `useTour`. Das ist Absicht: Sie
zeigen dasselbe an, und zwei getrennte Abfragen wären zwei Wahrheiten, die
irgendwann auseinanderlaufen. Ein Test hält das fest.

## Einen Schritt hinzufügen

Ein Objekt in die Liste `SCHRITTE` in `schritte.ts`, an die Stelle, an der er
in der Tour vorkommen soll. Mehr nicht.

```ts
{
  key: "inventar",
  gruppe: "verwalten",
  icon: PackageOpen,
  titel: "Inventar",
  text: "Was der Verein besitzt, wo es liegt und wer es gerade hat.",
  route: "/intern/inventar",
  recht: "inventory.manage",
  modul: "inventar",
}
```

`recht` und `modul` sind die einzigen Bedingungen. Fehlt eines von beiden,
gilt der Schritt für alle beziehungsweise immer. Es gibt keine Rollenabfrage:
Wer eine eigene Rolle „Zeugwart“ anlegt und ihr das Recht gibt, bekommt den
Schritt, ohne dass hier etwas geändert wird.

## Warum der Schlüssel wichtig ist

In `user_tours` steht je Person und Schritt eine Zeile, sobald sie ihn gesehen
hat. Deshalb gilt:

* Der `key` ändert sich **nie**, auch wenn Titel und Text neu geschrieben
  werden. Ein geänderter Schlüssel ist für die Datenbank ein neuer Schritt und
  wird allen noch einmal gezeigt.
* Ein **neu hinzugefügter** Schritt hat noch niemand gesehen und wird deshalb
  beim nächsten Besuch gezeigt – einzeln, nicht die ganze Tour noch einmal.
  Genau dafür ist die Ablage je Schritt da.

Wer die Tour über den Knopf im Profil neu startet, sieht wieder alles, was für
ihn in Frage kommt. Gelöscht wird dabei nichts.

## Die zwei Wege

* **Overlay.** Beim ersten Besuch im Mitgliederbereich, einmal je Sitzung, mit
  allem was offen ist. Wegklicken heisst „brauche ich nicht“: Der Rest gilt
  dann als gesehen.
* **Liste auf der Startseite.** Der Kasten „Erste Schritte“ zeigt, was offen
  ist, und verschwindet, sobald nichts mehr offen ist. Jeder Punkt lässt sich
  einzeln anspringen (`tourStarten(key)` öffnet das Overlay an dieser Stelle)
  oder abhaken.

Damit ist beides möglich: die Tour am Stück und die Einrichtung nebenbei.

## Was die Tour nicht macht

Sie zeigt keinen Schritt zu einem Bereich, den die Person nicht aufrufen kann.
Das ist keine Höflichkeit, sondern der Grund, warum die Tour ohne Pflege
richtig bleibt: Wird ein Modul abgeschaltet, verschwindet der Menüpunkt, die
Kachel **und** der Schritt. Siehe [module.md](module.md).

## Reihenfolge und Gruppen

Die Reihenfolge ist die Reihenfolge in der Liste. Die Gruppen
(`start`, `mitmachen`, `verwalten`, `einrichten`) dienen nur der Anzeige – sie
stehen als Zeile über dem Titel, damit klar ist, worum es gerade geht. Sie
sortieren nichts und filtern nichts.

Sinnvoll ist, die Liste in dieser Ordnung zu halten: erst was alle betrifft,
dann was Rechte voraussetzt, zuletzt die Einrichtung. Wer nur Mitglied ist,
sieht dann eine Tour, die vorne anfängt und hinten aufhört, ohne Lücken.
