
DROP FUNCTION IF EXISTS public.submit_form_response(text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.submit_form_response(_token text, _name text, _email text, _answers jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _form_id uuid;
  _response_id uuid;
  _edit_token text;
  _answer jsonb;
BEGIN
  SELECT id INTO _form_id FROM event_forms WHERE public_token = _token AND is_open = true;
  IF _form_id IS NULL THEN
    RAISE EXCEPTION 'Formular nicht gefunden oder geschlossen';
  END IF;
  
  INSERT INTO event_form_responses (form_id, respondent_name, respondent_email, user_id)
  VALUES (_form_id, _name, _email, auth.uid())
  RETURNING id, edit_token INTO _response_id, _edit_token;
  
  FOR _answer IN SELECT * FROM jsonb_array_elements(_answers)
  LOOP
    INSERT INTO event_form_answers (response_id, field_id, value)
    VALUES (_response_id, (_answer->>'field_id')::uuid, _answer->'value');
  END LOOP;
  
  RETURN _edit_token;
END;
$$;
