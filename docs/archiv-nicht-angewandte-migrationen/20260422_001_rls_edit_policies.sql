-- Migration: RLS-Policies für Edit durch Vorstand und Veranstaltungsorganisator
-- Hintergrund: event_form_answers darf bisher nur vom Ausfüller selbst aktualisiert werden.
-- Vorstand und Organisator müssen fremde Antworten korrigieren können (z.B. falsche Eintragungen).

-- event_form_responses: Vorstand darf alle updaten
CREATE POLICY "Vorstand can update any response"
  ON public.event_form_responses FOR UPDATE TO authenticated
  USING (is_vorstand(auth.uid()));

-- event_form_responses: Organisator darf Responses seiner eigenen Events updaten
CREATE POLICY "Organizer can update responses for own events"
  ON public.event_form_responses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.event_forms ef
      JOIN public.events e ON e.id = ef.event_id
      WHERE ef.id = form_id
        AND e.created_by = auth.uid()
    )
  );

-- event_form_answers: Vorstand darf alle updaten
CREATE POLICY "Vorstand can update any answer"
  ON public.event_form_answers FOR UPDATE TO authenticated
  USING (is_vorstand(auth.uid()));

-- event_form_answers: Organisator darf Antworten seiner eigenen Events updaten
CREATE POLICY "Organizer can update answers for own events"
  ON public.event_form_answers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.event_form_responses r
      JOIN public.event_forms ef ON ef.id = r.form_id
      JOIN public.events e ON e.id = ef.event_id
      WHERE r.id = response_id
        AND e.created_by = auth.uid()
    )
  );

-- event_form_answers: INSERT durch Organisator (für Antworten die noch nicht existieren)
CREATE POLICY "Organizer can insert answers for own events"
  ON public.event_form_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.event_form_responses r
      JOIN public.event_forms ef ON ef.id = r.form_id
      JOIN public.events e ON e.id = ef.event_id
      WHERE r.id = response_id
        AND (e.created_by = auth.uid() OR is_vorstand(auth.uid()))
    )
  );
