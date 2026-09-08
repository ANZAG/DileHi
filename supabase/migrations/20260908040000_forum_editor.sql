-- Editor-Erweiterungen: Bilder im Beitrag und Erwähnungen
--
-- Zwei Dinge, die in jedem Forum erwartet werden und ohne die Absprachen
-- weiterhin in WhatsApp stattfinden: ein Foto direkt im Beitrag und ein
-- „@Name", das denjenigen auch wirklich erreicht.

-- ══ 1. Bilder im Beitrag ════════════════════════════════════════════════════
--
-- Der Bucket wird bewusst NICHT öffentlich angelegt. Das Forum ist der
-- Mitgliederbereich; Fotos von Lagern und Personen gehören nicht ins offene
-- Netz, auch nicht unter einer schwer zu erratenden Adresse. Die Anzeige läuft
-- deshalb über signierte, ablaufende Links.
--
-- Die Policies dazu wurden in 20260907160000 entfernt, weil sie ohne Forum
-- verwaist waren. Hier kommen sie zurück – diesmal mit Grenzen von Anfang an.
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-images', 'forum-images', false)
ON CONFLICT (id) DO NOTHING;

-- Auch für einen eventuell schon vorhandenen Bucket: privat, 8 MB, nur Bilder.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 8388608,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'
    ]
WHERE id = 'forum-images';

DROP POLICY IF EXISTS "Forumbilder lesen"   ON storage.objects;
DROP POLICY IF EXISTS "Forumbilder hochladen" ON storage.objects;
DROP POLICY IF EXISTS "Forumbilder löschen" ON storage.objects;

CREATE POLICY "Forumbilder lesen"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'forum-images' AND public.is_member(auth.uid()));

-- Erster Ordner ist die eigene Benutzerkennung – so lässt sich später
-- nachvollziehen und aufräumen, wer was hochgeladen hat.
CREATE POLICY "Forumbilder hochladen"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forum-images'
    AND public.is_member(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Forumbilder löschen"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'forum-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_permission(auth.uid(), 'forum.moderate')
    )
  );

-- ══ 2. Erwähnungen ══════════════════════════════════════════════════════════
--
-- Der Editor hinterlässt im Beitrag ein <span data-mention-id="…">. Wer erwähnt
-- wird, bekommt eine eigene Benachrichtigung – und zwar auch dann, wenn er das
-- Thema gar nicht beobachtet. Genau dafür setzt man ein „@" ja ein.
--
-- Ausgelesen wird in der Datenbank, nicht im Browser: Eine Erwähnung, die nur
-- der Absender-Code erzeugt, liesse sich umgehen oder fälschen.
CREATE OR REPLACE FUNCTION public.forum_mentioned_users(_body text)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT DISTINCT m[1]::uuid
  FROM regexp_matches(
         COALESCE(_body, ''),
         'data-mention-id="([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"',
         'g'
       ) AS m;
$$;

COMMENT ON FUNCTION public.forum_mentioned_users(text) IS
  'Kennungen aller im Beitragstext erwaehnten Mitglieder.';

/**
 * Ersetzt die Fassung aus 20260908010000: gleiche Logik, zusätzlich
 * Erwähnungen.
 *
 * Reihenfolge ist wichtig – wer erwähnt wurde, soll nicht zusätzlich die
 * allgemeine „hat geantwortet"-Meldung bekommen. Zwei Glocken für denselben
 * Beitrag sind der schnellste Weg dahin, dass Leute Benachrichtigungen
 * abschalten.
 */
CREATE OR REPLACE FUNCTION public.forum_notify_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread    public.forum_threads%ROWTYPE;
  _actor     text;
  _mentioned uuid[];
BEGIN
  SELECT * INTO _thread FROM public.forum_threads WHERE id = NEW.thread_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT COALESCE(NULLIF(TRIM(display_name), ''), 'Ein Mitglied')
    INTO _actor FROM public.profiles WHERE id = NEW.created_by;

  -- Nur Mitglieder, die die Rubrik auch sehen dürfen – sonst verrät eine
  -- Erwähnung die Existenz eines Themas, das für den Betreffenden gesperrt ist.
  SELECT COALESCE(array_agg(m.user_id), '{}')
    INTO _mentioned
  FROM public.forum_mentioned_users(NEW.body) m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.user_id IS DISTINCT FROM NEW.created_by
    AND COALESCE(p.is_active, false)
    -- forum_can() fragt immer nach dem angemeldeten Nutzer; hier geht es um
    -- einen anderen, deshalb die Prüfung ausgeschrieben.
    AND (
      public.has_permission(m.user_id, 'forum.moderate')
      OR EXISTS (
        SELECT 1
        FROM public.forum_category_roles cr
        JOIN public.user_roles ur ON ur.role = cr.role AND ur.user_id = m.user_id
        WHERE cr.category_id = _thread.category_id AND cr.can_view
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.forum_subscriptions s
      WHERE s.user_id = m.user_id AND s.thread_id = NEW.thread_id AND s.level = 'stumm'
    );

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
  SELECT u,
         NEW.created_by,
         'forum_mention',
         _actor || ' hat dich erwähnt',
         _thread.title,
         '/intern/forum/thema/' || _thread.id,
         'forum_thread',
         _thread.id
  FROM unnest(_mentioned) AS u;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
  SELECT a.user_id,
         NEW.created_by,
         'forum_reply',
         _actor || ' hat geantwortet',
         _thread.title,
         '/intern/forum/thema/' || _thread.id,
         'forum_thread',
         _thread.id
  FROM public.forum_thread_audience(NEW.thread_id, NEW.created_by) a
  WHERE NOT (a.user_id = ANY(_mentioned));

  -- Wer antwortet, beobachtet das Thema künftig – abbestellen geht jederzeit.
  INSERT INTO public.forum_subscriptions (user_id, thread_id, level)
  VALUES (NEW.created_by, NEW.thread_id, 'beobachten')
  ON CONFLICT (user_id, thread_id) DO NOTHING;

  RETURN NEW;
END;
$$;
