
-- Update SELECT policy to include herold and schatzmeister
DROP POLICY IF EXISTS "Vorstand can read contacts" ON public.contact_messages;
CREATE POLICY "Admins can read contacts"
  ON public.contact_messages FOR SELECT
  USING (
    is_vorstand(auth.uid())
    OR is_herold(auth.uid())
    OR is_schatzmeister(auth.uid())
  );
