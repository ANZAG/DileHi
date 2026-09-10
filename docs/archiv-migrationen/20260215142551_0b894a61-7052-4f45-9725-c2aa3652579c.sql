
-- 1. Create election_groups table (Klammern)
CREATE TABLE public.election_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  votes_per_member INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.election_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view election groups"
  ON public.election_groups FOR SELECT
  USING (is_member(auth.uid()));

CREATE POLICY "Vorstand can create election groups"
  ON public.election_groups FOR INSERT
  WITH CHECK (is_vorstand(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Vorstand can update election groups"
  ON public.election_groups FOR UPDATE
  USING (is_vorstand(auth.uid()));

CREATE POLICY "Vorstand can delete election groups"
  ON public.election_groups FOR DELETE
  USING (is_vorstand(auth.uid()));

-- 2. Add group_id to elections table
ALTER TABLE public.elections ADD COLUMN group_id UUID REFERENCES public.election_groups(id) ON DELETE CASCADE;

-- 3. Create election_audit_log table for deleted elections
CREATE TABLE public.election_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  election_title TEXT NOT NULL,
  election_description TEXT,
  group_title TEXT,
  result_snapshot JSONB,
  total_votes INTEGER DEFAULT 0,
  deleted_by UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.election_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vorstand can view audit log"
  ON public.election_audit_log FOR SELECT
  USING (is_vorstand(auth.uid()));

CREATE POLICY "Vorstand can create audit log entries"
  ON public.election_audit_log FOR INSERT
  WITH CHECK (is_vorstand(auth.uid()));

-- 4. Add SELECT policy on votes so users can check if they voted
CREATE POLICY "Members can view own votes"
  ON public.votes FOR SELECT
  USING (is_member(auth.uid()) AND voter_id = auth.uid());

-- 5. Fix election_results view - recreate with security_invoker = off
DROP VIEW IF EXISTS public.election_results;

CREATE VIEW public.election_results
WITH (security_invoker = off) AS
SELECT c.election_id,
    c.id AS candidate_id,
    c.name AS candidate_name,
    count(v.id) AS vote_count
FROM candidates c
LEFT JOIN votes v ON v.candidate_id = c.id
GROUP BY c.election_id, c.id, c.name;

-- 6. Enable realtime for elections table
ALTER PUBLICATION supabase_realtime ADD TABLE public.elections;
