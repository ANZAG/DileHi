-- Eine eigene Schriftfarbe für Hervorhebungen.
--
-- Die Vereinsfarbe dient zugleich als Fläche (Knöpfe, Bänder) und als Schrift
-- (Vereinsname im Kopf, aktiver Menüpunkt, Jahreszahlen, Links). Ein kräftiges
-- Orange ist als Fläche richtig, als Schrift auf hellem Grund aber zu blass:
-- auf dilehi.de 2,2 : 1, gefordert sind 4,5 : 1.
--
-- Der erste Versuch dunkelte die Vereinsfarbe automatisch ab. Heraus kam ein
-- Braun, das zu keinem Verein passt, der Orange gewählt hat. Deshalb wählt der
-- Verein den Ton selbst – die Maske zeigt dabei, ob er lesbar ist.
--
-- Leer bleibt alles wie bisher: Die Schrift steht in der Vereinsfarbe.
--
-- Wiederholbar: Die Spalte wird nur angelegt, wenn sie fehlt, die Funktion
-- vollständig neu geschrieben.

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS color_accent_text text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_color_accent_text_hex') THEN
    ALTER TABLE public.app_settings
      ADD CONSTRAINT app_settings_color_accent_text_hex
      CHECK (color_accent_text IS NULL OR color_accent_text ~ '^#[0-9a-fA-F]{6}$');
  END IF;
END $$;

COMMENT ON COLUMN public.app_settings.color_accent_text IS
  'Schriftfarbe für Hervorhebungen auf hellem Grund (#rrggbb). Leer: die Vereinsfarbe selbst.';

-- public_branding liefert die Spalte mit aus. Die Rückgabe ändert sich,
-- deshalb DROP und CREATE statt CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.public_branding();

CREATE FUNCTION public.public_branding()
 RETURNS TABLE(org_form text, setup_done_at timestamp with time zone, org_name text, org_short_name text, org_tagline text, org_street text, org_zip text, org_city text, org_country text, org_email text, org_phone text, logo_path text, favicon_path text, logo_in_header boolean, color_primary text, color_dark text, color_surface text, color_muted text, color_accent_text text, seo_description text, seo_image_path text, website_url text, font_headings text, font_body text, board_members text, register_court text, register_number text, vat_id text, privacy_contact text, privacy_officer text, hosting_provider text, hosting_address text, footer_navigation_label text, footer_legal_label text, statutes_link boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT org_form, setup_done_at, org_name, org_short_name, org_tagline, org_street, org_zip, org_city,
         org_country, org_email, org_phone,
         logo_path, favicon_path, logo_in_header, color_primary, color_dark,
         color_surface, color_muted, color_accent_text, seo_description, seo_image_path, website_url,
         font_headings, font_body,
         board_members, register_court, register_number, vat_id,
         privacy_contact, privacy_officer, hosting_provider, hosting_address,
         footer_navigation_label, footer_legal_label, statutes_link
  FROM public.app_settings
  WHERE id;
$function$;

REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated, service_role;
