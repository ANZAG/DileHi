CREATE POLICY "Can delete own answers" ON public.event_form_answers FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM event_form_responses r
    WHERE r.id = event_form_answers.response_id AND r.user_id = auth.uid()
  )
);