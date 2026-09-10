# Stand: Was fehlt noch, damit ein anderer Verein DileHi aufsetzen kann

Abgleich mit der Aufwandschätzung in
[machbarkeit-oeffentliche-seiten.md](machbarkeit-oeffentliche-seiten.md),
Abschnitt „Was der andere Verein zusätzlich braucht".

## Die sechs Punkte von damals

| Punkt | Stand |
| --- | --- |
| `app_role`-Enum auflösen, eigene Rollen | **offen** |
| Modulschalter im Adminbereich | erledigt |
| Technischer Administrator | **offen** |
| SMTP statt Microsoft Graph | erledigt |
| Installationsroutine | **offen** |
| Umzug von WordPress | offen, betrifft nur den ersten Fremdverein |

### `app_role` ist noch ein Enum

`user_roles.role` hängt an `CREATE TYPE public.app_role AS ENUM (...)` mit fünf
festen Werten: vorstand, mitglied, herold, schatzmeister, officiatus_1/2. Ein
Verein mit einer Rolle „Zeugwart" kann sie nicht anlegen.

Der Rollenkatalog (`role_catalog`) und die Rechte (`permission_catalog`,
`role_permissions`) sind bereits Tabellen und frei pflegbar — die Rechte lassen
sich also beliebig verteilen. Nur die Menge der Rollen selbst steht fest.

Rund fünfzig RLS-Regeln rufen ausserdem noch `is_vorstand()`, `is_herold()` und
`is_schatzmeister()` auf statt `has_permission()`. Solange die drin stehen,
hängt das Verhalten an drei fest benannten Rollen.

Das ist der grösste verbliebene Brocken und der Grund, warum eine zweite
Installation heute noch unsere Rollennamen erbt.

### Technischer Administrator

Der Ordner `supabase/functions/setup-first-admin` war leer — die Funktion
existiert nicht. Ohne sie gibt es keinen Weg, in einer frischen Installation
das erste Konto mit Verwaltungsrechten anzulegen; man müsste in der Datenbank
von Hand eine Zeile in `user_roles` schreiben.

### Installationsroutine

Nicht begonnen. Dazu gehört: Startdaten (Module, Rollen, Rechte, Vorlagen,
Menü, Seiten), der erste Administrator, ein Einrichtungsassistent, der durch
Name, Logo, Farben und Module führt.

Die Erkennung dafür liegt bereit: `onboarding_erledigt()` weiss schon, ob der
Verein benannt, ein Logo hochgeladen, eine Seite veröffentlicht und ein
Mitglied eingeladen wurde. Es fehlt der Ablauf drumherum.

## Was seit der Schätzung dazugekommen und erledigt ist

Nicht in der ursprünglichen Liste, aber Voraussetzung dafür, dass die
Installation eines Fremdvereins nicht nach uns aussieht:

- Vereinsangaben, Logo, Favicon, Farben (auch die Flächen), Schriften
- Alle öffentlichen Seiten im Editor statt im Quelltext, mit Menü und Fusszeile
- Mailvorlagen, Aufnahmeantrag als PDF, Antragsfelder, Profilfelder
- Drei Beitragsmodelle, Beitragsstufen anlegen und wieder entfernen
- Module ein- und ausschaltbar, mit Abhängigkeiten
- Einführung und Hilfetexte in der Datenbank statt im Quelltext

## Stellen, die eine neue Installation von Hand anfassen muss

Bewusst kurz gehalten. Beide sind statische Dateien, die vor dem ersten Start
gelesen werden und deshalb nicht aus der Datenbank kommen können:

| Datei | Was |
| --- | --- |
| `index.html` | `og:url`, `og:image`, `twitter:image` — die Vorschaubilder für Dienste, die kein JavaScript ausführen |
| `public/robots.txt` | die `Sitemap:`-Zeile mit der Adresse der Edge Function |

Alles andere kommt aus den Vereinsangaben. `npm run ci` prüft das: Steht die
Vereinsdomain irgendwo sonst im Quelltext, schlägt der Durchlauf fehl.

## Warum die Migrationen bleiben

Die Frage kam auf, ob die SQL-Dateien unter `supabase/migrations/` aufgeräumt
werden können. Nein — und zwar aus genau dem Grund, um den es hier geht.

Diese Dateien **sind** die Installationsanleitung der Datenbank. Eine neue
Installation entsteht, indem sie der Reihe nach eingespielt werden: Tabellen,
Regeln, Funktionen, Rechte, Startdaten. Ohne sie gibt es keinen Weg von einer
leeren Datenbank zu einer laufenden DileHi-Instanz.

Sie zu löschen hiesse: Diese eine Datenbank läuft weiter, und eine zweite lässt
sich nie wieder aufbauen.

**Was möglich wäre**, wenn die Zahl irgendwann stört: die Migrationen bis zu
einem Stichtag zu einer einzigen Ausgangsdatei zusammenzufassen (ein
„Squash"). Das ist eine ernsthafte Aufgabe, kein Aufräumen — die Reihenfolge
von Fremdschlüsseln, Regeln und Startdaten muss stimmen, und der Beweis ist
erst erbracht, wenn eine leere Datenbank damit vollständig entsteht. Sinnvoll
wird das zusammen mit der Installationsroutine, nicht davor.

Aufgeräumt wurde stattdessen, was wirklich niemand mehr braucht: nicht
angewandte Migrationsentwürfe, die Skripte des Seitenumzugs, doppelt
ausgelieferte Bilder und zwei ungenutzte Abhängigkeiten.
