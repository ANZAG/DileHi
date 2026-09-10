-- Suchmaschinen-Angaben je Seite
--
-- Die Baukastenseiten bauten ihren Titel schematisch: „Seitenname – Kurzname
-- des Vereins". Damit gingen die ausformulierten Titel verloren, die auf den
-- alten Seiten standen:
--
--   „Diu lebendec Histôrje – Wiesbadener Living History Verein"
--     wurde zu „Startseite – Diu lebendec Histôrje"
--   „Spätmittelalter - Grafschaft Nassau (1290-1310)"
--     wurde zu „Spätmittelalter in Nassau – Diu lebendec Histôrje"
--
-- Der Titel ist das, was in der Trefferliste steht. Ein Schema ist dort
-- schlechter als ein Satz, den jemand geschrieben hat.
--
-- Ausserdem fehlten die strukturierten Daten – der maschinenlesbare Block, mit
-- dem Suchmaschinen erkennen, dass es sich um einen Verein bzw. einen Artikel
-- handelt. Statt ihn als rohes JSON eintragen zu lassen, gibt es eine Auswahl:
-- Was er enthaelt, weiss die Anwendung aus den Vereinsangaben besser als der
-- Mensch vor dem Formular.

ALTER TABLE public.site_pages
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_type  text NOT NULL DEFAULT 'keine';

ALTER TABLE public.site_pages
  DROP CONSTRAINT IF EXISTS site_pages_seo_type_check;

ALTER TABLE public.site_pages
  ADD CONSTRAINT site_pages_seo_type_check
  CHECK (seo_type IN ('keine', 'organisation', 'artikel'));

COMMENT ON COLUMN public.site_pages.seo_title IS
  'Titel in der Trefferliste. Leer = „Seitenname – Kurzname des Vereins".';

COMMENT ON COLUMN public.site_pages.seo_type IS
  'Strukturierte Daten: keine, organisation (Startseite) oder artikel (Themenseite).';

-- Die Titel der bestehenden Seiten – wortgleich aus den alten Seiten.
UPDATE public.site_pages SET
  seo_title = 'Diu lebendec Histôrje – Wiesbadener Living History Verein',
  seo_type = 'organisation'
WHERE slug IN ('startseite-neu', 'startseite') AND seo_title IS NULL;

UPDATE public.site_pages SET
  seo_title = 'Spätmittelalter - Grafschaft Nassau (1290-1310)', seo_type = 'artikel'
WHERE slug IN ('epochen/mittelalter-neu', 'epochen/mittelalter') AND seo_title IS NULL;

UPDATE public.site_pages SET
  seo_title = 'Napoleonik – Nassauer Grenadiere 1815', seo_type = 'artikel'
WHERE slug IN ('epochen/1815-neu', 'epochen/1815') AND seo_title IS NULL;

UPDATE public.site_pages SET
  seo_title = 'Erster Weltkrieg - 1. Nassauisches Pionier-Bataillon Nr. 21', seo_type = 'artikel'
WHERE slug IN ('epochen/wk1-neu', 'epochen/wk1') AND seo_title IS NULL;

UPDATE public.site_pages SET seo_title = 'Über uns - Diu lebendec Histôrje'
WHERE slug IN ('verein-neu', 'verein') AND seo_title IS NULL;

UPDATE public.site_pages SET seo_title = 'Für Veranstalter - Diu lebendec Histôrje'
WHERE slug IN ('fuer-veranstalter-neu', 'fuer-veranstalter') AND seo_title IS NULL;

UPDATE public.site_pages SET seo_title = 'Impressum - Diu lebendec Histôrje'
WHERE slug IN ('impressum-neu', 'impressum') AND seo_title IS NULL;

UPDATE public.site_pages SET seo_title = 'Datenschutzerklärung - Diu lebendec Histôrje'
WHERE slug IN ('datenschutz-neu', 'datenschutz') AND seo_title IS NULL;
