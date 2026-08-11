DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Public (anon + authenticated) entry points
GRANT EXECUTE ON FUNCTION public.get_form_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_form_response(text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_response_by_edit_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_response_by_edit_token(text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_contribution_rate() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_members() TO anon, authenticated;

-- Authenticated-only entry points
GRANT EXECUTE ON FUNCTION public.cast_votes(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_vote(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_voted(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_vote_count(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_election_results() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_map_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_permission_catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_application_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_response_to_member(uuid, uuid) TO authenticated;