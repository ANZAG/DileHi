-- Veranstaltungs-Threads mit Umfrage und Mitbringliste
--
-- Das eigentliche Ersatzstück für WhatsApp: Zu jedem Termin ein Ort für die
-- Absprache, mit Terminumfragen und Mitbringlisten darin.
--
-- Bewusst getrennt von den Abstimmungen (elections): Dort hängen Wahlleitung,
-- Stimmgewichte, Stellvertretung und ein Prüfprotokoll dran, alles
-- satzungsrelevant. "Wer bringt den Grill mit?" gehört nicht in denselben
-- Mechanismus - sonst entsteht genau die Verwechslungsgefahr, die den
-- Mitgliederbereich unübersichtlich macht.

-- Wunsch des Erstellers. Die Voreinstellung kommt aus app_settings; ob das
-- Häkchen überhaupt erscheint, entscheidet der technische Administrator.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS forum_thread_wanted boolean;

COMMENT ON COLUMN public.events.forum_thread_wanted IS
  'Haekchen beim Anlegen. NULL = nicht gesetzt, dann entscheidet app_settings.forum_event_thread.';

/**
 * Legt den Thread zu einer Veranstaltung an, falls gewünscht und noch keiner da.
 *
 * Als eigene Funktion, damit sie auch nachträglich aufgerufen werden kann –
 * für Termine, die vor dieser Änderung entstanden sind.
 */
CREATE OR REPLACE FUNCTION public.ensure_event_thread(_event_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event       public.events%ROWTYPE;
  _mode        text;
  _category_id uuid;
  _thread_id   uuid;
  _slug        text;
BEGIN
  SELECT * INTO _event FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(forum_event_thread, 'vorgabe_an') INTO _mode FROM public.app_settings WHERE id;
  IF _mode = 'aus' THEN RETURN NULL; END IF;
  IF _mode <> 'immer' AND COALESCE(_event.forum_thread_wanted, _mode = 'vorgabe_an') IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  -- Schon vorhanden? Dann den bestehenden zurückgeben statt zu verdoppeln.
  SELECT id INTO _thread_id FROM public.forum_threads WHERE event_id = _event_id;
  IF _thread_id IS NOT NULL THEN RETURN _thread_id; END IF;

  SELECT id INTO _category_id FROM public.forum_categories
   WHERE is_event_room AND status = 'aktiv' LIMIT 1;
  IF _category_id IS NULL THEN RETURN NULL; END IF;

  _slug := left(regexp_replace(lower(
             translate(_event.title, 'äöüßÄÖÜ', 'aousAOU')
           ), '[^a-z0-9]+', '-', 'g'), 60);
  IF _slug = '' OR _slug IS NULL THEN _slug := 'termin'; END IF;

  INSERT INTO public.forum_threads (category_id, title, slug, created_by, event_id)
  VALUES (_category_id, _event.title, _slug, _event.created_by, _event_id)
  RETURNING id INTO _thread_id;

  INSERT INTO public.forum_posts (thread_id, body, created_by)
  VALUES (
    _thread_id,
    '<p>Hier könnt ihr alles zu <strong>' ||
      replace(replace(_event.title, '&', '&amp;'), '<', '&lt;') ||
      '</strong> besprechen – Fahrgemeinschaften, Material, wer was mitbringt.</p>',
    _event.created_by
  );

  RETURN _thread_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_event_thread(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_event_thread(uuid) TO authenticated;

-- Beim Anlegen einer Veranstaltung automatisch.
CREATE OR REPLACE FUNCTION public.events_create_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_event_thread(NEW.id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER events_forum_thread
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.events_create_thread();

/**
 * Titel des Threads mitziehen, wenn die Veranstaltung umbenannt wird –
 * sonst heisst die Absprache noch nach dem alten Termin.
 */
CREATE OR REPLACE FUNCTION public.events_sync_thread_title()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    UPDATE public.forum_threads SET title = NEW.title WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_forum_thread_title
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.events_sync_thread_title();

-- ══ Umfragen und Mitbringlisten ═════════════════════════════════════════════
--
-- Beide liegen als Beitrag im Thread (forum_posts.kind), die Antworten in
-- forum_poll_votes. Der Aufbau steckt in payload:
--
--   Umfrage:       { "frage": "...", "optionen": [{"key":"a","label":"Samstag"}],
--                    "mehrfach": true, "frist": "2026-08-01", "anonym": false }
--   Mitbringliste: { "frage": "Wer bringt was mit?",
--                    "optionen": [{"key":"grill","label":"Grill"}], "mehrfach": true }

/**
 * Ergebnis einer Umfrage. Als Funktion, weil bei anonymen Umfragen nur die
 * Zahlen herausgehen dürfen - die Namen bleiben dann in der Datenbank.
 */
CREATE OR REPLACE FUNCTION public.forum_poll_results(_post_id uuid)
RETURNS TABLE (option_key text, stimmen integer, namen text[], note_by text[])
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _anonym boolean;
  _thread uuid;
BEGIN
  SELECT COALESCE((p.payload ->> 'anonym')::boolean, false), p.thread_id
    INTO _anonym, _thread
  FROM public.forum_posts p WHERE p.id = _post_id;

  IF _thread IS NULL THEN RETURN; END IF;

  -- Nur wer den Thread sehen darf, sieht auch das Ergebnis.
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads t
    WHERE t.id = _thread AND public.forum_can(t.category_id, 'view')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v.option_key,
         COUNT(*)::integer,
         CASE WHEN _anonym THEN '{}'::text[]
              ELSE array_agg(COALESCE(NULLIF(TRIM(pr.display_name), ''), 'Mitglied') ORDER BY pr.display_name)
         END,
         array_remove(array_agg(v.note ORDER BY v.created_at), NULL)
  FROM public.forum_poll_votes v
  LEFT JOIN public.profiles pr ON pr.id = v.user_id
  WHERE v.post_id = _post_id
  GROUP BY v.option_key;
END;
$$;

REVOKE ALL ON FUNCTION public.forum_poll_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forum_poll_results(uuid) TO authenticated;

-- Bestehende Termine nachrüsten: Wer schon einen Termin angelegt hat, soll die
-- Absprache nicht neu erfinden müssen. Nur zukünftige – für vergangene lohnt es
-- nicht.
DO $$
DECLARE _e record;
BEGIN
  IF EXISTS (SELECT 1 FROM public.forum_categories WHERE is_event_room AND status = 'aktiv') THEN
    FOR _e IN SELECT id FROM public.events WHERE start_date >= now() LOOP
      PERFORM public.ensure_event_thread(_e.id);
    END LOOP;
  END IF;
END $$;
