-- 1. cast_votes: enforce voter identity
CREATE OR REPLACE FUNCTION public.cast_votes(_election_id uuid, _voter_id uuid, _votes jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _total integer;
  _allowed integer;
  _used integer;
  _remaining integer;
  _v jsonb;
  _i integer;
BEGIN
  IF auth.uid() IS NULL OR _voter_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Keine Berechtigung: Stimmen können nur für den eigenen Account abgegeben werden';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_election_id::text || ':' || _voter_id::text));

  IF NOT can_vote(_election_id, _voter_id) THEN
    RAISE EXCEPTION 'Abstimmung nicht möglich';
  END IF;

  SELECT COALESCE(gm.vote_count, 1) INTO _allowed
  FROM elections e
  LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = _voter_id
  WHERE e.id = _election_id;

  SELECT COUNT(*) INTO _used
  FROM votes
  WHERE election_id = _election_id AND voter_id = _voter_id;

  _remaining := GREATEST(_allowed - _used, 0);

  IF _remaining <= 0 THEN
    RAISE EXCEPTION 'Keine weiteren Stimmen verfügbar';
  END IF;

  SELECT COALESCE(SUM((v->>'count')::integer), 0) INTO _total
  FROM jsonb_array_elements(_votes) v;

  IF _total != _remaining THEN
    RAISE EXCEPTION 'Genau % Stimmen erforderlich, % abgegeben', _remaining, _total;
  END IF;

  FOR _v IN SELECT * FROM jsonb_array_elements(_votes)
  LOOP
    IF (_v->>'count')::integer > 0 THEN
      FOR _i IN 1..(_v->>'count')::integer
      LOOP
        INSERT INTO votes (election_id, candidate_id, voter_id)
        VALUES (_election_id, (_v->>'candidate_id')::uuid, _voter_id);
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;

-- 2. Drop unused RLS-bypassing view
DROP VIEW IF EXISTS public.event_form_responses_with_member;

-- 3. Notifications: only server-side (service_role) inserts
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT TO service_role WITH CHECK (true);

-- 4. internal-files uploads scoped by folder
DROP POLICY IF EXISTS "Members can upload internal files" ON storage.objects;
CREATE POLICY "Members can upload internal files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'internal-files'
  AND public.is_member(auth.uid())
  AND (
    ((storage.foldername(name))[1] = 'personas' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'membership' AND public.has_permission(auth.uid(), 'membership_files.manage'))
    OR ((storage.foldername(name))[1] = 'event-maps' AND (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'events.moderate')))
    OR ((storage.foldername(name))[1] = 'sources' AND (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'epoch_sources.manage')))
    OR ((storage.foldername(name))[1] = 'announcements' AND (
      public.has_permission(auth.uid(), 'announcements.moderate')
      OR EXISTS (
        SELECT 1 FROM public.announcements a
        WHERE a.id::text = (storage.foldername(name))[2] AND a.created_by = auth.uid()
      )
    ))
  )
);

CREATE POLICY "Owners can update internal files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'internal-files'
  AND (
    ((storage.foldername(name))[1] = 'personas' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'event-maps' AND (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'events.moderate')))
    OR ((storage.foldername(name))[1] = 'membership' AND public.has_permission(auth.uid(), 'membership_files.manage'))
    OR ((storage.foldername(name))[1] = 'sources' AND (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'epoch_sources.manage')))
  )
)
WITH CHECK (bucket_id = 'internal-files');

CREATE POLICY "Organizers can delete event map files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'internal-files'
  AND (storage.foldername(name))[1] = 'event-maps'
  AND (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'events.moderate'))
);

-- 5. Gallery bucket writes require gallery permission
DROP POLICY IF EXISTS "Auth gallery upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth gallery delete" ON storage.objects;
CREATE POLICY "Gallery managers can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'gallery'
  AND (public.has_permission(auth.uid(), 'gallery.manage') OR public.has_permission(auth.uid(), 'site_images.manage'))
);
CREATE POLICY "Gallery managers can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'gallery'
  AND (public.has_permission(auth.uid(), 'gallery.manage') OR public.has_permission(auth.uid(), 'site_images.manage'))
);

-- 6. Revoke public EXECUTE on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.assign_response_to_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_vote(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cast_votes(uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.count_members() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_member_directory() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_member_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_pending_application_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_permission_catalog() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_role_catalog() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_permissions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_vote_count(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_voted(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_herold(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_schatzmeister(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_vorstand(uuid) FROM anon;

-- trigger-only functions must not be callable via the API at all
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_election_on_vote() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated;