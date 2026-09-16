-- Die Organisationsform gehört zu den Angaben, die jede Seite braucht
--
-- „Vereinsdokumente", „Vereinsleitung", „Satzung": In diesen Wörtern steckt
-- eine Annahme darüber, wie die Gruppe organisiert ist. Damit die Oberfläche
-- die richtigen benutzt, muss sie die Form kennen — und zwar überall, auch auf
-- der öffentlichen Seite, ohne zusätzliche Abfrage.
--
-- `public_branding()` liefert ohnehin die Angaben, die jede Seite braucht. Eine
-- Spalte mehr, und die Wortwahl steht dort, wo Name, Farben und Schriften schon
-- stehen.
--
-- Die Form ist keine geheime Angabe: Ob ein Verein eingetragen ist, steht im
-- Impressum. Sie darf deshalb wie der Rest über `anon` hinausgehen.

DROP FUNCTION IF EXISTS public.public_branding();

CREATE FUNCTION public.public_branding()
 RETURNS TABLE(org_form text, org_name text, org_short_name text, org_tagline text, org_street text, org_zip text, org_city text, org_country text, org_email text, org_phone text, logo_path text, favicon_path text, logo_in_header boolean, color_primary text, color_dark text, color_surface text, seo_description text, seo_image_path text, website_url text, font_headings text, font_body text, board_members text, register_court text, register_number text, vat_id text, privacy_contact text, privacy_officer text, hosting_provider text, hosting_address text, footer_navigation_label text, footer_legal_label text, statutes_link boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT org_form, org_name, org_short_name, org_tagline, org_street, org_zip, org_city,
         org_country, org_email, org_phone,
         logo_path, favicon_path, logo_in_header, color_primary, color_dark,
         color_surface, seo_description, seo_image_path, website_url,
         font_headings, font_body,
         board_members, register_court, register_number, vat_id,
         privacy_contact, privacy_officer, hosting_provider, hosting_address,
         footer_navigation_label, footer_legal_label, statutes_link
  FROM public.app_settings
  WHERE id;
$function$;

REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated, service_role;
