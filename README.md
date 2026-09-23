# DING

Das Vereinsprogramm, das ein Verein selbst aufsetzen kann: öffentliche
Website mit Seitenbaukasten, dahinter ein Mitgliederbereich mit Terminen,
Anmeldungen, Forum, Abstimmungen, Dokumenten und Beiträgen.

Die erste Installation ist [dilehi.de](https://www.dilehi.de), die Seite von
Diu lebendec Histôrje, einem Living-History-Verein aus Wiesbaden.

## Für einen neuen Verein

[`docs/installation.md`](docs/installation.md): sechs Schritte, ohne
Kommandozeile. Gebraucht werden ein Supabase-Projekt, ein Webspace mit FTP und
dieses Repository als Kopie.

Was danach von Hand einzurichten ist — Module, Erscheinungsbild, Rollen,
Texte, Seiten — steht am Ende derselben Datei. Die Kachel **Einrichtung** im
Mitgliederbereich sagt jederzeit, was noch fehlt.

## Was hier steht und was nicht

Dieses Repository ist **das Programm**, nicht die Installation eines
bestimmten Vereins. Alles, was einen Verein ausmacht — Name, Farben, Schriften,
Menü, Seiten, Module, Rollen, Texte, Bilder — steht in seiner Datenbank, nicht
im Code. Deshalb liegen hier weder Inhalte noch Arbeitsprotokolle einer
einzelnen Installation.

## Für die Weiterentwicklung

- **Aufbau:** React, TypeScript, Vite, Tailwind, shadcn/ui. Datenbank, Anmeldung,
  Dateien und Edge Functions bei Supabase.
- **Datenbank:** `supabase/migrations/`, der Ausgangsstand und alles danach.
  Ausgerollt wird über **Actions → Supabase ausrollen**.
- **Ohne Actions bauen:** `npm run seite:bauen` — prüft und baut wie der
  Ausrollen-Knopf und legt alles in `dist/`.
- **Prüfen:** `npm test` (spielt auch die Datenbank auf einer leeren Bühne
  durch), `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint`.
- **Lokal starten:** `npm install`, dann eine `.env.local` mit
  `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` des Projekts, dann
  `npm run dev`.

Code und Datenbank sind englisch benannt, die Oberfläche ist deutsch.
