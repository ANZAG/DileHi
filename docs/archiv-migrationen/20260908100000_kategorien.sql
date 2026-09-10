-- Aus „Epochen" werden „Kategorien"
--
-- „Epoche" ist unser Wort, nicht das der anderen Vereine: Die meisten stellen
-- genau eine Zeit dar. Für sie sind Galerien, Quellen und Besucher-Highlights
-- nach Themen sortiert, nicht nach Jahrhunderten.
--
-- Umbenannt wird bewusst nur der Begriff, nicht die Spalten. `gallery_images.
-- epoch`, `epoch_sources.epoch` und `epoch_visitor_items.epoch` heissen weiter
-- so – sie enthalten ohnehin nur einen Schlüssel, und eine Umbenennung quer
-- durch drei Tabellen, alle Policies und den halben Frontend-Code wäre viel
-- Risiko für ein Wort. Was fehlte, ist eine Stelle, an der diese Schlüssel
-- verwaltet werden: Bisher entstanden sie nebenbei beim Hochladen und liessen
-- sich weder umbenennen noch löschen.

CREATE TABLE IF NOT EXISTS public.site_categories (
  -- Der Schlüssel, wie er in gallery_images.epoch & Co. steht.
  key         text PRIMARY KEY,
  label       text NOT NULL,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_categories IS
  'Kategorien fuer Galerien, Quellen und Besucher-Highlights. Frueher "Epochen".';

ALTER TABLE public.site_categories ENABLE ROW LEVEL SECURITY;

-- Sichtbar für alle: Die Kategorie steht auf der öffentlichen Seite.
DROP POLICY IF EXISTS "Kategorien lesen" ON public.site_categories;
CREATE POLICY "Kategorien lesen" ON public.site_categories FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Kategorien verwalten" ON public.site_categories;
CREATE POLICY "Kategorien verwalten" ON public.site_categories FOR ALL TO authenticated
USING (
  public.has_permission(auth.uid(), 'site.content_edit')
  OR public.has_permission(auth.uid(), 'site.layout_edit')
)
WITH CHECK (
  public.has_permission(auth.uid(), 'site.content_edit')
  OR public.has_permission(auth.uid(), 'site.layout_edit')
);

-- ══ Was schon da ist, übernehmen ════════════════════════════════════════════
--
-- Die bestehenden Schlüssel stehen verstreut in drei Tabellen. Sie werden hier
-- eingesammelt, damit nach dieser Migration nichts verschwindet.
INSERT INTO public.site_categories (key, label, sort_order)
SELECT k.key,
       -- Aus „mittelalter" wird „Mittelalter". Wer es schöner will, ändert es
       -- danach in der Oberfläche – Hauptsache, es steht überhaupt etwas da.
       initcap(replace(k.key, '-', ' ')),
       row_number() OVER (ORDER BY k.key) * 10
FROM (
  SELECT DISTINCT epoch AS key FROM public.gallery_images WHERE epoch IS NOT NULL
  UNION
  SELECT DISTINCT epoch FROM public.epoch_sources WHERE epoch IS NOT NULL
  UNION
  SELECT DISTINCT epoch FROM public.epoch_visitor_items WHERE epoch IS NOT NULL
) k
ON CONFLICT (key) DO NOTHING;

-- Unsere eigenen Kategorien bekommen ihre richtigen Namen.
UPDATE public.site_categories SET label = 'Spätmittelalter', sort_order = 10 WHERE key = 'mittelalter';
UPDATE public.site_categories SET label = 'Napoleonik',      sort_order = 20 WHERE key = '1815';
UPDATE public.site_categories SET label = 'Erster Weltkrieg', sort_order = 30 WHERE key = 'wk1';

-- ══ Seitenbilder: neue Bildplätze anlegen ═══════════════════════════════════
--
-- site_images war auf feste Plätze ausgelegt, die einmal eingetragen wurden.
-- Für Seiten aus dem Editor reicht das nicht: Eine neue Seite braucht neue
-- Bildplätze, und niemand soll dafür in die Datenbank. Das Anlegen darf, wer
-- ohnehin Bilder pflegt – die Policies dafür gibt es seit Langem, es fehlte
-- nur der Weg über die Oberfläche.
--
-- `page` dient als Gruppierung in der Bilderverwaltung. Bilder aus dem
-- Seiteneditor landen unter dem Titel ihrer Seite.
COMMENT ON COLUMN public.site_images.page IS
  'Gruppierung in der Bilderverwaltung. Bei Editor-Seiten der Seitentitel.';
COMMENT ON COLUMN public.site_images.slot IS
  'Schluessel des Bildplatzes. Bei Editor-Bildern automatisch vergeben.';
