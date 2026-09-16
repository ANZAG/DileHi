-- Wo die Einrichtung stehengeblieben ist
--
-- Der geführte Durchlauf fragt der Reihe nach, was eine Installation braucht.
-- Wer ihn unterbricht — und das tut jeder, weil zwischendurch das Telefon
-- klingelt —, soll an derselben Stelle weitermachen können. Und zwar auch am
-- nächsten Tag, an einem anderen Rechner, und auch, wenn ihn jemand anderes
-- aus dem Vorstand fortsetzt.
--
-- Deshalb steht der Stand in der Datenbank und nicht im Browser. Es ist die
-- Einrichtung der Organisation, nicht die eines Geräts.
--
--   setup_step      der zuletzt erledigte Schritt (0 = noch gar nichts)
--   setup_done_at   wann der Durchlauf abgeschlossen wurde; danach öffnet er
--                   sich nicht mehr von selbst, ist aber weiter erreichbar

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS setup_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_done_at timestamp with time zone;

COMMENT ON COLUMN public.app_settings.setup_step IS
  'Zuletzt erledigter Schritt des Einrichtungsprozesses. 0 = noch nicht begonnen.';

-- Eine Installation, die schon läuft, hat den Durchlauf nicht nötig: Wer
-- Vereinsdaten und Mitglieder hat, bekommt ihn nicht vorgesetzt. Das betrifft
-- DileHi und jede Installation, die vor diesem Stand eingerichtet wurde.
UPDATE public.app_settings
   SET setup_done_at = now()
 WHERE setup_done_at IS NULL
   AND coalesce(btrim(org_name), '') NOT IN ('', 'Mein Verein e. V.')
   AND EXISTS (SELECT 1 FROM public.user_roles);

-- Der Stand gehört in die Auskunft, aus der der Assistent liest.
CREATE OR REPLACE FUNCTION public.setup_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ergebnis jsonb;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'system.settings') THEN
    RAISE EXCEPTION 'Keine Berechtigung für die Einstellungen';
  END IF;

  SELECT jsonb_build_object(
    'migrationen', (
      SELECT coalesce(jsonb_agg(version ORDER BY version), '[]'::jsonb)
      FROM supabase_migrations.schema_migrations
    ),
    'rollen_vergeben', (SELECT count(*) FROM public.user_roles),
    'mitglieder', (SELECT count(*) FROM public.profiles),
    'module', (SELECT count(*) FROM public.app_modules),
    'durchlauf', (
      SELECT jsonb_build_object('schritt', s.setup_step, 'fertig_am', s.setup_done_at)
      FROM public.app_settings s LIMIT 1
    ),
    'verein', (
      SELECT jsonb_build_object(
        'org_form', s.org_form,
        'name', nullif(btrim(coalesce(s.org_name, '')), ''),
        'anschrift', nullif(btrim(coalesce(s.org_street, '')), '') IS NOT NULL
                 AND nullif(btrim(coalesce(s.org_zip, '')), '') IS NOT NULL
                 AND nullif(btrim(coalesce(s.org_city, '')), '') IS NOT NULL,
        'email', nullif(btrim(coalesce(s.org_email, '')), ''),
        'web', nullif(btrim(coalesce(s.website_url, '')), ''),
        'vorstand', nullif(btrim(coalesce(s.board_members, '')), '') IS NOT NULL,
        'register', nullif(btrim(coalesce(s.register_court, '')), '') IS NOT NULL
                AND nullif(btrim(coalesce(s.register_number, '')), '') IS NOT NULL,
        'mail_weg', s.mail_transport,
        'absender', nullif(btrim(coalesce(s.mail_from_address, '')), ''),
        'ablage', s.file_storage,
        'sharepoint_site', nullif(btrim(coalesce(s.sharepoint_site_url, '')), ''),
        'logo', s.logo_path IS NOT NULL,
        'farbe_gesetzt', s.color_primary IS DISTINCT FROM '#dd9933'
      )
      FROM public.app_settings s
      LIMIT 1
    ),
    'seiten', (
      SELECT jsonb_object_agg(slug, is_published)
      FROM public.site_pages
      WHERE slug IN ('startseite', 'impressum', 'datenschutz')
    ),
    'menue', (
      SELECT jsonb_build_object(
        'kopf', count(*) FILTER (WHERE area = 'header'),
        'fuss', count(*) FILTER (WHERE area = 'footer_legal')
      )
      FROM public.site_menu
      WHERE is_visible
    )
  )
  INTO ergebnis;

  IF ergebnis -> 'verein' ->> 'name' = 'Mein Verein e. V.' THEN
    ergebnis := jsonb_set(ergebnis, '{verein,name}', 'null'::jsonb);
  END IF;

  RETURN ergebnis;
END;
$$;

REVOKE ALL ON FUNCTION public.setup_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setup_status() TO authenticated, service_role;

-- Damit die Startseite des Mitgliederbereichs weiss, ob die Einrichtung noch
-- offen ist, ohne dafür eine eigene Abfrage zu schicken: Die Angaben, die jede
-- Seite ohnehin lädt, tragen es mit. Geheim ist daran nichts.
DROP FUNCTION IF EXISTS public.public_branding();

CREATE FUNCTION public.public_branding()
 RETURNS TABLE(org_form text, setup_done_at timestamp with time zone, org_name text, org_short_name text, org_tagline text, org_street text, org_zip text, org_city text, org_country text, org_email text, org_phone text, logo_path text, favicon_path text, logo_in_header boolean, color_primary text, color_dark text, color_surface text, seo_description text, seo_image_path text, website_url text, font_headings text, font_body text, board_members text, register_court text, register_number text, vat_id text, privacy_contact text, privacy_officer text, hosting_provider text, hosting_address text, footer_navigation_label text, footer_legal_label text, statutes_link boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT org_form, setup_done_at, org_name, org_short_name, org_tagline, org_street, org_zip, org_city,
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
