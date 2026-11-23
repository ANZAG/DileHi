-- Wahlen und Profile absichern (Sicherheitsprüfung vom 23.11.2026).
--
-- 1. Stimmen nur noch über cast_votes().
--
-- Die Policy „Members can cast vote" erlaubte das direkte Einfügen in votes,
-- solange can_vote() „noch Stimmen übrig" sagte. can_vote() ist STABLE und
-- sieht die Zeilen derselben Anweisung nicht: Wer über die
-- Datenbank-Schnittstelle zwanzig Zeilen in einer Anfrage schickte, bekam
-- alle zwanzig durch – ebenso zwei gleichzeitige Anfragen. Eine
-- Eindeutigkeitsregel gibt es nicht (wer mehrere Stimmen hat, darf sie
-- häufen). cast_votes() sperrt je Wahl und Mitglied und zählt richtig; die
-- Oberfläche geht ohnehin nur diesen Weg. cast_votes() läuft als SECURITY
-- DEFINER und braucht deshalb weder Policy noch Recht des Aufrufers.
DROP POLICY IF EXISTS "Members can cast vote" ON public.votes;
REVOKE INSERT, UPDATE ON TABLE public.votes FROM anon, authenticated;

-- 2. Eintritt, Austritt und Status eines Profils ändert nur die
--    Mitgliederverwaltung.
--
-- „Users can update own profile" gilt für alle Spalten. Mitgliedsart und
-- Beitragsintervall wählt das Mitglied auf seiner Profilseite selbst – das
-- bleibt. Eintritts- und Austrittsdatum und „aktiv" gehören ins
-- Mitgliederverzeichnis; ein Mitglied konnte sie über die
-- Datenbank-Schnittstelle am eigenen Profil ändern.
--
-- auth.uid() ist leer, wenn der Dienstschlüssel schreibt (Edge Functions,
-- Migrationen, Sicherung) – das bleibt erlaubt.
CREATE OR REPLACE FUNCTION public.profil_verwaltungsfelder_schuetzen()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR has_permission(auth.uid(), 'members.manage') THEN
    RETURN NEW;
  END IF;
  IF NEW.entry_date IS DISTINCT FROM OLD.entry_date
     OR NEW.exit_date IS DISTINCT FROM OLD.exit_date
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Eintritt, Austritt und Status ändert nur die Mitgliederverwaltung'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.profil_verwaltungsfelder_schuetzen() FROM PUBLIC;

DROP TRIGGER IF EXISTS profil_verwaltungsfelder_schuetzen ON public.profiles;
CREATE TRIGGER profil_verwaltungsfelder_schuetzen
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profil_verwaltungsfelder_schuetzen();
