
-- Table for managing static page images via admin
CREATE TABLE public.site_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text UNIQUE NOT NULL,
  label text NOT NULL,
  page text NOT NULL,
  storage_path text,
  alt_text text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view (public site images)
CREATE POLICY "Anyone can view site_images" ON public.site_images
  FOR SELECT TO public USING (true);

-- Vorstand/Herold can manage
CREATE POLICY "Vorstand/Herold can insert site_images" ON public.site_images
  FOR INSERT TO authenticated WITH CHECK (is_vorstand(auth.uid()) OR is_herold(auth.uid()));

CREATE POLICY "Vorstand/Herold can update site_images" ON public.site_images
  FOR UPDATE TO authenticated USING (is_vorstand(auth.uid()) OR is_herold(auth.uid()));

CREATE POLICY "Vorstand/Herold can delete site_images" ON public.site_images
  FOR DELETE TO authenticated USING (is_vorstand(auth.uid()) OR is_herold(auth.uid()));

-- Seed with all current image slots
INSERT INTO public.site_images (slot, label, page, alt_text) VALUES
  -- Startseite
  ('hero-startseite', 'Hero-Bild', 'Startseite', 'Living-History-Veranstaltung'),
  ('epochenkarte-mittelalter', 'Epochenkarte Mittelalter', 'Startseite', 'Spätmittelalter'),
  ('epochenkarte-napoleonik', 'Epochenkarte Napoleonik', 'Startseite', 'Napoleonik'),
  ('epochenkarte-wk1', 'Epochenkarte Erster Weltkrieg', 'Startseite', 'Erster Weltkrieg'),
  ('gruppenfoto-startseite', 'Gruppenfoto', 'Startseite', 'Vereinsmitglieder beim gemeinsamen Aufbau'),
  -- Über uns
  ('gruppenfoto-verein', 'Gruppenfoto Verein', 'Über uns', 'Vereinsmitglieder beim gemeinsamen Aufbau'),
  ('detail-handwerk', 'Handwerk-Detail', 'Über uns', 'Detailfoto Handwerk – Zirkelarbeit am Tisch'),
  ('vorfuehrung-verein', 'Vorführung', 'Über uns', 'Vorführung bei einer Veranstaltung'),
  -- Für Veranstalter
  ('lederworkshop-veranstalter', 'Lederworkshop', 'Für Veranstalter', 'Lederworkshop bei einer Veranstaltung'),
  ('epochen-uebersicht-veranstalter', 'Epochen-Übersicht', 'Für Veranstalter', 'Unsere Darstellungen – Spätmittelalter und Erster Weltkrieg'),
  -- Epoche Mittelalter
  ('hero-mittelalter', 'Hero-Bild', 'Spätmittelalter', 'Spätmittelalterliche Darstellung'),
  ('gruppenfoto-spaemi', 'Gruppenfoto Spätmittelalter', 'Spätmittelalter', 'Vereinsmitglieder in spätmittelalterlicher Kleidung'),
  ('burg-frauenstein', 'Burg Frauenstein', 'Spätmittelalter', 'Mittelalterliche Darstellung auf Burg Frauenstein'),
  ('mittelalter-tafel', 'Mittelalterliche Tafel', 'Spätmittelalter', 'Mittelalterliche Tafelszene im Lagerleben'),
  -- Epoche Napoleonik
  ('hero-napoleonik', 'Hero-Bild', 'Napoleonik', 'Nassauische Grenadiere 1815'),
  ('nassau-regiment-knotel', 'Regiment-Uniformtafel Knötel', 'Napoleonik', 'Nassauisches 2. Infanterie-Regiment 1810, Uniformtafel von R. Knötel'),
  ('nassau-uniformtafel', 'Grenadier-Uniformtafel', 'Napoleonik', 'Uniformtafel nassauischer Grenadiere 1815, Illustration von Alexis Cabaret'),
  ('nassauer-belle-alliance', 'Belle Alliance Gemälde', 'Napoleonik', 'Die Nassauer bei Belle-Alliance am 18. Juni 1815, Gemälde von R. Knötel'),
  -- Epoche WK1
  ('hero-wk1', 'Hero-Bild', 'Erster Weltkrieg', 'Pioniere im Ersten Weltkrieg'),
  ('kaserne-mainz-kastel', 'Kaserne Mainz-Kastel', 'Erster Weltkrieg', 'Kaserne Erzherzog Wilhelm des 1. Nassauischen Pionier-Bat. Nr. 21 in Mainz-Kastel'),
  ('pibat21-uniform', 'PiBat 21 Uniform', 'Erster Weltkrieg', 'Pioniere des 1. Nassauischen Pionier-Bataillons Nr. 21 in Felduniform'),
  ('karte-hessen-nassau', 'Karte Hessen-Nassau', 'Erster Weltkrieg', 'Historische Karte der Provinz Hessen-Nassau');
