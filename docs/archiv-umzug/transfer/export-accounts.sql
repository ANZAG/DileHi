-- Konten für den Umzug herausgeben – einmal in der ALTEN Datenbank ausführen.
--
-- Wo: Lovable → Cloud → Datenbank → SQL-Editor. Diese Datei ganz einfügen und
-- ausführen. Sie ändert nichts an vorhandenen Daten, sie legt nur eine
-- Funktion an.
--
-- Warum: Die Konten liegen im Schema `auth`, und das gibt die Schnittstelle
-- nicht heraus. `backup-export` sieht deshalb nur die Tabellen in `public` –
-- Profile ja, aber keine E-Mail-Adressen und keine Passwörter. Diese Funktion
-- liest `auth.users` und `auth.identities` mit den Rechten ihres Eigentümers
-- und gibt beides an `backup-export` weiter, wenn der Umzug danach fragt.
--
-- Passwörter stehen darin nur als bcrypt-Hash, so wie Supabase sie ablegt. Das
-- neue Projekt prüft Anmeldungen gegen denselben Hash; alle behalten also ihr
-- Passwort.
--
-- Ausführen darf sie nur `service_role`, also nur Code auf dem Server. Kein
-- Besucher und kein angemeldetes Mitglied kommt heran.
--
-- Nach dem Umzug wieder löschen:
--   DROP FUNCTION public.transfer_accounts();

CREATE OR REPLACE FUNCTION public.transfer_accounts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'users',      COALESCE((SELECT jsonb_agg(to_jsonb(u)) FROM auth.users u), '[]'::jsonb),
    'identities', COALESCE((SELECT jsonb_agg(to_jsonb(i)) FROM auth.identities i), '[]'::jsonb)
  )
$$;

REVOKE ALL ON FUNCTION public.transfer_accounts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_accounts() TO service_role;

-- Zur Kontrolle: Wie viele Konten würden übertragen, und haben sie ein Passwort?
SELECT
  jsonb_array_length(public.transfer_accounts() -> 'users') AS konten,
  (SELECT count(*) FROM auth.users WHERE coalesce(encrypted_password, '') <> '') AS mit_passwort;
