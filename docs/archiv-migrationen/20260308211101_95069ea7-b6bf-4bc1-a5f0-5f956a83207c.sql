
CREATE TABLE public.contact_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_message_id uuid NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
  replied_by uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vorstand can insert replies" ON public.contact_replies
  FOR INSERT TO authenticated
  WITH CHECK (is_vorstand(auth.uid()) AND replied_by = auth.uid());

CREATE POLICY "Admins can view replies" ON public.contact_replies
  FOR SELECT TO authenticated
  USING (is_vorstand(auth.uid()) OR is_herold(auth.uid()) OR is_schatzmeister(auth.uid()));
