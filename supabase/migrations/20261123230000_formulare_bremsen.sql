-- Öffentliche Formulare bremsen (Sicherheitsprüfung vom 23.11.2026).
--
-- Kontaktformular, „Passwort vergessen" und öffentliche Anmeldeformulare
-- nahmen Anfragen in beliebiger Zahl und Grösse an: Postfach und Tabellen
-- liessen sich fluten. Hier eine einfache Bremse je Absender-Adresse (IP) –
-- kein Captcha, das Besucher lösen müssten, und kein fremder Dienst.

-- 1. Zählwerk -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anfragen_bremse (
  schluessel text NOT NULL,
  zeit timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS anfragen_bremse_schluessel_zeit ON public.anfragen_bremse (schluessel, zeit);
ALTER TABLE public.anfragen_bremse ENABLE ROW LEVEL SECURITY;
-- Keine Policy: Niemand liest oder schreibt die Tabelle über die
-- Schnittstelle; nur die Funktionen unten (SECURITY DEFINER) und der
-- Dienstschlüssel.
REVOKE ALL ON TABLE public.anfragen_bremse FROM anon, authenticated;

-- Die Adresse des Aufrufers, wie die Schnittstelle sie mitgibt. Leer, wenn
-- nicht über die Schnittstelle gerufen wird (Dienstschlüssel per SQL,
-- Migrationen, Tests) – dann wird nicht gebremst.
CREATE OR REPLACE FUNCTION public.anfrage_absender()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _kopf text := current_setting('request.headers', true);
  _ip text;
BEGIN
  IF _kopf IS NULL OR _kopf = '' THEN RETURN NULL; END IF;
  _ip := trim(split_part(COALESCE(_kopf::json->>'x-forwarded-for', ''), ',', 1));
  RETURN NULLIF(_ip, '');
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$function$;

-- Darf dieser Absender noch? Zählt die Anfrage mit. `_absender` leer: die
-- Adresse aus der Schnittstelle; ist auch die leer, wird nicht gebremst.
CREATE OR REPLACE FUNCTION public.anfrage_erlaubt(_art text, _hoechstens integer, _fenster interval, _absender text DEFAULT NULL)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _wer text := COALESCE(NULLIF(trim(_absender), ''), public.anfrage_absender());
  _schluessel text;
  _zahl integer;
BEGIN
  IF _wer IS NULL THEN RETURN true; END IF;
  -- Nicht die Adresse selbst ablegen, nur ihren Fingerabdruck.
  _schluessel := _art || ':' || md5(_wer);
  PERFORM pg_advisory_xact_lock(hashtext(_schluessel));
  DELETE FROM anfragen_bremse WHERE zeit < now() - interval '1 day';
  SELECT count(*) INTO _zahl FROM anfragen_bremse WHERE schluessel = _schluessel AND zeit > now() - _fenster;
  IF _zahl >= _hoechstens THEN RETURN false; END IF;
  INSERT INTO anfragen_bremse (schluessel) VALUES (_schluessel);
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.anfrage_erlaubt(text, integer, interval, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anfrage_erlaubt(text, integer, interval, text) TO service_role;
REVOKE ALL ON FUNCTION public.anfrage_absender() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anfrage_absender() TO service_role;

-- 2. Kontaktformular -------------------------------------------------------
-- Längen: NOT VALID, damit vorhandene Zeilen nicht geprüft werden; für neue
-- gilt die Regel sofort.
ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_messages_laengen
  CHECK (length(name) <= 200 AND length(email) <= 320 AND length(message) <= 10000) NOT VALID;

CREATE OR REPLACE FUNCTION public.kontakt_bremsen()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.anfrage_erlaubt('kontakt', 5, interval '1 hour') THEN
    RAISE EXCEPTION 'Zu viele Nachrichten in kurzer Zeit – bitte später noch einmal versuchen'
      USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.kontakt_bremsen() FROM PUBLIC;

DROP TRIGGER IF EXISTS kontakt_bremsen ON public.contact_messages;
CREATE TRIGGER kontakt_bremsen
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.kontakt_bremsen();

-- 3. Öffentliche Anmeldeformulare -------------------------------------------
-- Wie bisher, dazu Grenzen für Umfang und Häufigkeit. Die Zuordnung zu einem
-- Mitglied über die E-Mail-Adresse bleibt: Mitglieder füllen das öffentliche
-- Formular oft unangemeldet aus und sollen ihre Anmeldung trotzdem im
-- Mitgliederbereich sehen.
CREATE OR REPLACE FUNCTION public.submit_form_response(_token text, _name text, _email text, _answers jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _form_id uuid;
  _response_id uuid;
  _edit_token text;
  _answer jsonb;
  _user_id uuid;
  _matched_id uuid;
BEGIN
  -- Grenzen (Sicherheitsprüfung 23.11.2026): Die Funktion ist ohne Anmeldung
  -- aufrufbar und nahm Antworten in beliebiger Zahl und Grösse an.
  IF length(COALESCE(_name, '')) > 200 OR length(COALESCE(_email, '')) > 320 THEN
    RAISE EXCEPTION 'Name oder E-Mail zu lang';
  END IF;
  IF _answers IS NULL OR jsonb_typeof(_answers) <> 'array'
     OR jsonb_array_length(_answers) > 300 OR pg_column_size(_answers) > 200000 THEN
    RAISE EXCEPTION 'Antwort zu umfangreich';
  END IF;
  IF NOT public.anfrage_erlaubt('formular', 30, interval '1 hour') THEN
    RAISE EXCEPTION 'Zu viele Anmeldungen in kurzer Zeit – bitte später noch einmal versuchen';
  END IF;

  SELECT id INTO _form_id FROM event_forms WHERE public_token = _token AND is_open = true;
  IF _form_id IS NULL THEN
    RAISE EXCEPTION 'Formular nicht gefunden oder geschlossen';
  END IF;

  _user_id := auth.uid();

  -- If not logged in but email matches an active member, auto-link
  IF _user_id IS NULL AND _email IS NOT NULL AND length(trim(_email)) > 0 THEN
    SELECT u.id INTO _matched_id
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = lower(trim(_email))
      AND COALESCE(p.is_active, true) = true
      AND public.is_member(u.id)
    LIMIT 1;
    IF _matched_id IS NOT NULL THEN
      _user_id := _matched_id;
    END IF;
  END IF;

  INSERT INTO event_form_responses (form_id, respondent_name, respondent_email, user_id)
  VALUES (_form_id, _name, _email, _user_id)
  RETURNING id, edit_token INTO _response_id, _edit_token;

  FOR _answer IN SELECT * FROM jsonb_array_elements(_answers)
  LOOP
    INSERT INTO event_form_answers (response_id, field_id, value)
    VALUES (_response_id, (_answer->>'field_id')::uuid, _answer->'value');
  END LOOP;

  RETURN _edit_token;
END;
$function$
;

-- Die Bremse darf die Funktion selbst rufen (SECURITY DEFINER, Eigentümer).
