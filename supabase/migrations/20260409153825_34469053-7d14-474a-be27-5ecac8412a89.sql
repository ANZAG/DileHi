
-- 1. Add category_type to forum_categories
DO $$ BEGIN
  CREATE TYPE public.forum_category_type AS ENUM ('wissen', 'diskussion', 'organisation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.forum_categories
  ADD COLUMN IF NOT EXISTS category_type public.forum_category_type NOT NULL DEFAULT 'diskussion';

-- 2. RLS policies for forum_categories management
CREATE POLICY "Perm: forum.categories_manage insert"
  ON public.forum_categories FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'forum.categories_manage'));

CREATE POLICY "Perm: forum.categories_manage update"
  ON public.forum_categories FOR UPDATE
  TO authenticated
  USING (has_permission(auth.uid(), 'forum.categories_manage'));

CREATE POLICY "Perm: forum.categories_manage delete"
  ON public.forum_categories FOR DELETE
  TO authenticated
  USING (has_permission(auth.uid(), 'forum.categories_manage'));

-- 3. Global notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  entity_type text,
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. Forum subscriptions table
CREATE TABLE public.forum_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  thread_id uuid REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, thread_id),
  UNIQUE (user_id, category_id),
  CONSTRAINT thread_or_category CHECK (
    (thread_id IS NOT NULL AND category_id IS NULL) OR
    (thread_id IS NULL AND category_id IS NOT NULL)
  )
);

ALTER TABLE public.forum_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_forum_subscriptions_thread ON public.forum_subscriptions (thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_forum_subscriptions_category ON public.forum_subscriptions (category_id) WHERE category_id IS NOT NULL;

CREATE POLICY "Users can view own subscriptions"
  ON public.forum_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own subscriptions"
  ON public.forum_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions"
  ON public.forum_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5. Forum images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-images', 'forum-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view forum images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forum-images');

CREATE POLICY "Members can upload forum images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'forum-images' AND is_member(auth.uid()));

CREATE POLICY "Users can delete own forum images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'forum-images' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_permission(auth.uid(), 'forum.moderate')));

-- 6. Enable realtime (only for tables not already in publication)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Trigger for auto-notifications on new forum posts
CREATE OR REPLACE FUNCTION public.create_forum_reply_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread RECORD;
  _subscriber RECORD;
  _actor_name text;
BEGIN
  SELECT t.id, t.title, t.created_by, t.category_id, c.slug as category_slug
  INTO _thread
  FROM forum_threads t
  JOIN forum_categories c ON c.id = t.category_id
  WHERE t.id = NEW.thread_id;

  SELECT display_name INTO _actor_name FROM profiles WHERE id = NEW.created_by;

  -- Notify thread creator (if not the poster)
  IF _thread.created_by != NEW.created_by THEN
    INSERT INTO notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
    VALUES (
      _thread.created_by, NEW.created_by, 'forum_reply',
      'Neue Antwort in „' || _thread.title || '"',
      COALESCE(_actor_name, 'Jemand') || ' hat auf dein Thema geantwortet.',
      '/intern/forum/thread/' || _thread.id,
      'forum_thread', _thread.id
    );
  END IF;

  -- Notify subscribers (excluding poster and thread creator)
  FOR _subscriber IN
    SELECT DISTINCT fs.user_id
    FROM forum_subscriptions fs
    WHERE (fs.thread_id = _thread.id OR fs.category_id = _thread.category_id)
      AND fs.user_id != NEW.created_by
      AND fs.user_id != _thread.created_by
  LOOP
    INSERT INTO notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
    VALUES (
      _subscriber.user_id, NEW.created_by, 'forum_subscription',
      'Neue Aktivität in „' || _thread.title || '"',
      COALESCE(_actor_name, 'Jemand') || ' hat einen Beitrag geschrieben.',
      '/intern/forum/thread/' || _thread.id,
      'forum_thread', _thread.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_forum_reply_notifications
  AFTER INSERT ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_forum_reply_notifications();
