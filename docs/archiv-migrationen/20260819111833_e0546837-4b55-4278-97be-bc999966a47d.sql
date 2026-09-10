GRANT EXECUTE ON FUNCTION public.is_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_vorstand(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_vote(uuid, uuid) TO authenticated;