-- Darstellungen öffentlich zeigen – anonymisiert
--
-- Für Museen und Veranstalter ist interessant, WAS der Verein darstellt, nicht
-- WER es darstellt. Deshalb erscheinen öffentlich nur Epoche, Darstellung,
-- Kenntnisse und Bilder – kein Name, keine Nutzerkennung.
--
-- Freigegeben wird je Steckbrief, nicht pauschal: Sonst landet etwas im Netz,
-- das jemand nur für den internen Gebrauch eingetragen hat.

ALTER TABLE public.member_personas
  ADD COLUMN IF NOT EXISTS is_public         boolean NOT NULL DEFAULT false,
  -- Öffentlich sichtbare Kopien der Bilder. Die Originale liegen im privaten
  -- Bucket internal-files und bleiben dort.
  ADD COLUMN IF NOT EXISTS public_images     text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS published_at      timestamptz,
  ADD COLUMN IF NOT EXISTS published_by      uuid;

COMMENT ON COLUMN public.member_personas.is_public IS
  'Vom Herold freigegeben. Oeffentlich erscheinen nur Epoche, Darstellung, Kenntnisse und Bilder - nie der Name.';

-- ── Recht für die Freigabe ──────────────────────────────────────────────────
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES
  ('personas.publish', 'Darstellungen öffentlich freigeben', 'inhalte', 250)
ON CONFLICT (key) DO NOTHING;

-- Herold macht die Öffentlichkeitsarbeit; der geschäftsführende Vorstand ebenso.
INSERT INTO public.role_permissions (role, permission, granted)
SELECT r.role, 'personas.publish', true
FROM (VALUES
  ('herold'::public.app_role),
  ('officiatus_1'::public.app_role),
  ('officiatus_2'::public.app_role)
) AS r(role)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role = r.role AND rp.permission = 'personas.publish'
);

-- ── Freigabe setzen ─────────────────────────────────────────────────────────
--
-- Bewusst über eine Funktion statt über eine erweiterte UPDATE-Policy: So kann
-- der Herold die Freigabe umlegen, ohne fremde Steckbriefe inhaltlich ändern zu
-- können.
CREATE OR REPLACE FUNCTION public.set_persona_public(
  _persona_id uuid,
  _is_public boolean,
  _public_images text[] DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'personas.publish') THEN
    RAISE EXCEPTION 'Keine Berechtigung, Darstellungen freizugeben';
  END IF;

  UPDATE public.member_personas
  SET is_public     = _is_public,
      public_images = CASE WHEN _is_public THEN _public_images ELSE '{}'::text[] END,
      published_at  = CASE WHEN _is_public THEN now() ELSE NULL END,
      published_by  = CASE WHEN _is_public THEN auth.uid() ELSE NULL END,
      updated_at    = now()
  WHERE id = _persona_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Darstellung nicht gefunden';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_persona_public(uuid, boolean, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_persona_public(uuid, boolean, text[]) TO authenticated;

-- ── Öffentliche Ansicht ─────────────────────────────────────────────────────
--
-- Gibt bewusst weder user_id noch id zurück: Sonst liesse sich über die
-- Reihenfolge oder eine spaetere Abfrage doch eine Person zuordnen.
CREATE OR REPLACE FUNCTION public.get_public_personas()
RETURNS TABLE (period text, portrayal text, expertise text, images text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.period, p.portrayal, p.expertise, p.public_images
  FROM public.member_personas p
  WHERE p.is_public
  ORDER BY p.period, p.sort_order, p.id
$$;

COMMENT ON FUNCTION public.get_public_personas() IS
  'Freigegebene Darstellungen ohne Personenbezug - fuer die oeffentliche Website und die Einbindung.';

REVOKE ALL ON FUNCTION public.get_public_personas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_personas() TO anon, authenticated;
