-- Darstellungen absichern (Sicherheitsprüfung vom 28.11.2026).
--
-- 1. Bilder einer Darstellung nur aus dem eigenen Ordner.
--
-- Die Bildliste (`images`) war freier Text. Beim Freigeben kopiert der
-- Browser der freigebenden Person jedes dort genannte Bild aus dem internen
-- Speicher in die öffentliche Galerie – mit deren Leserechten. Ein Mitglied
-- konnte so Pfade wie `membership/<jemand>/antrag.jpg` oder
-- `announcements/…` eintragen; nach der Freigabe stand die Datei öffentlich.
-- Hochladen darf ein Mitglied ohnehin nur nach `personas/<eigene id>/`
-- (Speicherregel auf internal-files); genau das gilt jetzt auch für die Liste.
--
-- 2. Freigeben nur mit dem Recht „Darstellungen öffentlich freigeben".
--
-- „Users or leaders can update personas" gilt für alle Spalten. Ein Mitglied
-- konnte `is_public` und `public_images` an der eigenen Darstellung selbst
-- setzen und war damit ohne Freigabe auf der öffentlichen Website. Der
-- vorgesehene Weg ist set_persona_public(); die Funktion läuft mit den
-- Rechten des Aufrufers in auth.uid() und kommt deshalb durch.
--
-- 3. set_persona_public() nimmt als öffentliche Bilder nur die Kopien der
--    eigenen Bilder dieser Darstellung an: `personas/<darstellung>/<datei>`.
--
-- auth.uid() ist leer, wenn der Dienstschlüssel schreibt (Edge Functions,
-- Migrationen, Sicherung) – das bleibt erlaubt.

CREATE OR REPLACE FUNCTION public.darstellung_schuetzen()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ordner text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
     OR NEW.images IS DISTINCT FROM OLD.images
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    _ordner := 'personas/' || NEW.user_id::text || '/';
    IF EXISTS (
      SELECT 1
        FROM unnest(COALESCE(NEW.images, '{}'::text[])) AS b(pfad)
       WHERE pfad IS NULL
          OR left(pfad, length(_ordner)) <> _ordner
          -- Genau eine Datei darin: kein Unterordner, kein „..".
          OR substr(pfad, length(_ordner) + 1) IN ('', '.', '..')
          OR position('/' IN substr(pfad, length(_ordner) + 1)) > 0
          OR position('\' IN pfad) > 0
    ) THEN
      RAISE EXCEPTION 'Bilder einer Darstellung müssen im eigenen Ordner liegen (%).', _ordner
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NOT has_permission(auth.uid(), 'personas.publish') THEN
    IF TG_OP = 'INSERT' THEN
      IF COALESCE(NEW.is_public, false)
         OR COALESCE(cardinality(NEW.public_images), 0) > 0
         OR NEW.published_at IS NOT NULL
         OR NEW.published_by IS NOT NULL THEN
        RAISE EXCEPTION 'Öffentlich freigeben darf nur, wer Darstellungen freigibt'
          USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.is_public IS DISTINCT FROM OLD.is_public
       OR NEW.public_images IS DISTINCT FROM OLD.public_images
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.published_by IS DISTINCT FROM OLD.published_by THEN
      RAISE EXCEPTION 'Öffentlich freigeben darf nur, wer Darstellungen freigibt'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.darstellung_schuetzen() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.darstellung_schuetzen() FROM anon, authenticated;

DROP TRIGGER IF EXISTS darstellung_schuetzen ON public.member_personas;
CREATE TRIGGER darstellung_schuetzen
  BEFORE INSERT OR UPDATE ON public.member_personas
  FOR EACH ROW EXECUTE FUNCTION public.darstellung_schuetzen();


CREATE OR REPLACE FUNCTION public.set_persona_public(_persona_id uuid, _is_public boolean, _public_images text[] DEFAULT '{}'::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _bilder text[];
BEGIN
  IF NOT public.has_permission(auth.uid(), 'personas.publish') THEN
    RAISE EXCEPTION 'Keine Berechtigung, Darstellungen freizugeben';
  END IF;

  SELECT images INTO _bilder FROM public.member_personas WHERE id = _persona_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Darstellung nicht gefunden';
  END IF;

  -- Öffentlich nur die Kopien der eigenen Bilder: der Ordner dieser
  -- Darstellung in der Galerie, der Dateiname eines ihrer Bilder.
  IF _is_public AND EXISTS (
    SELECT 1
      FROM unnest(COALESCE(_public_images, '{}'::text[])) AS o(pfad)
     WHERE pfad IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(COALESCE(_bilder, '{}'::text[])) AS b(intern)
           WHERE o.pfad = 'personas/' || _persona_id::text || '/' || regexp_replace(b.intern, '^.*/', '')
        )
  ) THEN
    RAISE EXCEPTION 'Öffentlich werden nur die Bilder dieser Darstellung';
  END IF;

  UPDATE public.member_personas
  SET is_public     = _is_public,
      public_images = CASE WHEN _is_public THEN COALESCE(_public_images, '{}'::text[]) ELSE '{}'::text[] END,
      published_at  = CASE WHEN _is_public THEN now() ELSE NULL END,
      published_by  = CASE WHEN _is_public THEN auth.uid() ELSE NULL END,
      updated_at    = now()
  WHERE id = _persona_id;
END;
$function$;
