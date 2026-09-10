-- Formular-Einstellungen: verlustfreies Speichern
--
-- Problem: event_forms.settings ist ein JSONB-Blob, und zwei Seiten schreiben
-- hinein – der Formular-Baukasten (Titel, Öffnungszeitraum, Zelt-Abstand,
-- WhatsApp-Link, Kartenbild) und die Auswertung (Zelt-Abstand, Vereinszelte,
-- Küchen- und Veranstaltungsleitung, Pool-Zelte, Programmpunkte, Zeltpositionen,
-- Kartenbild). Zelt-Abstand und Kartenbild liegen sogar auf beiden Seiten.
--
-- Beide Seiten lasen bisher den zwischengespeicherten Stand aus dem Browser,
-- führten ihn mit ihrer Änderung zusammen und schrieben den ganzen Blob zurück:
--
--     settings: { ...form.settings, ...patch }
--
-- Der Query-Cache hält zwei Minuten. Wer den Baukasten offen hat, während auf
-- der Auswertungsseite etwas geändert wird, überschreibt beim nächsten Klick
-- die fremde Änderung stillschweigend. Genau daher rühren die Berichte, dass
-- eine Einstellung "eben noch da war".
--
-- Lösung: Das Zusammenführen passiert in der Datenbank mit dem JSONB-Operator
-- `||`. Gesendet wird nur noch die tatsächliche Änderung, nie der ganze Blob.

CREATE OR REPLACE FUNCTION public.update_form_settings(_form_id uuid, _patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _created_by uuid;
  _result jsonb;
BEGIN
  IF jsonb_typeof(_patch) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Einstellungen müssen ein JSON-Objekt sein';
  END IF;

  SELECT created_by INTO _created_by FROM public.event_forms WHERE id = _form_id;
  IF _created_by IS NULL THEN
    RAISE EXCEPTION 'Formular nicht gefunden';
  END IF;

  -- Dieselbe Bedingung wie die UPDATE-Policy auf event_forms.
  IF NOT (_created_by = auth.uid() OR public.has_permission(auth.uid(), 'events.moderate')) THEN
    RAISE EXCEPTION 'Keine Berechtigung, dieses Formular zu ändern';
  END IF;

  -- Verhindert, dass zwei gleichzeitige Änderungen einander überholen.
  PERFORM pg_advisory_xact_lock(hashtext(_form_id::text));

  UPDATE public.event_forms
  SET settings = COALESCE(settings, '{}'::jsonb) || _patch,
      updated_at = now()
  WHERE id = _form_id
  RETURNING settings INTO _result;

  RETURN _result;
END;
$$;

COMMENT ON FUNCTION public.update_form_settings(uuid, jsonb) IS
  'Fuehrt eine Teilaenderung in event_forms.settings zusammen, ohne fremde Schluessel zu verlieren. Ein Wert wird geloescht, indem er als JSON-null uebergeben wird - dafuer danach jsonb_strip_nulls verwenden, falls noetig.';

REVOKE ALL ON FUNCTION public.update_form_settings(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_form_settings(uuid, jsonb) TO authenticated;
