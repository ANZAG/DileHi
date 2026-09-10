
-- Add edit_token column to event_form_responses
ALTER TABLE public.event_form_responses
ADD COLUMN IF NOT EXISTS edit_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex');

-- Create function to get response by edit token
CREATE OR REPLACE FUNCTION public.get_response_by_edit_token(_edit_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'form', jsonb_build_object('id', f.id, 'title', f.title, 'description', f.description, 'is_open', f.is_open, 'event_id', f.event_id, 'settings', f.settings),
    'event', jsonb_build_object('title', e.title, 'start_date', e.start_date, 'end_date', e.end_date, 'location', e.location, 'all_day', e.all_day),
    'fields', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ff.id, 'type', ff.type, 'label', ff.label, 'description', ff.description, 'required', ff.required, 'sort_order', ff.sort_order, 'options', ff.options, 'settings', ff.settings) ORDER BY ff.sort_order) FROM event_form_fields ff WHERE ff.form_id = f.id), '[]'::jsonb),
    'response', jsonb_build_object('id', r.id, 'respondent_name', r.respondent_name, 'respondent_email', r.respondent_email),
    'answers', COALESCE((SELECT jsonb_agg(jsonb_build_object('field_id', a.field_id, 'value', a.value)) FROM event_form_answers a WHERE a.response_id = r.id), '[]'::jsonb)
  ) INTO _result
  FROM event_form_responses r
  JOIN event_forms f ON f.id = r.form_id
  JOIN events e ON e.id = f.event_id
  WHERE r.edit_token = _edit_token AND f.is_open = true;

  RETURN _result;
END;
$$;

-- Create function to update response by edit token
CREATE OR REPLACE FUNCTION public.update_response_by_edit_token(_edit_token text, _name text, _email text, _answers jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _response_id uuid;
  _answer jsonb;
BEGIN
  SELECT r.id INTO _response_id
  FROM event_form_responses r
  JOIN event_forms f ON f.id = r.form_id
  WHERE r.edit_token = _edit_token AND f.is_open = true;

  IF _response_id IS NULL THEN
    RAISE EXCEPTION 'Anmeldung nicht gefunden oder Formular geschlossen';
  END IF;

  UPDATE event_form_responses SET respondent_name = _name, respondent_email = _email, updated_at = now()
  WHERE id = _response_id;

  DELETE FROM event_form_answers WHERE response_id = _response_id;

  FOR _answer IN SELECT * FROM jsonb_array_elements(_answers)
  LOOP
    INSERT INTO event_form_answers (response_id, field_id, value)
    VALUES (_response_id, (_answer->>'field_id')::uuid, _answer->'value');
  END LOOP;
END;
$$;
