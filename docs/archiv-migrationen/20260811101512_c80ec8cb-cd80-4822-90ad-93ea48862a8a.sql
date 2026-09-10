-- 1. Documents table: category-aware RLS
DROP POLICY IF EXISTS "Members can view documents" ON public.documents;
CREATE POLICY "Members can view documents"
ON public.documents FOR SELECT
TO authenticated
USING (
  public.is_member(auth.uid())
  AND (
    category NOT IN ('vorstand','vorlagen','vereinsshirts')
    OR (category IN ('vorstand','vorlagen') AND (public.has_permission(auth.uid(),'profiles.view_all') OR public.has_permission(auth.uid(),'documents.manage')))
    OR (category = 'vereinsshirts' AND public.has_permission(auth.uid(),'documents.manage'))
  )
);

-- 2. Documents storage bucket: mirror category restriction
DROP POLICY IF EXISTS "Members can read documents" ON storage.objects;
CREATE POLICY "Members can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_member(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.storage_path = storage.objects.name
      AND (
        d.category NOT IN ('vorstand','vorlagen','vereinsshirts')
        OR (d.category IN ('vorstand','vorlagen') AND (public.has_permission(auth.uid(),'profiles.view_all') OR public.has_permission(auth.uid(),'documents.manage')))
        OR (d.category = 'vereinsshirts' AND public.has_permission(auth.uid(),'documents.manage'))
      )
  )
);

-- 3. internal-files SELECT: scope membership folder to owner/managers
DROP POLICY IF EXISTS "Members can view internal files" ON storage.objects;
CREATE POLICY "Members can view internal files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'internal-files'
  AND public.is_member(auth.uid())
  AND (
    (storage.foldername(name))[1] <> 'membership'
    OR (storage.foldername(name))[2] = (auth.uid())::text
    OR public.has_permission(auth.uid(),'membership_files.manage')
    OR public.has_permission(auth.uid(),'membership_files.view')
  )
);

-- 4. internal-files UPDATE: enforce same rules in WITH CHECK
DROP POLICY IF EXISTS "Owners can update internal files" ON storage.objects;
CREATE POLICY "Owners can update internal files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'internal-files'
  AND (
    (((storage.foldername(name))[1] = 'personas') AND ((storage.foldername(name))[2] = (auth.uid())::text))
    OR (((storage.foldername(name))[1] = 'event-maps') AND (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(),'events.moderate')))
    OR (((storage.foldername(name))[1] = 'membership') AND public.has_permission(auth.uid(),'membership_files.manage'))
    OR (((storage.foldername(name))[1] = 'sources') AND (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(),'epoch_sources.manage')))
  )
)
WITH CHECK (
  bucket_id = 'internal-files'
  AND (
    (((storage.foldername(name))[1] = 'personas') AND ((storage.foldername(name))[2] = (auth.uid())::text))
    OR (((storage.foldername(name))[1] = 'event-maps') AND (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(),'events.moderate')))
    OR (((storage.foldername(name))[1] = 'membership') AND public.has_permission(auth.uid(),'membership_files.manage'))
    OR (((storage.foldername(name))[1] = 'sources') AND (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(),'epoch_sources.manage')))
  )
);

-- 5. Revoke EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.assign_response_to_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_vote(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cast_votes(uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.count_members() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_satzung_path() FROM anon;
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

-- trigger-only functions: no direct API access at all
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_election_on_vote() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated;