
-- Forum Categories
CREATE TABLE public.forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  icon text DEFAULT 'MessageSquare',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories"
ON public.forum_categories FOR SELECT TO authenticated
USING (public.is_member(auth.uid()));

-- Forum Threads
CREATE TABLE public.forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_by uuid NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  post_count integer DEFAULT 0,
  last_post_at timestamptz DEFAULT now(),
  last_post_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view threads"
ON public.forum_threads FOR SELECT TO authenticated
USING (public.is_member(auth.uid()));

CREATE POLICY "Members can create threads"
ON public.forum_threads FOR INSERT TO authenticated
WITH CHECK (public.is_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Authors can update own threads"
ON public.forum_threads FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_permission(auth.uid(), 'forum.moderate'));

CREATE POLICY "Authors can delete own threads"
ON public.forum_threads FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_permission(auth.uid(), 'forum.moderate'));

-- Forum Posts
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL,
  reply_to_id uuid REFERENCES public.forum_posts(id) ON DELETE SET NULL,
  is_edited boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view posts"
ON public.forum_posts FOR SELECT TO authenticated
USING (public.is_member(auth.uid()));

CREATE POLICY "Members can create posts"
ON public.forum_posts FOR INSERT TO authenticated
WITH CHECK (public.is_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Authors can update own posts"
ON public.forum_posts FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_permission(auth.uid(), 'forum.moderate'));

CREATE POLICY "Authors can delete own posts"
ON public.forum_posts FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_permission(auth.uid(), 'forum.moderate'));

-- Forum Read Status
CREATE TABLE public.forum_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, thread_id)
);

ALTER TABLE public.forum_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own read status"
ON public.forum_read_status FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to update thread stats after post insert
CREATE OR REPLACE FUNCTION public.update_thread_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads SET
      post_count = post_count + 1,
      last_post_at = NEW.created_at,
      last_post_by = NEW.created_by
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_threads SET
      post_count = GREATEST(post_count - 1, 0)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_thread_on_post
AFTER INSERT OR DELETE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.update_thread_on_post();

-- Updated_at trigger for posts
CREATE TRIGGER update_forum_posts_updated_at
BEFORE UPDATE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;

-- Seed default categories
INSERT INTO public.forum_categories (name, description, slug, icon, sort_order) VALUES
  ('Allgemein', 'Allgemeine Diskussionen rund um den Verein', 'allgemein', 'MessageSquare', 0),
  ('Mittelalter', 'Alles zur Darstellung 1290–1310', 'mittelalter', 'Shield', 1),
  ('1815', 'Grenadiere und napoleonische Zeit', '1815', 'Swords', 2),
  ('Erster Weltkrieg', 'Pionier-Bataillon Nr. 21', 'wk1', 'Target', 3),
  ('Organisation', 'Termine, Planung und Vereinsarbeit', 'orga', 'Calendar', 4);
