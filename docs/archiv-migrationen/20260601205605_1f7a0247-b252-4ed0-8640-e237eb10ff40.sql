CREATE TABLE public.user_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tour_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tour_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tours TO authenticated;
GRANT ALL ON public.user_tours TO service_role;

ALTER TABLE public.user_tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tours"
ON public.user_tours FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tours"
ON public.user_tours FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tours"
ON public.user_tours FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tours"
ON public.user_tours FOR DELETE TO authenticated
USING (user_id = auth.uid());