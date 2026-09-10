
-- Update is_member to include herold
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('vorstand', 'mitglied', 'herold')
  )
$$;

-- Add is_herold function
CREATE OR REPLACE FUNCTION public.is_herold(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'herold'
  )
$$;

-- Create announcement_replies table
CREATE TABLE public.announcement_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcement_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view replies" ON public.announcement_replies FOR SELECT USING (is_member(auth.uid()));
CREATE POLICY "Members can create replies" ON public.announcement_replies FOR INSERT WITH CHECK (is_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Own or vorstand can delete replies" ON public.announcement_replies FOR DELETE USING (created_by = auth.uid() OR is_vorstand(auth.uid()));

-- Create source_folders table
CREATE TABLE public.source_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.source_folders(id) ON DELETE CASCADE,
  epoch text NOT NULL,
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.source_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view folders" ON public.source_folders FOR SELECT USING (is_member(auth.uid()));
CREATE POLICY "Members can create folders" ON public.source_folders FOR INSERT WITH CHECK (is_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Members can delete own folders" ON public.source_folders FOR DELETE USING (created_by = auth.uid() OR is_vorstand(auth.uid()));

-- Add folder_id to sources
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.source_folders(id) ON DELETE SET NULL;
