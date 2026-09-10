-- Erscheinungsbild, Menü und Seiten
--
-- Bisher steckt die öffentliche Website im Code: acht Seiten als React-Dateien,
-- das Menü als Array, die Farben als CSS-Variablen. Wer etwas ändern will,
-- braucht einen Entwickler. Genau daran scheitert die Standalone-Fassung – und
-- im eigenen Verein kann es deshalb nur eine Person.
--
-- app_settings gibt es seit 20260907170000 mit Name, Logo und Farben. Gelesen
-- hat diese Spalten bisher niemand. Das ändert sich hier.

-- ══ 1. Was zum Erscheinungsbild noch fehlte ═════════════════════════════════
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS favicon_path     text,
  ADD COLUMN IF NOT EXISTS seo_description  text,
  ADD COLUMN IF NOT EXISTS seo_image_path   text;

COMMENT ON COLUMN public.app_settings.favicon_path IS
  'Pfad im gallery-Bucket. Leer = die mitgelieferte Datei aus public/.';
COMMENT ON COLUMN public.app_settings.seo_description IS
  'Vorgabe fuer Seiten ohne eigene Beschreibung.';

-- ══ 2. Öffentlich lesbar – aber nur, was öffentlich sein darf ═══════════════
--
-- app_settings ist mitgliederbeschränkt, und das soll auch so bleiben: Dort
-- stehen Anschrift und Absenderadressen. Der Vereinsname, das Logo und die
-- Farben müssen aber auf der öffentlichen Startseite ankommen, bevor sich
-- jemand anmeldet. Deshalb eine Funktion, die genau die unkritischen Felder
-- herausgibt – und nicht etwa eine zweite Policy auf der ganzen Tabelle.
CREATE OR REPLACE FUNCTION public.public_branding()
RETURNS TABLE (
  org_name        text,
  org_short_name  text,
  org_tagline     text,
  logo_path       text,
  favicon_path    text,
  color_primary   text,
  color_dark      text,
  seo_description text,
  seo_image_path  text,
  website_url     text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_name, org_short_name, org_tagline, logo_path, favicon_path,
         color_primary, color_dark, seo_description, seo_image_path, website_url
  FROM public.app_settings
  WHERE id;
$$;

COMMENT ON FUNCTION public.public_branding() IS
  'Vereinsname, Logo und Farben fuer die oeffentliche Website. Keine Anschrift, keine Mailadressen.';

REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated;

-- ══ 3. Das Menü ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.site_menu (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  -- Entweder ein Verweis auf eine Seite oder eine freie Adresse. Beides
  -- gleichzeitig ergibt keinen Sinn.
  page_id     uuid,
  href        text,
  -- Untermenü: zeigt auf einen anderen Menüpunkt. Genau eine Ebene tief –
  -- mehr braucht keine Vereinswebsite, und mehr bedient auch niemand gern.
  parent_id   uuid REFERENCES public.site_menu(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  opens_new   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_menu_sort_idx ON public.site_menu (parent_id, sort_order);

-- ══ 4. Die Seiten ═══════════════════════════════════════════════════════════
--
-- Der Aufbau liegt als JSON in `content` – das Format, das der Editor (Puck)
-- schreibt und liest. Bewusst als jsonb und nicht in Einzeltabellen zerlegt:
-- Der Editor ist die einzige Stelle, die es interpretiert, und ein eigenes
-- Schema dafuer waere eine zweite Wahrheit, die auseinanderlaeuft.
--
-- Entwurf und Veröffentlichtes stehen nebeneinander. Wer eine Seite umbaut,
-- soll sie in Ruhe umbauen können, ohne dass Besucher dabei zusehen.
CREATE TABLE IF NOT EXISTS public.site_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  -- Was Besucher sehen. NULL = noch nie veröffentlicht.
  content         jsonb,
  -- Woran gerade gearbeitet wird.
  draft_content   jsonb,
  seo_description text,
  seo_image_path  text,
  noindex         boolean NOT NULL DEFAULT false,
  is_published    boolean NOT NULL DEFAULT false,
  -- Systemseiten (Kontakt, Mitglied werden) haengen an Modulen und duerfen
  -- nicht geloescht werden – sonst zeigt ein Menuepunkt ins Leere.
  is_system       boolean NOT NULL DEFAULT false,
  published_at    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_pages_slug_idx ON public.site_pages (slug) WHERE is_published;

ALTER TABLE public.site_menu  ADD CONSTRAINT site_menu_page_fk
  FOREIGN KEY (page_id) REFERENCES public.site_pages(id) ON DELETE CASCADE;

ALTER TABLE public.site_menu
  ADD CONSTRAINT site_menu_ziel CHECK (num_nonnulls(page_id, href) = 1);

CREATE OR REPLACE FUNCTION public.site_pages_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_pages_touch_trg ON public.site_pages;
CREATE TRIGGER site_pages_touch_trg
BEFORE UPDATE ON public.site_pages
FOR EACH ROW EXECUTE FUNCTION public.site_pages_touch();

-- ══ 5. Rechte: Inhalte und Layout getrennt ══════════════════════════════════
--
-- Der eigentliche Grund, warum ein Baukasten hier vertretbar ist. Wer Texte
-- und Bilder pflegt, muss die Anordnung nicht verschieben duerfen – dann kann
-- er sie auch nicht versehentlich zerlegen. Der Herold schreibt, die
-- Systemverwaltung baut.
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES
  ('site.content_edit', 'Seiteninhalte bearbeiten (Texte und Bilder)', 'system', 950),
  ('site.layout_edit',  'Seitenaufbau und Menü ändern',                'system', 960)
ON CONFLICT (key) DO NOTHING;

-- Inhalte: Herold und geschäftsführender Vorstand.
INSERT INTO public.role_permissions (role, permission, granted)
SELECT r.role, 'site.content_edit', true
FROM (VALUES
  ('herold'::public.app_role),
  ('officiatus_1'::public.app_role),
  ('officiatus_2'::public.app_role)
) AS r(role)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role = r.role AND rp.permission = 'site.content_edit'
);

-- Aufbau: nur, wer ohnehin die Installation verwaltet.
INSERT INTO public.role_permissions (role, permission, granted)
SELECT r.role, 'site.layout_edit', true
FROM (VALUES
  ('officiatus_1'::public.app_role),
  ('officiatus_2'::public.app_role)
) AS r(role)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role = r.role AND rp.permission = 'site.layout_edit'
);

-- ══ 6. Zugriffsschutz ═══════════════════════════════════════════════════════
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_menu  ENABLE ROW LEVEL SECURITY;

-- Veröffentlichtes sieht jeder – das ist der Zweck einer Website.
DROP POLICY IF EXISTS "Seiten oeffentlich lesen" ON public.site_pages;
CREATE POLICY "Seiten oeffentlich lesen" ON public.site_pages FOR SELECT TO anon, authenticated
USING (
  is_published
  OR public.has_permission(auth.uid(), 'site.content_edit')
  OR public.has_permission(auth.uid(), 'site.layout_edit')
);

DROP POLICY IF EXISTS "Seiten bearbeiten" ON public.site_pages;
CREATE POLICY "Seiten bearbeiten" ON public.site_pages FOR UPDATE TO authenticated
USING (
  public.has_permission(auth.uid(), 'site.content_edit')
  OR public.has_permission(auth.uid(), 'site.layout_edit')
)
WITH CHECK (
  public.has_permission(auth.uid(), 'site.content_edit')
  OR public.has_permission(auth.uid(), 'site.layout_edit')
);

-- Anlegen und Löschen gehört zum Aufbau, nicht zum Inhalt.
DROP POLICY IF EXISTS "Seiten anlegen" ON public.site_pages;
CREATE POLICY "Seiten anlegen" ON public.site_pages FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'site.layout_edit'));

