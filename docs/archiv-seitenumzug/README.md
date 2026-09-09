# Der Umzug der öffentlichen Seiten

Diese beiden Skripte haben die im Code gebauten Seiten in Bausteine für den
Editor übertragen und das Ergebnis anschließend gegen die Quelle geprüft:

- `seiten-umziehen.mjs` las `src/pages/Index.tsx`, `About.tsx`, die drei
  Epochenseiten und `FuerVeranstalter.tsx` und erzeugte daraus die Migrationen
  `20260908080000`, `110000`, `120000`, `130000`, `190000` und `200000`.
- `seiten-pruefen.mjs` verglich beide Fassungen: fehlende Sätze, fehlende und
  vertauschte Überschriften, Bilder samt ihrer Anzeigebreite. Es lief in
  `npm run ci`.

Beide sind hier abgelegt und nicht gelöscht, weil sie die Frage beantworten,
**wie** die Inhalte in die Datenbank gekommen sind – etwa wenn in einem Jahr
jemand wissen will, warum ein Bild auf der Napoleonik-Seite `max-w-lg` breit
ist. Lauffähig sind sie nicht mehr: Die Quelldateien unter `src/pages/` gibt es
seit dem Umzug nicht mehr, die Seiten leben im Editor.

Was sie unterwegs gefunden haben, steht in den Commits – unter anderem eine
Uniformtafel, die 704 statt 512 Pixel breit geworden wäre, drei Kästen mit
falschem Symbol und einen Abschnittsabstand von 24 statt 48 Pixeln auf allen
Seiten.

Wer die Seiten heute ändert, tut das im Editor unter Verwaltung → Seiten.
