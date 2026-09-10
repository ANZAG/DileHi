-- Benachrichtigungen anschließen
--
-- Die Tabelle notifications gibt es seit Monaten – mit Policies, Indizes und
-- allem. Nur erzeugt sie niemand: Die Trigger wurden mit dem alten Forum
-- entfernt, die Glocke im Frontend gleich mit. Ohne Benachrichtigung schaut
-- aber niemand von sich aus ins Forum, und genau daran ist das alte
-- eingeschlafen.
--
-- Erzeugt werden sie in der Datenbank, nicht im Browser: Nur so ist
-- sichergestellt, dass eine Benachrichtigung auch entsteht, wenn jemand über
-- die API schreibt – und die Policy lässt Einfügen ohnehin nur serverseitig zu.

-- ══ Wer bekommt mit, was in einem Thema passiert? ═══════════════════════════
--
-- Wie in den meisten Foren: wer das Thema eröffnet hat, wer darin geschrieben
-- hat, und wer es ausdrücklich beobachtet. Wer auf „stumm" gestellt hat, nicht.
CREATE OR REPLACE FUNCTION public.forum_thread_audience(_thread_id uuid, _exclude uuid)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT u.user_id
  FROM (
    SELECT t.created_by AS user_id FROM public.forum_threads t WHERE t.id = _thread_id
    UNION
    SELECT p.created_by FROM public.forum_posts p WHERE p.thread_id = _thread_id
    UNION
    SELECT s.user_id FROM public.forum_subscriptions s
     WHERE s.thread_id = _thread_id AND s.level <> 'stumm'
  ) u
  WHERE u.user_id IS DISTINCT FROM _exclude
    -- Ausdrücklich stummgeschaltete Themen schlagen alles andere.
    AND NOT EXISTS (
      SELECT 1 FROM public.forum_subscriptions s2
      WHERE s2.user_id = u.user_id AND s2.thread_id = _thread_id AND s2.level = 'stumm'
    );
$$;

-- ══ Neuer Beitrag ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.forum_notify_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread public.forum_threads%ROWTYPE;
  _actor  text;
BEGIN
  SELECT * INTO _thread FROM public.forum_threads WHERE id = NEW.thread_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT COALESCE(NULLIF(TRIM(display_name), ''), 'Ein Mitglied')
    INTO _actor FROM public.profiles WHERE id = NEW.created_by;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
  SELECT a.user_id,
         NEW.created_by,
         'forum_reply',
         _actor || ' hat geantwortet',
         _thread.title,
         '/intern/forum/thema/' || _thread.id,
         'forum_thread',
         _thread.id
  FROM public.forum_thread_audience(NEW.thread_id, NEW.created_by) a;

  -- Wer antwortet, beobachtet das Thema künftig – abbestellen geht jederzeit.
  INSERT INTO public.forum_subscriptions (user_id, thread_id, level)
  VALUES (NEW.created_by, NEW.thread_id, 'beobachten')
  ON CONFLICT (user_id, thread_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER forum_posts_notify
AFTER INSERT ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.forum_notify_post();

-- ══ Neues Thema ═════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.forum_notify_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor text;
  _category text;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), 'Ein Mitglied')
    INTO _actor FROM public.profiles WHERE id = NEW.created_by;
  SELECT name INTO _category FROM public.forum_categories WHERE id = NEW.category_id;

  -- Nur an Leute, die diese Rubrik beobachten – sonst wird die Glocke zur Last.
  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
  SELECT s.user_id,
         NEW.created_by,
         'forum_thread',
         _actor || ' hat ein Thema eröffnet',
         COALESCE(_category || ': ', '') || NEW.title,
         '/intern/forum/thema/' || NEW.id,
         'forum_thread',
         NEW.id
  FROM public.forum_subscriptions s
  WHERE s.category_id = NEW.category_id
    AND s.level <> 'stumm'
    AND s.user_id IS DISTINCT FROM NEW.created_by;

  INSERT INTO public.forum_subscriptions (user_id, thread_id, level)
  VALUES (NEW.created_by, NEW.id, 'beobachten')
  ON CONFLICT (user_id, thread_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER forum_threads_notify
AFTER INSERT ON public.forum_threads
FOR EACH ROW EXECUTE FUNCTION public.forum_notify_thread();

-- ══ Alles gelesen ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.mark_notifications_read(_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH updated AS (
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = auth.uid()
      AND is_read = false
      AND (_ids IS NULL OR id = ANY(_ids))
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM updated;
$$;

REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.forum_thread_audience(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forum_thread_audience(uuid, uuid) TO authenticated;

-- ══ Einstellungen je Mitglied ═══════════════════════════════════════════════
--
-- Wer keine Mail möchte, soll das abstellen können, ohne die Glocke zu
-- verlieren. Ohne diese Möglichkeit stellen Leute alles ab.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_digest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS digest_sent_at timestamptz;

COMMENT ON COLUMN public.profiles.notify_digest IS
  'Taegliche Zusammenfassung ungelesener Benachrichtigungen per E-Mail.';

-- ══ Grundlage für die Zusammenfassung ═══════════════════════════════════════
--
-- Wird von der Edge Function mit Service-Role gelesen. Liefert je Mitglied die
-- ungelesenen Benachrichtigungen seit der letzten Zusammenfassung.
CREATE OR REPLACE FUNCTION public.pending_digests()
RETURNS TABLE (user_id uuid, display_name text, items jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         p.display_name,
         jsonb_agg(jsonb_build_object(
           'title', n.title, 'body', n.body, 'link', n.link, 'created_at', n.created_at
         ) ORDER BY n.created_at)
  FROM public.profiles p
  JOIN public.notifications n
    ON n.user_id = p.id
   AND NOT n.is_read
   AND n.created_at > COALESCE(p.digest_sent_at, now() - interval '7 days')
  WHERE p.notify_digest AND p.is_active IS DISTINCT FROM false
  GROUP BY p.id, p.display_name;
$$;

REVOKE ALL ON FUNCTION public.pending_digests() FROM PUBLIC, anon, authenticated;
