-- Angaben für Impressum und Datenschutzerklärung
--
-- Beide Seiten stehen bisher fest im Code, mit unserem Namen, unserer
-- Anschrift und unserem Vorstand darin. Ein anderer Verein müsste sie
-- abschreiben und dabei jede Stelle finden, an der etwas Eigenes steht –
-- und ein Impressum, in dem eine Stelle vergessen wurde, ist abmahnfähig.
--
-- Deshalb kommen die veränderlichen Angaben in die Vereinsdaten. Der
-- Standardtext bleibt Text, den jeder Verein bearbeiten kann; die Angaben
-- darin setzt die Anwendung ein.

ALTER TABLE public.app_settings
  -- § 5 DDG (früher TMG): Wer vertritt den Verein?
  ADD COLUMN IF NOT EXISTS board_members     text,
  ADD COLUMN IF NOT EXISTS register_court    text,
  ADD COLUMN IF NOT EXISTS register_number   text,
  ADD COLUMN IF NOT EXISTS vat_id            text,
  -- Art. 13 DSGVO: An wen wenden sich Betroffene?
  ADD COLUMN IF NOT EXISTS privacy_contact   text,
  ADD COLUMN IF NOT EXISTS privacy_officer   text,
  -- Wo läuft die Installation? Steht in der Erklärung unter „Hosting".
  ADD COLUMN IF NOT EXISTS hosting_provider  text,
  ADD COLUMN IF NOT EXISTS hosting_address   text;

COMMENT ON COLUMN public.app_settings.board_members IS
  'Vertretungsberechtigter Vorstand, eine Person je Zeile. Pflichtangabe nach § 5 DDG.';
COMMENT ON COLUMN public.app_settings.register_court IS
  'Registergericht, z. B. "Amtsgericht Wiesbaden".';
COMMENT ON COLUMN public.app_settings.register_number IS
  'Vereinsregisternummer, z. B. "VR 5378".';
COMMENT ON COLUMN public.app_settings.privacy_officer IS
  'Datenschutzbeauftragter, falls einer bestellt ist. Fuer die meisten Vereine leer.';

-- Unsere eigenen Angaben eintragen, damit die Seiten nach der Umstellung
-- dasselbe zeigen wie vorher.
UPDATE public.app_settings
SET board_members    = COALESCE(board_members, 'Eric Treisbach'),
    register_court   = COALESCE(register_court, 'Amtsgericht Wiesbaden'),
    register_number  = COALESCE(register_number, 'VR 5378'),
    hosting_provider = COALESCE(hosting_provider, 'Lovable Cloud (Supabase)'),
    privacy_contact  = COALESCE(privacy_contact, org_email)
WHERE id;

-- Die öffentliche Fassung mitziehen: Impressum und Datenschutzerklärung sind
-- öffentliche Seiten und müssen ohne Anmeldung vollständig sein.
--
-- CREATE OR REPLACE reicht nicht, wenn Spalten dazukommen (siehe 20260908090000).
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
  hosting_address  text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Anschrift und Mailadresse gehören hier ausdrücklich dazu: Sie stehen im
  -- Impressum, und das muss jeder ohne Anmeldung lesen können.
  SELECT org_name, org_short_name, org_tagline, org_street, org_zip, org_city,
         org_country, org_email, org_phone,
         logo_path, favicon_path, color_primary, color_dark,
         seo_description, seo_image_path, website_url, font_headings, font_body,
         board_members, register_court, register_number, vat_id,
         privacy_contact, privacy_officer, hosting_provider, hosting_address
  FROM public.app_settings
  WHERE id;
$$;

REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated;
