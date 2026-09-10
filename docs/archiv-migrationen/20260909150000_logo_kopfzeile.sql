-- Das Logo in der Kopfzeile abschaltbar
--
-- Bisher galt: Ist ein Logo hinterlegt, steht es neben dem Vereinsnamen. Das
-- ist nicht fuer jedes Logo richtig. Ein breites Wappen neben einem langen
-- Namen laesst auf dem Handy nichts mehr uebrig, und manche Vereine haben ein
-- Logo, das sie im Antrag und in Mails wollen, aber nicht in der Kopfzeile.
--
-- Deshalb ein eigener Schalter statt „Logo entfernen": Das Logo bleibt
-- hinterlegt und wird weiterhin auf dem Aufnahmeantrag gedruckt.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS logo_in_header boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.app_settings.logo_in_header IS
  'Zeigt das Logo neben dem Vereinsnamen in der Kopfzeile. Betrifft nur die Kopfzeile.';

-- Die oeffentliche Fassung muss den Schalter kennen: Die Kopfzeile steht auf
-- jeder Seite, auch vor der Anmeldung.
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
  footer_legal_label      text
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
         footer_navigation_label, footer_legal_label
  FROM public.app_settings
  WHERE id;
$$;

REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated;
