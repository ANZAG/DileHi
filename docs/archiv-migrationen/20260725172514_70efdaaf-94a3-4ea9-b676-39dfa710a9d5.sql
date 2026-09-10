CREATE TABLE public.member_personas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  period text NOT NULL DEFAULT '',
  portrayal text NOT NULL DEFAULT '',
  expertise text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_personas TO authenticated;
GRANT ALL ON public.member_personas TO service_role;

ALTER TABLE public.member_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view personas"
ON public.member_personas FOR SELECT TO authenticated
USING (public.is_member(auth.uid()));

CREATE POLICY "Users can create own personas"
ON public.member_personas FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_member(auth.uid()));

CREATE POLICY "Users or Vorstand can update personas"
ON public.member_personas FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'members.manage'))
WITH CHECK (auth.uid() = user_id OR public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'members.manage'));

CREATE POLICY "Users or Vorstand can delete personas"
ON public.member_personas FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'members.manage'));

CREATE INDEX member_personas_user_idx ON public.member_personas (user_id);

CREATE TRIGGER member_personas_touch
BEFORE UPDATE ON public.member_personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Users can delete own persona images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'internal-files'
  AND (storage.foldername(name))[1] = 'personas'
  AND (storage.foldername(name))[2] = auth.uid()::text
);