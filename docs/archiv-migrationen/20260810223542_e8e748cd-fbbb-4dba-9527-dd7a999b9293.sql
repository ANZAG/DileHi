
-- 1. Map profiles: no full-row exposure
DROP POLICY IF EXISTS "Members can view map profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_map_members()
RETURNS TABLE (id uuid, display_name text, city text, zip text, map_lat double precision, map_lng double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.city, p.zip, p.map_lat, p.map_lng
  FROM public.profiles p
  WHERE p.show_on_map = true
    AND p.is_active = true
    AND public.is_member(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_map_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_map_members() TO authenticated;

-- 2. Election results: members only, aggregate only
DROP VIEW IF EXISTS public.election_results;
DROP VIEW IF EXISTS public.map_missing_coords;

CREATE OR REPLACE FUNCTION public.get_election_results()
RETURNS TABLE (candidate_id uuid, candidate_name text, election_id uuid, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.election_id, count(v.id)
  FROM public.candidates c
  LEFT JOIN public.votes v ON v.candidate_id = c.id
  WHERE public.is_member(auth.uid())
  GROUP BY c.id, c.name, c.election_id;
$$;

REVOKE ALL ON FUNCTION public.get_election_results() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_election_results() TO authenticated;

-- 3. Event form fields: members / owners only
DROP POLICY IF EXISTS "Members can view fields" ON public.event_form_fields;
CREATE POLICY "Members can view fields"
ON public.event_form_fields
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_forms f
    WHERE f.id = event_form_fields.form_id
      AND (
        public.is_member(auth.uid())
        OR f.created_by = auth.uid()
        OR public.has_permission(auth.uid(), 'events.moderate')
      )
  )
);
