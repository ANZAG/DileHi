
-- election_results is a VIEW - enable RLS and add member-only SELECT policy
ALTER VIEW public.election_results SET (security_invoker = on);
