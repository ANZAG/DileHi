-- Genauere Arten für die strukturierten Daten
--
-- Die erste Fassung kannte drei: keine, Organisation, Artikel. Damit blieb
-- offen, was „Über uns" und „Für Veranstalter" sein sollen – und es lud dazu
-- ein, „Organisation" mehrfach zu setzen.
--
-- Das wäre ein Fehler, den man nicht sieht: Der Verein ist EINE Sache, nicht
-- drei. Wer ihn auf drei Seiten als eigenständige Organisation ausweist, gibt
-- Suchmaschinen drei Kandidaten für dieselbe Frage – welcher gewinnt, ist
-- Glückssache, und keiner davon sammelt die Merkmale der anderen.
--
-- Deshalb zwei zusätzliche Arten, die genau das ausdrücken, was diese Seiten
-- sind: eine Seite ÜBER den Verein und eine Seite über ein ANGEBOT.

ALTER TABLE public.site_pages
  DROP CONSTRAINT IF EXISTS site_pages_seo_type_check;

ALTER TABLE public.site_pages
  ADD CONSTRAINT site_pages_seo_type_check
  CHECK (seo_type IN ('keine', 'organisation', 'ueber_uns', 'angebot', 'artikel'));

COMMENT ON COLUMN public.site_pages.seo_type IS
  'Strukturierte Daten: keine | organisation (genau eine Seite) | ueber_uns | angebot | artikel.';

-- Die beiden Seiten, um die es in der Frage ging.
UPDATE public.site_pages SET seo_type = 'ueber_uns'
WHERE slug IN ('verein', 'verein-neu') AND seo_type = 'keine';

UPDATE public.site_pages SET seo_type = 'angebot'
WHERE slug IN ('fuer-veranstalter', 'fuer-veranstalter-neu') AND seo_type = 'keine';

/*
 * Wie oft „Organisation" vergeben ist.
 *
 * Die Seitenverwaltung fragt danach, um zu warnen, statt es geschehen zu
 * lassen. Eine eigene Funktion, weil die Antwort auch fuer Seiten gebraucht
 * wird, die man gerade gar nicht offen hat.
 */
CREATE OR REPLACE FUNCTION public.seo_organisation_seiten()
RETURNS TABLE (id uuid, title text, slug text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.title, p.slug
  FROM public.site_pages p
  WHERE p.seo_type = 'organisation'
    AND public.has_permission(auth.uid(), 'site.content_edit')
  ORDER BY p.title;
$$;

REVOKE ALL ON FUNCTION public.seo_organisation_seiten() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seo_organisation_seiten() TO authenticated;
