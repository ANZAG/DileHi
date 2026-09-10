
CREATE OR REPLACE FUNCTION public.get_form_by_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'form', jsonb_build_object('id', f.id, 'title', f.title, 'description', f.description, 'is_open', f.is_open, 'event_id', f.event_id, 'settings', f.settings),
    'event', jsonb_build_object('title', e.title, 'start_date', e.start_date, 'end_date', e.end_date, 'location', e.location, 'all_day', e.all_day),
    'fields', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ff.id, 'type', ff.type, 'label', ff.label, 'description', ff.description, 'required', ff.required, 'sort_order', ff.sort_order, 'options', ff.options, 'settings', ff.settings) ORDER BY ff.sort_order) FROM event_form_fields ff WHERE ff.form_id = f.id), '[]'::jsonb)
  ) INTO _result
  FROM event_forms f
  JOIN events e ON e.id = f.event_id
  WHERE f.public_token = _token AND f.is_open = true;
  
  RETURN _result;
END;
$function$;
