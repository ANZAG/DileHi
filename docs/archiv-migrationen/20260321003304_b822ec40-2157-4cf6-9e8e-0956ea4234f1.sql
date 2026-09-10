-- Allow members to see other members' map-relevant profile data
CREATE POLICY "Members can view map profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  show_on_map = true
  AND is_active = true
  AND is_member(auth.uid())
);
