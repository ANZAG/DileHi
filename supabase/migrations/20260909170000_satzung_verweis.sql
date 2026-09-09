-- Der Verweis auf die Satzung im Aufnahmeantrag
--
-- {{satzung}} in der Zustimmung wird im Webformular zu einem Verweis. Dahinter
-- steht die Edge Function get-satzung-link: Sie nimmt das neueste Dokument der
-- Kategorie „Satzung & Ordnungen" und erzeugt dafür eine Adresse, die eine
-- Stunde gültig ist.
--
-- Diese Funktion ist ohne Anmeldung erreichbar – sie muss es sein, denn wer
-- einen Aufnahmeantrag stellt, hat noch kein Konto und soll lesen können, was
-- er anerkennt. Damit ist die Satzung aber faktisch für jeden abrufbar, der
-- die Adresse kennt.
--
-- Nicht jeder Verein will das. Deshalb ein Schalter: Ist er aus, bleibt in der
-- Zustimmung das Wort „Satzung" als Text stehen, ohne Verweis. Der Satz
-- funktioniert weiterhin, und wer die Satzung sehen will, fragt danach.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS satzung_link boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.app_settings.satzung_link IS
  'Verlinkt {{satzung}} im Aufnahmeantrag auf das hinterlegte Dokument. Aus = nur Text.';

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
  logo_in_header   boolean,
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
  footer_legal_label      text,
  satzung_link     boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_name, org_short_name, org_tagline, org_street, org_zip, org_city,
         org_country, org_email, org_phone,
         logo_path, favicon_path, logo_in_header, color_primary, color_dark,
         seo_description, seo_image_path, website_url, font_headings, font_body,
         board_members, register_court, register_number, vat_id,
         privacy_contact, privacy_officer, hosting_provider, hosting_address,
         footer_navigation_label, footer_legal_label, satzung_link
  FROM public.app_settings
  WHERE id;
$$;

REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated;
