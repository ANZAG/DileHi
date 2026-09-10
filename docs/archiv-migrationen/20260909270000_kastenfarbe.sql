-- Die Farbe der Kästen
--
-- Bisher waren zwei Farben einstellbar: die Vereinsfarbe und ein dunkler Ton.
-- Alles andere – die Flächen, auf denen Inhalte liegen – kam aus dem
-- Stylesheet und war ein warmes Grau. Für einen Verein, der seine Seite auf
-- Weiss oder auf einen anderen Ton stellen möchte, gab es keinen Weg dorthin.
--
-- Bewusst EINE Farbe und nicht drei.
--
-- Aus ihr werden Kasten, gedämpfte Fläche, Rahmen und der Seitengrund
-- abgeleitet, indem die Helligkeit gestaffelt wird. Drei Farbwähler
-- nebeneinander wären ein zuverlässiger Weg zu einer Seite, auf der ein Kasten
-- vom Grund nicht mehr zu unterscheiden ist – dieselbe Falle wie beim dunklen
-- Ton, der deshalb schon eine Plausibilitätsprüfung hat.
--
-- Der Vorgabewert ist genau das bisherige Grau (hsl(40 15% 95%) aus
-- index.css), damit sich für niemanden etwas ändert, der nichts einstellt.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS color_surface text NOT NULL DEFAULT '#f4f2ee';

COMMENT ON COLUMN public.app_settings.color_surface IS
  'Farbe der Kaesten. Daraus werden Flaeche, Rahmen und Seitengrund abgeleitet.';

-- Auch die öffentliche Abfrage liefert sie: Die Seite soll nicht erst grau
-- aufblitzen und dann umschalten.
--
-- DROP vorweg, weil sich die Rückgabespalten ändern – CREATE OR REPLACE kann
-- das nicht.
DROP FUNCTION IF EXISTS public.public_branding();

CREATE FUNCTION public.public_branding()
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
  color_surface    text,
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
AS $fn$
  SELECT org_name, org_short_name, org_tagline, org_street, org_zip, org_city,
         org_country, org_email, org_phone,
         logo_path, favicon_path, logo_in_header, color_primary, color_dark,
         color_surface, seo_description, seo_image_path, website_url,
         font_headings, font_body,
         board_members, register_court, register_number, vat_id,
         privacy_contact, privacy_officer, hosting_provider, hosting_address,
         footer_navigation_label, footer_legal_label, satzung_link
  FROM public.app_settings
  WHERE id;
$fn$;

COMMENT ON FUNCTION public.public_branding() IS
  'Vereinsname, Logo, Farben und Rechtsangaben fuer die oeffentliche Website. Keine Mailadressen der Mitglieder.';

REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated;
