-- Weitere Hilfetexte am Feld
--
-- Ein Durchgang durch die Verwaltung mit einer einzigen Frage: Versteht jemand
-- ohne Vorwissen, was hier von ihm verlangt wird? An vier Stellen war die
-- Antwort nein, und zwar nicht wegen fehlender Erklärung, sondern weil die
-- Erklärung anderswo stand – in einer Einführung, die man beim fünften Mal
-- nicht mehr aufruft.
--
-- Das Fragezeichen am Feld ist die Antwort darauf: Es steht dort, wo die Frage
-- entsteht, und bleibt dort.

INSERT INTO public.onboarding_hilfe (key, titel, text)
SELECT * FROM (VALUES

  ('einladung_rolle', 'Welche Rolle?',
   'Die Rolle bestimmt, was jemand darf. Im Zweifel „Mitglied“ – ändern kannst du sie jederzeit, und zu wenige Rechte fallen schneller auf als zu viele.'),

  ('seite_versteckt', 'Nicht in Suchmaschinen aufnehmen',
   'Die Seite bleibt öffentlich erreichbar, taucht aber nicht in Google auf. Sinnvoll für Seiten, die nur über einen Link gefunden werden sollen. Für Impressum und Datenschutzerklärung nicht setzen: Die müssen auffindbar sein.'),

  ('forum_rechte', 'Rechte je Rubrik',
   'Lesen, schreiben und moderieren werden getrennt vergeben. So kann eine Rubrik für alle sichtbar sein, in der aber nur der Vorstand schreibt – etwa für Beschlüsse.'),

  ('termin_oeffentlich', 'Öffentlich zeigen',
   'Der Termin erscheint zusätzlich auf der Website, für Gäste ohne Anmeldung. Angezeigt werden Titel, Zeit und Ort; wer zugesagt hat, bleibt intern.')

) AS v(key, titel, text)
WHERE NOT EXISTS (
  SELECT 1 FROM public.onboarding_hilfe h WHERE h.key = v.key
);

UPDATE public.onboarding_hilfe
SET standard = jsonb_build_object('titel', titel, 'text', text)
WHERE standard IS NULL;
