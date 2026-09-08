-- Schriftarten in den Vereinsdaten
--
-- Bisher standen sie fest im Stylesheet. Für die Standalone-Fassung heisst das:
-- Jeder Verein arbeitet mit denselben zwei Schriften wie wir, und das eigene
-- Erscheinungsbild endet bei der Farbe.
--
-- Angeboten werden nur Schriften unter der SIL Open Font License. Die erlaubt
-- ausdrücklich die Weitergabe und den Einsatz auf beliebigen Websites, auch
-- kommerziell – anders als viele „kostenlose" Schriften, deren Lizenz das nur
-- für private Zwecke hergibt. Die Auswahl steht im Frontend (schriften.ts);
-- hier stehen nur die Namen.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS font_headings text NOT NULL DEFAULT 'DM Serif Display',
  ADD COLUMN IF NOT EXISTS font_body     text NOT NULL DEFAULT 'Inter';

COMMENT ON COLUMN public.app_settings.font_headings IS
  'Schrift fuer Ueberschriften. Name wie bei Google Fonts, SIL OFL.';
COMMENT ON COLUMN public.app_settings.font_body IS
  'Schrift fuer Fliesstext. Name wie bei Google Fonts, SIL OFL.';

-- Die öffentliche Fassung mitziehen: Die Startseite muss die Schriften kennen,
-- bevor sich jemand anmeldet.
CREATE OR REPLACE FUNCTION public.public_branding()
RETURNS TABLE (
  org_name        text,
  org_short_name  text,
  org_tagline     text,
  logo_path       text,
  favicon_path    text,
  color_primary   text,
  color_dark      text,
  seo_description text,
  seo_image_path  text,
  website_url     text,
  font_headings   text,
  font_body       text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_name, org_short_name, org_tagline, logo_path, favicon_path,
         color_primary, color_dark, seo_description, seo_image_path, website_url,
         font_headings, font_body
  FROM public.app_settings
  WHERE id;
$$;

REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated;
