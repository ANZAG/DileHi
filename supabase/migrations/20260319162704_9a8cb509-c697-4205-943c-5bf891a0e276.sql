
-- Member tents table
CREATE TABLE public.member_tents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  tent_type text NOT NULL,
  shape text NOT NULL DEFAULT 'circle',
  diameter numeric NULL,
  length numeric NULL,
  width numeric NULL,
  guy_rope numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_tents ENABLE ROW LEVEL SECURITY;

-- Members can view all member tents (for pool)
CREATE POLICY "Members can view member tents" ON public.member_tents
  FOR SELECT TO authenticated
  USING (is_member(auth.uid()));

-- Users can manage own tents
CREATE POLICY "Users can insert own tents" ON public.member_tents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tents" ON public.member_tents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tents" ON public.member_tents
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
