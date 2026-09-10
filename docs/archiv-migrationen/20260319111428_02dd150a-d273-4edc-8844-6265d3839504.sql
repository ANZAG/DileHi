
-- Event registration forms
CREATE TABLE public.event_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text,
  public_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_open boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.event_forms(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'text',
  label text NOT NULL,
  description text,
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  options jsonb DEFAULT '[]',
  settings jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.event_forms(id) ON DELETE CASCADE,
  respondent_name text NOT NULL,
  respondent_email text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_form_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.event_form_responses(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.event_form_fields(id) ON DELETE CASCADE,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_answers ENABLE ROW LEVEL SECURITY;

-- event_forms policies
CREATE POLICY "Members can view forms" ON public.event_forms FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Creator can insert forms" ON public.event_forms FOR INSERT TO authenticated WITH CHECK (is_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Creator or moderator can update forms" ON public.event_forms FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_permission(auth.uid(), 'events.moderate'));
CREATE POLICY "Creator or moderator can delete forms" ON public.event_forms FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_permission(auth.uid(), 'events.moderate'));

-- event_form_fields policies
CREATE POLICY "Members can view fields" ON public.event_form_fields FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM event_forms WHERE id = form_id));
CREATE POLICY "Form owner can insert fields" ON public.event_form_fields FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM event_forms WHERE id = form_id AND (created_by = auth.uid() OR has_permission(auth.uid(), 'events.moderate'))));
CREATE POLICY "Form owner can update fields" ON public.event_form_fields FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM event_forms WHERE id = form_id AND (created_by = auth.uid() OR has_permission(auth.uid(), 'events.moderate'))));
CREATE POLICY "Form owner can delete fields" ON public.event_form_fields FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM event_forms WHERE id = form_id AND (created_by = auth.uid() OR has_permission(auth.uid(), 'events.moderate'))));

-- event_form_responses policies
CREATE POLICY "Event owner or vorstand can view responses" ON public.event_form_responses FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM event_forms ef JOIN events e ON e.id = ef.event_id WHERE ef.id = form_id AND (e.created_by = auth.uid() OR is_vorstand(auth.uid())))
);
CREATE POLICY "Members can submit responses" ON public.event_form_responses FOR INSERT TO authenticated WITH CHECK (is_member(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Can delete own or manage responses" ON public.event_form_responses FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM event_forms ef JOIN events e ON e.id = ef.event_id WHERE ef.id = form_id AND (e.created_by = auth.uid() OR is_vorstand(auth.uid())))
);
CREATE POLICY "Can update own response" ON public.event_form_responses FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- event_form_answers policies
CREATE POLICY "Answers viewable with response access" ON public.event_form_answers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM event_form_responses r JOIN event_forms ef ON ef.id = r.form_id JOIN events e ON e.id = ef.event_id WHERE r.id = response_id AND (r.user_id = auth.uid() OR e.created_by = auth.uid() OR is_vorstand(auth.uid())))
);
CREATE POLICY "Can insert answers for own response" ON public.event_form_answers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM event_form_responses r WHERE r.id = response_id AND r.user_id = auth.uid())
);
CREATE POLICY "Can update own answers" ON public.event_form_answers FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM event_form_responses r WHERE r.id = response_id AND r.user_id = auth.uid())
);

-- Triggers
CREATE TRIGGER update_event_forms_updated_at BEFORE UPDATE ON public.event_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_event_form_responses_updated_at BEFORE UPDATE ON public.event_form_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to get form by public token (for guests)
CREATE OR REPLACE FUNCTION public.get_form_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'form', jsonb_build_object('id', f.id, 'title', f.title, 'description', f.description, 'is_open', f.is_open, 'event_id', f.event_id),
    'event', jsonb_build_object('title', e.title, 'start_date', e.start_date, 'end_date', e.end_date, 'location', e.location, 'all_day', e.all_day),
    'fields', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ff.id, 'type', ff.type, 'label', ff.label, 'description', ff.description, 'required', ff.required, 'sort_order', ff.sort_order, 'options', ff.options, 'settings', ff.settings) ORDER BY ff.sort_order) FROM event_form_fields ff WHERE ff.form_id = f.id), '[]'::jsonb)
  ) INTO _result
  FROM event_forms f
  JOIN events e ON e.id = f.event_id
  WHERE f.public_token = _token AND f.is_open = true;
  
  RETURN _result;
END;
$$;

-- Function to submit response (works for both guests and members)
CREATE OR REPLACE FUNCTION public.submit_form_response(_token text, _name text, _email text, _answers jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _form_id uuid;
  _response_id uuid;
  _answer jsonb;
BEGIN
  SELECT id INTO _form_id FROM event_forms WHERE public_token = _token AND is_open = true;
  IF _form_id IS NULL THEN
    RAISE EXCEPTION 'Formular nicht gefunden oder geschlossen';
  END IF;
  
  INSERT INTO event_form_responses (form_id, respondent_name, respondent_email, user_id)
  VALUES (_form_id, _name, _email, auth.uid())
  RETURNING id INTO _response_id;
  
  FOR _answer IN SELECT * FROM jsonb_array_elements(_answers)
  LOOP
    INSERT INTO event_form_answers (response_id, field_id, value)
    VALUES (_response_id, (_answer->>'field_id')::uuid, _answer->'value');
  END LOOP;
  
  RETURN _response_id;
END;
$$;
