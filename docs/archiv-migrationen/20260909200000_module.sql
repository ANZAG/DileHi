-- Module: was diese Installation überhaupt anbietet
--
-- `app_modules` gibt es seit Monaten, mit dreizehn Einträgen, einer Funktion
-- `module_enabled()` und dem Recht `system.modules`. Gelesen hat die Tabelle
-- bis heute nichts. Diese Migration vervollständigt sie; die Verkabelung
-- passiert im Code.
--
-- Was hier NICHT steht, ist Absicht: Mitglieder, Rollen und Rechte, das
-- Erscheinungsbild, die öffentlichen Seiten. Eine Installation ohne
-- Mitgliederverwaltung wäre keine Vereinssoftware, und ein Schalter, den
-- niemand je umlegt, ist nur eine Stelle, an der etwas kaputtgehen kann.

-- ══ 1. Ordnung und Herkunft ═════════════════════════════════════════════════

ALTER TABLE public.app_modules
  -- Grundfunktionen von Zusätzen trennen: „Forum" ist etwas anderes als
  -- „Zeltplan in der Auswertung". In der Verwaltung stehen sie deshalb
  -- getrennt, und die Zusätze rücken unter ihr Modul ein.
  ADD COLUMN IF NOT EXISTS art text NOT NULL DEFAULT 'grundfunktion';

ALTER TABLE public.app_modules
  DROP CONSTRAINT IF EXISTS app_modules_art_check;

ALTER TABLE public.app_modules
  ADD CONSTRAINT app_modules_art_check CHECK (art IN ('grundfunktion', 'zusatz'));

COMMENT ON COLUMN public.app_modules.art IS
  'grundfunktion = eigener Bereich, zusatz = Erweiterung eines anderen Moduls.';

-- ══ 2. Die fehlenden Module ═════════════════════════════════════════════════
--
-- Die vier Zusätze zu den Anmeldeformularen sind der Teil der Anwendung, der
-- am deutlichsten aus unserer eigenen Praxis stammt: Ein Verein, der nicht auf
-- Lagern übernachtet, braucht weder Zeltflächen noch Aufbauhelfer.

INSERT INTO public.app_modules (key, label, description, enabled, sort_order, requires, art) VALUES
  ('lagerlogistik', 'Lagerlogistik',
   'Zelte der Mitglieder, Flächenberechnung, Zeltplan und Lageplan in der Auswertung.',
   true, 210, 'event_forms', 'zusatz'),
  ('verpflegung', 'Verpflegung',
   'Allergien und Ernährungsweise in Anmeldung und Auswertung, vorbelegt aus dem Profil.',
   true, 220, 'event_forms', 'zusatz'),
  ('helfer', 'Helferaufgaben',
   'Auf- und Abbau mit Zeitfenstern und Mindestbesetzung.',
   true, 230, 'event_forms', 'zusatz'),
  ('fahrgemeinschaften', 'Fahrgemeinschaften',
   'Wer fährt, wer hat eine Anhängerkupplung, wie viele Plätze sind frei.',
   true, 240, 'event_forms', 'zusatz'),
  ('besucher_highlights', 'Besucher-Highlights',
   'Die Blöcke „Das erwartet euch" auf den öffentlichen Themenseiten.',
   true, 130, NULL, 'grundfunktion'),
  ('einbindung', 'Einbindung in fremde Seiten',
   'Terminliste, die andere Websites einbetten können.',
   true, 140, NULL, 'grundfunktion')
ON CONFLICT (key) DO NOTHING;

-- Die Anmeldeformulare haengen an den Veranstaltungen – das stand schon so da
-- und wird hier nur bestaetigt, damit die Kette vollstaendig ist.
UPDATE public.app_modules SET requires = 'events' WHERE key = 'event_forms' AND requires IS NULL;

-- ══ 3. Abhängigkeiten durchsetzen ═══════════════════════════════════════════
--
-- Wer die Veranstaltungen abschaltet, schaltet damit auch die
-- Anmeldeformulare ab – und mit ihnen die vier Zusaetze. Das in der
-- Oberflaeche zu pruefen reicht nicht: Ein direkter Aufruf oder ein
-- vergessener Fall wuerde sonst einen Zustand hinterlassen, in dem ein
-- Zeltplan zu einem Formular gehoert, das es nicht gibt.

CREATE OR REPLACE FUNCTION public.module_enabled(_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE kette AS (
    SELECT key, enabled, requires FROM public.app_modules WHERE key = _key
    UNION ALL
    SELECT m.key, m.enabled, m.requires
    FROM public.app_modules m
    JOIN kette k ON m.key = k.requires
  )
  -- Unbekannte Schluessel gelten als eingeschaltet: Ein Modul, das der Code
  -- schon kennt und die Datenbank noch nicht, soll sichtbar sein und nicht
  -- stillschweigend fehlen.
  SELECT COALESCE(bool_and(enabled), true) FROM kette;
$$;

REVOKE ALL ON FUNCTION public.module_enabled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.module_enabled(text) TO anon, authenticated;

/*
 * Alle Module mit ihrem tatsaechlichen Zustand.
 *
 * `enabled` ist der Schalter, `aktiv` das Ergebnis samt Abhaengigkeiten. Die
 * Verwaltung braucht beides: Sie zeigt den Schalter an und erklaert daneben,
 * warum er gerade nichts bewirkt.
 */
CREATE OR REPLACE FUNCTION public.module_status()
RETURNS TABLE (
  key text, label text, description text, art text,
  requires text, sort_order integer, enabled boolean, aktiv boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.key, m.label, m.description, m.art, m.requires, m.sort_order,
         m.enabled, public.module_enabled(m.key)
  FROM public.app_modules m
  ORDER BY m.sort_order, m.label;
$$;

REVOKE ALL ON FUNCTION public.module_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.module_status() TO anon, authenticated;

-- ══ 4. Profilbereiche kennen ihr Modul ══════════════════════════════════════
--
-- „Meine Zelte" im Profil gehoert zur Lagerlogistik, „Ernaehrung" zur
-- Verpflegung. Ohne diese Verbindung muesste jemand beides einzeln
-- abschalten – und wuerde sich wundern, warum im Profil noch Zelte stehen,
-- deren Auswertung es nicht mehr gibt.

ALTER TABLE public.profile_fields
  ADD COLUMN IF NOT EXISTS modul text;

COMMENT ON COLUMN public.profile_fields.modul IS
  'Bereich erscheint nur, wenn dieses Modul eingeschaltet ist. NULL = immer.';

UPDATE public.profile_fields SET modul = 'lagerlogistik' WHERE block_key = 'zelte'  AND modul IS NULL;
UPDATE public.profile_fields SET modul = 'verpflegung'   WHERE block_key = 'ernaehrung' AND modul IS NULL;
UPDATE public.profile_fields SET modul = 'personas'      WHERE block_key = 'darstellung' AND modul IS NULL;
UPDATE public.profile_fields SET modul = 'member_map'    WHERE block_key = 'karte'  AND modul IS NULL;
UPDATE public.profile_fields SET modul = 'applications'  WHERE block_key = 'antrag' AND modul IS NULL;
