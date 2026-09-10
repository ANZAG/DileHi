-- Ist diese Installation schon eingerichtet?
--
-- Eine frische Installation zeigt eine Website ohne Inhalt und eine Anmeldung,
-- an der sich niemand anmelden kann – es gibt ja noch kein Konto. Wer das zum
-- ersten Mal sieht, hält es für kaputt.
--
-- Damit die Anwendung selbst durch die Einrichtung führen kann, muss sie
-- wissen, ob sie schon eingerichtet ist. Und zwar bevor sich jemand anmeldet,
-- also für nicht angemeldete Anfragen.
--
-- ── Verrät das etwas? ──────────────────────────────────────────────────────
--
-- Ja, und zwar genau eine Sache: dass es hier noch kein Konto gibt. Das ist
-- kein Geheimnis, sondern der Zustand, den man sieht, sobald man die Seite
-- aufruft. Wichtiger ist, was die Funktion NICHT verrät: keine Namen, keine
-- Zahlen, kein Hinweis darauf, ob ein Einrichtungsgeheimnis hinterlegt ist.
-- Und sie sagt „fertig", sobald ein einziges Konto eine Rolle hat – ab da ist
-- der Einrichtungsweg ohnehin zu.

CREATE OR REPLACE FUNCTION public.setup_needed()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles)
$fn$;

COMMENT ON FUNCTION public.setup_needed() IS
  'Wahr, solange kein Konto eine Rolle hat. Steuert die Einrichtungsseite.';

REVOKE ALL ON FUNCTION public.setup_needed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.setup_needed() TO anon, authenticated;
