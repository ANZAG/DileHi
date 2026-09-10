-- Die Felder des Aufnahmeantrags
--
-- Bisher standen sie fest in src/pages/MembershipApplication.tsx: neun Felder,
-- deren Beschriftung und Reihenfolge nur ein Entwickler ändern konnte. Ein
-- anderer Verein will vielleicht nach der gewünschten Epoche fragen, nach dem
-- Führerschein oder danach, wie jemand auf den Verein gekommen ist.
--
-- Bewusst KEIN reiner Baukasten. Ein Teil der Felder ist tragend: Aus Vorname,
-- Nachname und E-Mail legt invite-member das Konto an, Anschrift und
-- Geburtsdatum wandern ins Profil. Wer die löschen oder im Typ ändern dürfte,
-- könnte die Aufnahme unbrauchbar machen, ohne dass es beim Bearbeiten
-- sichtbar wäre. Deshalb:
--
--   Kernfelder    tragen den Namen ihrer Spalte in membership_applications.
--                 Beschriftung, Hilfetext, Reihenfolge und – wo vertretbar –
--                 die Pflichtangabe lassen sich ändern. Löschen nicht.
--   Zusatzfelder  haben keine Spalte. Ihre Antworten landen gesammelt in
--                 `extra` und werden im Antrag unter „Weitere Angaben"
--                 gedruckt.

CREATE TABLE IF NOT EXISTS public.application_fields (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = Zusatzfeld. Sonst der Spaltenname in membership_applications.
  column_name text UNIQUE,
  type        text NOT NULL,
  label       text NOT NULL,
  description text,
  required    boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  -- Auswahlmöglichkeiten bei „Auswahl" und „Mehrfachauswahl".
  options     jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.application_fields IS
  'Felder des Aufnahmeantrags. column_name IS NOT NULL = tragendes Kernfeld.';

-- Antworten auf die Zusatzfelder. Ein Feld je Frage waere eine Migration je
-- Frage – genau das soll der Baukasten ersparen.
ALTER TABLE public.membership_applications
  ADD COLUMN IF NOT EXISTS extra jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.membership_applications.extra IS
  'Antworten auf die Zusatzfelder, nach application_fields.id abgelegt.';

-- ══ Rechte ══════════════════════════════════════════════════════════════════
--
-- Lesen ohne Anmeldung: Der Antrag steht auf der oeffentlichen Seite und wird
-- von jemandem ausgefuellt, der noch kein Konto hat. Aendern darf, wer die
-- Mitgliederverwaltung fuehrt – der Antrag ist deren Werkzeug.

ALTER TABLE public.application_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS application_fields_lesen ON public.application_fields;
CREATE POLICY application_fields_lesen ON public.application_fields
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS application_fields_pflegen ON public.application_fields;
CREATE POLICY application_fields_pflegen ON public.application_fields
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'members.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'members.manage'));

-- ══ Die Felder, die es heute gibt ═══════════════════════════════════════════
--
-- Wort für Wort aus dem Formular übernommen, damit sich am Antrag zunächst
-- nichts ändert.

INSERT INTO public.application_fields (column_name, type, label, description, required, sort_order, options)
SELECT column_name, type, label, description, required, sort_order, options
FROM (VALUES
  (NULL,           'section',  'Persönliche Angaben', NULL, false,  10, '[]'::jsonb),
  ('salutation',   'select',   'Anrede',              NULL, false,  20, '["Herr", "Frau"]'::jsonb),
  ('first_name',   'text',     'Vorname',             NULL, true,   30, '[]'::jsonb),
  ('last_name',    'text',     'Nachname',            NULL, true,   40, '[]'::jsonb),
  ('email',        'text',     'E-Mail',              NULL, true,   50, '[]'::jsonb),
  ('phone',        'text',     'Telefon / Handy',     NULL, false,  60, '[]'::jsonb),
  ('birthdate',    'date',     'Geburtsdatum',
   'Die Mitgliedschaft ist ab 16 Jahren möglich. Bei unter 18-Jährigen muss der Antrag von einem Erziehungsberechtigten mitunterschrieben werden – wir kommen in diesem Fall per E-Mail auf dich zu.',
   true,  70, '[]'::jsonb),
  ('street',       'text',     'Straße und Hausnummer', NULL, true,  80, '[]'::jsonb),
  ('zip',          'text',     'PLZ',                 NULL, true,   90, '[]'::jsonb),
  ('city',         'text',     'Wohnort',             NULL, true,  100, '[]'::jsonb)
) AS v(column_name, type, label, description, required, sort_order, options)
WHERE NOT EXISTS (SELECT 1 FROM public.application_fields);
