
-- Fix: Change election_results view to SECURITY INVOKER
DROP VIEW IF EXISTS public.election_results;
CREATE VIEW public.election_results
WITH (security_invoker = true)
AS
  SELECT c.election_id, c.id AS candidate_id, c.name AS candidate_name, COUNT(v.id) AS vote_count
  FROM public.candidates c
  LEFT JOIN public.votes v ON v.candidate_id = c.id
  GROUP BY c.election_id, c.id, c.name;
