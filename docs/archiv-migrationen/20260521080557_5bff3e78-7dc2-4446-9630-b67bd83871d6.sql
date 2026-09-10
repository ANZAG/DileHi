
-- 1) Auto-match user_id by email in submit_form_response
CREATE OR REPLACE FUNCTION public.submit_form_response(_token text, _name text, _email text, _answers jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _form_id uuid;
  _response_id uuid;
  _edit_token text;
  _answer jsonb;
  _user_id uuid;
  _matched_id uuid;
BEGIN
  SELECT id INTO _form_id FROM event_forms WHERE public_token = _token AND is_open = true;
  IF _form_id IS NULL THEN
    RAISE EXCEPTION 'Formular nicht gefunden oder geschlossen';
  END IF;

  _user_id := auth.uid();

  -- If not logged in but email matches an active member, auto-link
  IF _user_id IS NULL AND _email IS NOT NULL AND length(trim(_email)) > 0 THEN
    SELECT u.id INTO _matched_id
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = lower(trim(_email))
      AND COALESCE(p.is_active, true) = true
      AND public.is_member(u.id)
    LIMIT 1;
    IF _matched_id IS NOT NULL THEN
      _user_id := _matched_id;
    END IF;
  END IF;

  INSERT INTO event_form_responses (form_id, respondent_name, respondent_email, user_id)
  VALUES (_form_id, _name, _email, _user_id)
  RETURNING id, edit_token INTO _response_id, _edit_token;

  FOR _answer IN SELECT * FROM jsonb_array_elements(_answers)
  LOOP
    INSERT INTO event_form_answers (response_id, field_id, value)
    VALUES (_response_id, (_answer->>'field_id')::uuid, _answer->'value');
  END LOOP;

  RETURN _edit_token;
END;
$function$;

-- 2) Manual assignment RPC for organizers / vorstand
CREATE OR REPLACE FUNCTION public.assign_response_to_member(_response_id uuid, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _event_owner uuid;
BEGIN
  SELECT e.created_by INTO _event_owner
  FROM event_form_responses r
  JOIN event_forms ef ON ef.id = r.form_id
  JOIN events e ON e.id = ef.event_id
  WHERE r.id = _response_id;

  IF _event_owner IS NULL THEN
    RAISE EXCEPTION 'Anmeldung nicht gefunden';
  END IF;

  IF NOT (
    _event_owner = auth.uid()
    OR public.is_vorstand(auth.uid())
    OR public.has_permission(auth.uid(), 'events.moderate')
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  IF _user_id IS NOT NULL AND NOT public.is_member(_user_id) THEN
    RAISE EXCEPTION 'Zielnutzer ist kein aktives Mitglied';
  END IF;

  UPDATE event_form_responses
  SET user_id = _user_id, updated_at = now()
  WHERE id = _response_id;
END;
$function$;
