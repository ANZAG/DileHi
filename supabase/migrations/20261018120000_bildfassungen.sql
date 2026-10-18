-- Masse und kleinere Fassungen der Bilder.
--
-- Ein Foto liegt mit bis zu 1920 px Breite im Speicher, auf dem Handy
-- erscheint es oft nur 350 px breit. Neben jedem Bild liegen deshalb kleinere
-- Fassungen unter _fassungen/<breite>/<pfad>, und der Browser wählt über
-- `srcset` die passende (src/lib/bildfassungen.mjs). Welche es gibt, steht
-- hier: Nur was in `fassungen` steht, bietet die Seite an.
--
-- Breite und Höhe braucht die Seite ausserdem, um dem Bild seinen Platz
-- freizuhalten, bevor es geladen ist. Ohne sie springt der Text darunter,
-- sobald das Bild erscheint.
--
-- Leer bleibt alles wie bisher: Die Seite zeigt dann das Original. Gefüllt
-- werden die Spalten beim Hochladen und für vorhandene Bilder vom Arbeitsablauf
-- „Bilder aufbereiten" (.github/workflows/bilder.yml).
--
-- Wiederholbar: Die Spalten werden nur angelegt, wenn sie fehlen.

ALTER TABLE public.site_images
  ADD COLUMN IF NOT EXISTS breite integer,
  ADD COLUMN IF NOT EXISTS hoehe integer,
  ADD COLUMN IF NOT EXISTS fassungen integer[] NOT NULL DEFAULT '{}';

ALTER TABLE public.gallery_images
  ADD COLUMN IF NOT EXISTS breite integer,
  ADD COLUMN IF NOT EXISTS hoehe integer,
  ADD COLUMN IF NOT EXISTS fassungen integer[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.site_images.fassungen IS
  'Breiten der kleineren Fassungen unter _fassungen/<breite>/<storage_path>.';
COMMENT ON COLUMN public.gallery_images.fassungen IS
  'Breiten der kleineren Fassungen unter _fassungen/<breite>/<storage_path>.';
