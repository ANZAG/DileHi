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

## Für die Weiterentwicklung

- **Stand und nächste Schritte:** [`docs/arbeitsstand.md`](docs/arbeitsstand.md)
- **Aufbau:** React, TypeScript, Vite, Tailwind, shadcn/ui. Datenbank, Anmeldung,
  Dateien und Edge Functions bei Supabase.
- **Datenbank:** `supabase/migrations/`, der Ausgangsstand und alles danach.
  Ausgerollt wird über **Actions → Supabase ausrollen**.
- **Prüfen:** `npm test` (spielt auch die Datenbank auf einer leeren Bühne
  durch), `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint`.
- **Lokal starten:** `npm install`, dann eine `.env.local` mit
  `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` des Projekts, dann
  `npm run dev`.

Code und Datenbank sind englisch benannt, die Oberfläche ist deutsch.
