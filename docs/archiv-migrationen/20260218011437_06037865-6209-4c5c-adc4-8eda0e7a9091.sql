
-- 1. Drop unique constraint on votes (allows cumulative voting)
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_election_id_voter_id_key;

-- 2. Fix handle_new_user for re-invitations (upsert instead of insert)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$$;

-- 3. Fix count_members to include herold
CREATE OR REPLACE FUNCTION public.count_members()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT user_id) FROM public.user_roles WHERE role IN ('vorstand', 'mitglied', 'herold')
$$;

-- 4. Cascade delete sources when folder deleted
ALTER TABLE public.sources DROP CONSTRAINT IF EXISTS sources_folder_id_fkey;
ALTER TABLE public.sources ADD CONSTRAINT sources_folder_id_fkey 
  FOREIGN KEY (folder_id) REFERENCES public.source_folders(id) ON DELETE CASCADE;

ALTER TABLE public.source_folders DROP CONSTRAINT IF EXISTS source_folders_parent_id_fkey;
ALTER TABLE public.source_folders ADD CONSTRAINT source_folders_parent_id_fkey 
  FOREIGN KEY (parent_id) REFERENCES public.source_folders(id) ON DELETE CASCADE;

-- 5. Gallery images table
CREATE TABLE public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  epoch text NOT NULL DEFAULT 'alle',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view gallery" ON public.gallery_images FOR SELECT USING (true);
CREATE POLICY "Admin can insert gallery" ON public.gallery_images FOR INSERT WITH CHECK (is_vorstand(auth.uid()) OR is_herold(auth.uid()));
CREATE POLICY "Admin can update gallery" ON public.gallery_images FOR UPDATE USING (is_vorstand(auth.uid()) OR is_herold(auth.uid()));
CREATE POLICY "Admin can delete gallery" ON public.gallery_images FOR DELETE USING (is_vorstand(auth.uid()) OR is_herold(auth.uid()));

-- 6. Gallery storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public gallery view" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Auth gallery upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');
CREATE POLICY "Auth gallery delete" ON storage.objects FOR DELETE USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');

-- 7. Contact messages table (public insert)
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send contact" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Vorstand can read contacts" ON public.contact_messages FOR SELECT USING (is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can delete contacts" ON public.contact_messages FOR DELETE USING (is_vorstand(auth.uid()));
