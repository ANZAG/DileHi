-- Die Rollen heissen, wie ein fremder Verein sie nennen würde
--
-- Im Ausgangsstand stehen DileHis Ämter: „1. Officiatus", „2. Officiatus",
-- „Herold", „Schatzmeister". Das ist unsere Sprache aus dem Reenactment. Ein
-- Turnverein, der DING aufsetzt, sucht darin vergeblich, wer die Software
-- verwaltet — und beim ersten Einladen muss er raten, welche Rolle er vergibt.
--
-- Umbenannt werden nur die Beschriftungen und die Erklärungen, **nicht die
-- Schlüssel**: An `officiatus_1` und den anderen hängen über hundert
-- Rechtezuweisungen, und an einigen Stellen hängt Verhalten im Programm daran
-- (das Symbol in der Mitgliederliste, die Rollen, in die man zum Ausprobieren
-- nicht wechseln kann). Die Schlüssel sind technisch und stehen nirgends vor
-- einem Mitglied. Ihre Umbenennung gehört in den zweiten Durchgang der
-- englischen Bezeichner, zusammen mit den Stellen im Code.
--
-- Eine eigene Datei, nicht ein Nachtrag in den Startdaten: Die sind in der
-- Probeinstallation schon gelaufen, und eine Migration läuft kein zweites Mal.
--
-- Die Schranke ist hier eine andere als dort. „Noch keine Rolle vergeben"
-- greift nicht mehr, sobald jemand den ersten Zugang angelegt hat — und genau
-- dann fällt ihm auf, dass die Rollen fremd heissen. Also:
--
--   1. Nur, solange niemand die Vereinsdaten eingetragen hat. Steht dort noch
--      der Auslieferungsname, ist die Installation nicht in Betrieb. DileHi
--      trägt seinen Namen seit einem Jahr und bleibt damit unangetastet.
--   2. Und nur Beschriftungen, die noch im Auslieferungszustand sind. Wer
--      seine Rollen schon selbst benannt hat, behält seine Namen.

DO $$
DECLARE
  unberuehrt boolean;
BEGIN
  SELECT coalesce((SELECT org_name FROM public.app_settings LIMIT 1), '') = 'Mein Verein e. V.'
    INTO unberuehrt;

  IF NOT unberuehrt THEN
    RAISE NOTICE 'Rollennamen übersprungen: Die Vereinsdaten sind schon eingetragen.';
    RETURN;
  END IF;

  UPDATE public.role_catalog SET label = 'Admin',
         description = 'Verwaltet die Installation, vergibt Rechte und Rollen'
   WHERE key = 'officiatus_1' AND label = '1. Officiatus';

  UPDATE public.role_catalog SET label = 'Co-Admin',
         description = 'Vertretung des Admins, mit denselben Aufgaben'
   WHERE key = 'officiatus_2' AND label = '2. Officiatus';

  UPDATE public.role_catalog SET label = 'Medienbeauftragter',
         description = 'Öffentlichkeitsarbeit: Website, Galerie, Ankündigungen'
   WHERE key = 'herold' AND label = 'Herold';

  UPDATE public.role_catalog SET label = 'Kassenwart',
         description = 'Kasse, Beiträge und Mitgliedsunterlagen'
   WHERE key = 'schatzmeister' AND label = 'Schatzmeister';
END
$$;
