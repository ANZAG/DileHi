-- Was im Mitgliederprofil steht
--
-- Dieselbe Frage wie beim Aufnahmeantrag, dieselbe Antwort: Ein Teil ist
-- tragend, der Rest gehört dem Verein.
--
-- Nicht jeder braucht die Zeltverwaltung – sie ist für Vereine da, die auf
-- Lagern übernachten. Nicht jeder will die Mitgliederkarte. Andere möchten
-- eine eigene Frage aus dem Aufnahmeantrag im Profil weiterführen, damit sie
-- gepflegt werden kann.
--
-- Anders als beim Antrag geht es hier um zwei Dinge in einer Liste:
--
--   Bereiche   ganze Bloecke der Profilseite, die es fertig gibt (Ernährung,
--              Zelte, Karte, Darstellungssteckbrief, Mitgliedsantrag). Sie
--              lassen sich an- und abschalten, nicht löschen – der Code dazu
--              bleibt ja bestehen.
--   Felder     frei zusammengestellte Fragen. Ihre Antworten landen in
--              profiles.extra.
--
-- Die tragenden Bereiche – persönliche Daten, Mitgliedschaft,
-- Benachrichtigungen, Konto – stehen gar nicht erst in dieser Liste. Ein
-- Profil ohne Namensfeld oder ohne Passwortwechsel wäre kein Profil mehr.

CREATE TABLE IF NOT EXISTS public.profile_fields (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Bei einem Bereich der Schlüssel des Blocks, bei einer freien Frage NULL.
  block_key   text UNIQUE,
  type        text NOT NULL,
  label       text NOT NULL,
  description text,
  required    boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  options     jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profile_fields IS
  'Bereiche und freie Felder des Mitgliederprofils. block_key IS NOT NULL = fertiger Bereich.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS extra jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.extra IS
  'Antworten auf die frei zusammengestellten Profilfelder, nach profile_fields.id.';

-- ══ Rechte ══════════════════════════════════════════════════════════════════
--
-- Lesen alle Angemeldeten: Jedes Mitglied braucht die Liste, um sein eigenes
-- Profil zu sehen. Aendern nur die Systemverwaltung – es ist eine
-- Einrichtungsaufgabe, wie beim Aufnahmeantrag.

ALTER TABLE public.profile_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_fields_lesen ON public.profile_fields;
CREATE POLICY profile_fields_lesen ON public.profile_fields
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS profile_fields_pflegen ON public.profile_fields;
CREATE POLICY profile_fields_pflegen ON public.profile_fields
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'system.settings'))
  WITH CHECK (public.has_permission(auth.uid(), 'system.settings'));

-- ══ Die Bereiche, die es fertig gibt ════════════════════════════════════════
--
-- Alle zunaechst an: Am Verhalten aendert sich nichts, bis jemand etwas
-- abschaltet.

INSERT INTO public.profile_fields (block_key, type, label, description, sort_order)
SELECT block_key, 'block', label, description, sort_order
FROM (VALUES
  ('ernaehrung', 'Ernährung',
   'Allergien und Ernährungsweise – nützlich für die Verpflegung auf Veranstaltungen.', 10),
  ('darstellung', 'Darstellungssteckbrief',
   'Was ein Mitglied darstellt und was es kann. Grundlage für die Seite „Unsere Darstellungen".', 20),
  ('zelte', 'Meine Zelte',
   'Zelte der Mitglieder, damit sie bei Veranstaltungsumfragen zur Auswahl stehen und in die Flächenberechnung eingehen.', 30),
  ('karte', 'Mitgliederkarte',
   'Freiwillige Anzeige des Wohnorts auf der Karte im Mitgliederbereich.', 40),
  ('antrag', 'Mitgliedsantrag',
   'Der eigene Aufnahmeantrag als PDF zum Nachlesen.', 50)
) AS v(block_key, label, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.profile_fields);
