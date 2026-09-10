-- Der Fußbereich wird verwaltbar
--
-- Kopfmenü und Navigation im Fuß kommen bereits aus site_menu. Die Spalte
-- „Rechtliches" stand aber weiterhin fest im Code – mit unseren beiden Links.
-- Ein anderer Verein, der eine dritte Seite braucht (etwa eine
-- Barrierefreiheitserklärung) oder unsere Bezeichnungen nicht mag, müsste
-- dafür einen Entwickler holen.
--
-- Statt einer zweiten Tabelle bekommt site_menu einen Bereich. Die Verwaltung
-- ist dieselbe, nur mit einem Umschalter davor.

ALTER TABLE public.site_menu
  ADD COLUMN IF NOT EXISTS bereich text NOT NULL DEFAULT 'kopf';

ALTER TABLE public.site_menu
  DROP CONSTRAINT IF EXISTS site_menu_bereich_check;

ALTER TABLE public.site_menu
  ADD CONSTRAINT site_menu_bereich_check
  CHECK (bereich IN ('kopf', 'fuss_rechtliches'));

COMMENT ON COLUMN public.site_menu.bereich IS
  'kopf = Menue in der Kopfzeile, fuss_rechtliches = Spalte "Rechtliches" im Fussbereich.';

DROP INDEX IF EXISTS site_menu_sort_idx;
CREATE INDEX site_menu_sort_idx ON public.site_menu (bereich, parent_id, sort_order);

-- Die bisher fest eingebauten Links übernehmen, damit sich nach dieser
-- Migration nichts ändert.
INSERT INTO public.site_menu (label, href, bereich, sort_order)
SELECT * FROM (VALUES
  ('Impressum',  '/impressum',  'fuss_rechtliches', 10),
  ('Datenschutz', '/datenschutz', 'fuss_rechtliches', 20)
) AS v(label, href, bereich, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_menu WHERE bereich = 'fuss_rechtliches'
);

-- ══ Beschriftungen des Fußbereichs ══════════════════════════════════════════
--
-- Die Überschriften der Spalten und der Zusatz unter dem Vereinsnamen standen
-- ebenfalls im Code.
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS footer_navigation_label text NOT NULL DEFAULT 'Navigation',
  ADD COLUMN IF NOT EXISTS footer_legal_label      text NOT NULL DEFAULT 'Rechtliches';

UPDATE public.app_settings
SET org_tagline = COALESCE(NULLIF(org_tagline, ''), 'Living History aus Wiesbaden – Geschichte erleben.')
WHERE id;

-- Auch die öffentliche Fassung muss die Beschriftungen kennen: Der Fußbereich
-- steht auf jeder Seite, auch vor der Anmeldung.
DROP FUNCTION IF EXISTS public.public_branding();

CREATE OR REPLACE FUNCTION public.public_branding()
RETURNS TABLE (
  org_name         text,
  org_short_name   text,
  org_tagline      text,
  org_street       text,
  org_zip          text,
  org_city         text,
  org_country      text,
  org_email        text,
  org_phone        text,
  logo_path        text,
  favicon_path     text,
  color_primary    text,
  color_dark       text,
  seo_description  text,
  seo_image_path   text,
  website_url      text,
  font_headings    text,
  font_body        text,
  board_members    text,
  register_court   text,
  register_number  text,
  vat_id           text,
  privacy_contact  text,
  privacy_officer  text,
  hosting_provider text,
  hosting_address  text,
  footer_navigation_label text,
  footer_legal_label      text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_name, org_short_name, org_tagline, org_street, org_zip, org_city,
         org_country, org_email, org_phone,
         logo_path, favicon_path, color_primary, color_dark,
         seo_description, seo_image_path, website_url, font_headings, font_body,
         board_members, register_court, register_number, vat_id,
         privacy_contact, privacy_officer, hosting_provider, hosting_address,
         footer_navigation_label, footer_legal_label
  FROM public.app_settings
  WHERE id;
$$;

REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated;
