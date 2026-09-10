
-- 1. Forum Reactions table
CREATE TABLE public.forum_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, emoji)
);

ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reactions"
  ON public.forum_reactions FOR SELECT
  TO authenticated
  USING (is_member(auth.uid()));

CREATE POLICY "Members can add reactions"
  ON public.forum_reactions FOR INSERT
  TO authenticated
  WITH CHECK (is_member(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can remove own reactions"
  ON public.forum_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for fast lookup
CREATE INDEX idx_forum_reactions_post_id ON public.forum_reactions(post_id);

-- 2. Full-text search indexes
CREATE INDEX idx_forum_posts_content_search ON public.forum_posts USING gin(to_tsvector('german', content));
CREATE INDEX idx_forum_threads_title_search ON public.forum_threads USING gin(to_tsvector('german', title));

-- 3. Mentions notification trigger
CREATE OR REPLACE FUNCTION public.create_forum_mention_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _mention text;
  _mentioned_user_id uuid;
  _thread RECORD;
  _actor_name text;
BEGIN
  -- Get thread info
  SELECT t.id, t.title INTO _thread
  FROM forum_threads t WHERE t.id = NEW.thread_id;

  SELECT display_name INTO _actor_name FROM profiles WHERE id = NEW.created_by;

  -- Find all @mentions in the content
  FOR _mention IN
    SELECT DISTINCT (regexp_matches(NEW.content, '@([A-Za-zÀ-ÿ0-9_. -]+)', 'g'))[1]
  LOOP
    -- Find user by display_name (case-insensitive)
    SELECT id INTO _mentioned_user_id
    FROM profiles
    WHERE lower(trim(display_name)) = lower(trim(_mention))
    LIMIT 1;

    -- Create notification if user found and not self-mentioning
    IF _mentioned_user_id IS NOT NULL AND _mentioned_user_id != NEW.created_by THEN
      INSERT INTO notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
      VALUES (
        _mentioned_user_id, NEW.created_by, 'forum_mention',
        'Du wurdest erwähnt in „' || _thread.title || '"',
        COALESCE(_actor_name, 'Jemand') || ' hat dich in einem Beitrag erwähnt.',
        '/intern/forum/thread/' || _thread.id,
        'forum_thread', _thread.id
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_forum_mention_notifications
  AFTER INSERT ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_forum_mention_notifications();