DROP POLICY IF EXISTS "Seiten loeschen" ON public.site_pages;
CREATE POLICY "Seiten loeschen" ON public.site_pages FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'site.layout_edit') AND NOT is_system);

DROP POLICY IF EXISTS "Menue oeffentlich lesen" ON public.site_menu;
CREATE POLICY "Menue oeffentlich lesen" ON public.site_menu FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Menue verwalten" ON public.site_menu;
CREATE POLICY "Menue verwalten" ON public.site_menu FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'site.layout_edit'))
WITH CHECK (public.has_permission(auth.uid(), 'site.layout_edit'));

-- ══ 7. Das bestehende Menü übernehmen ═══════════════════════════════════════
--
-- Damit nach dieser Migration dasselbe dasteht wie vorher. Die Seiten selbst
-- bleiben vorerst im Code; die Menüpunkte zeigen deshalb auf feste Adressen.
-- Beim Umstellen einer Seite auf den Editor wandert der jeweilige Eintrag von
-- href auf page_id.
INSERT INTO public.site_menu (label, href, sort_order)
SELECT * FROM (VALUES
  ('Startseite',        '/',                     10),
  ('Spätmittelalter',   '/epochen/mittelalter',  20),
  ('Napoleonik',        '/epochen/1815',         30),
  ('Erster Weltkrieg',  '/epochen/wk1',          40),
  ('Für Veranstalter',  '/fuer-veranstalter',    50),
  ('Über uns',          '/verein',               60),
  ('Kontakt',           '/kontakt',              70)
) AS v(label, href, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.site_menu);
