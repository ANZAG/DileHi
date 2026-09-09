-- Drei Wege, einen Beitrag zu erheben
--
-- Bisher gab es genau einen: ein fester Betrag je Jahr, für alle gleich. Das
-- ist für einen eingetragenen Verein mit Beitragsordnung richtig – aber nicht
-- jede Interessengemeinschaft arbeitet so:
--
--   fest    Ein Satz je Jahr, und zwar je Kategorie. Studenten und Rentner
--           zahlen oft weniger als der reguläre Satz.
--   umlage  Kein Satz im Voraus. Die Mitglieder verpflichten sich, sich
--           anteilig an den Unkosten des Jahres zu beteiligen; der Betrag
--           entsteht erst bei der Abrechnung.
--   keiner  Es wird kein Beitrag erhoben.
--
-- „keiner" ist nicht dasselbe wie „Modul abgeschaltet": Ein Verein kann
-- beitragsfrei sein und trotzdem Zahlungen erfassen wollen (Spenden,
-- Umlagen für einzelne Fahrten). Wer gar nichts davon braucht, schaltet das
-- Modul „Beiträge" ab – dann verschwindet auch der Bereich.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS contribution_model text NOT NULL DEFAULT 'fest';

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_contribution_model_check;

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_contribution_model_check
  CHECK (contribution_model IN ('fest', 'umlage', 'keiner'));

-- ══ Beitragskategorien ══════════════════════════════════════════════════════
--
-- Bewusst KEINE zweite Achse neben `membership_type`. Die Mitgliedsart stand
-- schon immer als 'aktiv' oder 'foerder' im Antrag und im Profil, fest im Code
-- und mit demselben Beitrag für beide. Genau diese Liste wird hier
-- verwaltbar – „Student" und „Rentner" sind dann einfach zwei weitere
-- Einträge. Die vorhandenen Schlüssel bleiben gültig, es ändert sich kein
-- einziger Datensatz.

CREATE TABLE IF NOT EXISTS public.contribution_categories (
  key        text PRIMARY KEY,
  label      text NOT NULL,
  -- Steht klein unter der Auswahl im Aufnahmeantrag: „Nachweis bitte
  -- beilegen", „gilt bis zum Ende des Studiums".
  hinweis    text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.contribution_categories IS
  'Mitgliedsarten mit eigenem Beitragssatz. Der Schluessel steht in profiles.membership_type.';

INSERT INTO public.contribution_categories (key, label, hinweis, sort_order) VALUES
  ('aktiv',   'Aktives Mitglied', NULL, 10),
  ('foerder', 'Fördermitglied',   NULL, 20)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.contribution_categories ENABLE ROW LEVEL SECURITY;

-- Ohne Anmeldung lesbar: Die Auswahl steht im öffentlichen Aufnahmeantrag.
DROP POLICY IF EXISTS contribution_categories_lesen ON public.contribution_categories;
CREATE POLICY contribution_categories_lesen ON public.contribution_categories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS contribution_categories_pflegen ON public.contribution_categories;
CREATE POLICY contribution_categories_pflegen ON public.contribution_categories
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'contributions.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'contributions.manage'));

-- ══ Ein Satz je Jahr UND Kategorie ══════════════════════════════════════════

ALTER TABLE public.contribution_rates
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'aktiv';

-- Die bisherige Eindeutigkeit lag auf dem Jahr allein – damit wäre ein
-- zweiter Satz für dasselbe Jahr unmöglich.
ALTER TABLE public.contribution_rates
  DROP CONSTRAINT IF EXISTS contribution_rates_year_key;

DROP INDEX IF EXISTS contribution_rates_jahr_kategorie;
CREATE UNIQUE INDEX contribution_rates_jahr_kategorie
  ON public.contribution_rates (year, category);

-- ══ Abfragen ════════════════════════════════════════════════════════════════

/*
 * Der Satz eines Jahres für eine Kategorie.
 *
 * Fehlt für die Kategorie ein eigener Satz, gilt der der ersten Kategorie –
 * so wie es bisher war, als es nur einen Satz für alle gab. Sonst stünde beim
 * Anlegen einer neuen Kategorie plötzlich „kein Beitrag" da.
 */
CREATE OR REPLACE FUNCTION public.get_contribution_rate(_category text, _year integer DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT amount FROM public.contribution_rates
      WHERE category = _category
        AND year <= COALESCE(_year, EXTRACT(YEAR FROM CURRENT_DATE)::int)
      ORDER BY year DESC LIMIT 1),
    (SELECT r.amount FROM public.contribution_rates r
      JOIN public.contribution_categories c ON c.key = r.category
      WHERE r.year <= COALESCE(_year, EXTRACT(YEAR FROM CURRENT_DATE)::int)
      ORDER BY c.sort_order, r.year DESC LIMIT 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_contribution_rate(text, integer) TO anon, authenticated;

/*
 * Alles, was der öffentliche Aufnahmeantrag über Beiträge wissen muss.
 *
 * Eine Abfrage statt dreier: Modell, Auswahlmöglichkeiten und Beträge hängen
 * zusammen, und das Formular braucht sie gemeinsam, bevor es den Abschnitt
 * überhaupt zeichnen kann.
 */
CREATE OR REPLACE FUNCTION public.public_contribution_settings()
RETURNS TABLE (model text, options jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT s.contribution_model FROM public.app_settings s WHERE s.id), 'fest'),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'key', c.key,
               'label', c.label,
               'hinweis', c.hinweis,
               'amount', public.get_contribution_rate(c.key)
             ) ORDER BY c.sort_order, c.label)
      FROM public.contribution_categories c
      WHERE c.is_active
    ), '[]'::jsonb);
$$;

GRANT EXECUTE ON FUNCTION public.public_contribution_settings() TO anon, authenticated;

-- Die alte Funktion bleibt: Sie liefert den Satz der ersten Kategorie und
-- wird an Stellen benutzt, die keine Kategorie kennen.
COMMENT ON FUNCTION public.get_current_contribution_rate() IS
  'Satz der ersten Kategorie. Fuer eine bestimmte Kategorie: get_contribution_rate(key).';

-- ══ Der Satz zum Beitrag im Aufnahmeantrag ══════════════════════════════════
--
-- „Derzeit beträgt der jährliche Beitragssatz X EUR" passt nur zum festen
-- Beitrag. Deshalb je Modell ein eigener Text; das Formular und das PDF
-- nehmen den, der zum eingestellten Modell gehört.

INSERT INTO public.pdf_texts (key, label, hinweis, titel, inhalt, platzhalter, sort_order, standard)
SELECT key, label, hinweis, titel, inhalt, platzhalter, sort_order,
       jsonb_build_object('titel', titel, 'inhalt', inhalt)
FROM (VALUES

  ('beitrag_fest',
   'Beitragssatz – bei festem Beitrag',
   'Erscheint im Antrag unter der Erklärung, wenn als Modell „Fester Beitragssatz" eingestellt ist. {{beitrag}} ist der Satz der gewählten Mitgliedsart.',
   '',
   'Derzeit beträgt der jährliche Beitragssatz {{beitrag}} EUR. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig.',
   ARRAY['beitrag'],
   22),

  ('beitrag_umlage',
   'Beitragssatz – bei Umlage',
   'Erscheint statt des Betrags, wenn als Modell „Anteil an den Unkosten" eingestellt ist.',
   '',
   'Einen festen Beitrag gibt es nicht. Ich verpflichte mich, mich anteilig an den Unkosten des laufenden Jahres zu beteiligen; die Höhe wird nach der Abrechnung mitgeteilt. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig.',
   ARRAY[]::text[],
   23),

  ('beitrag_keiner',
   'Beitragssatz – ohne Beitrag',
   'Erscheint, wenn als Modell „Kein Beitrag" eingestellt ist.',
   '',
   'Ein Mitgliedsbeitrag wird nicht erhoben. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig.',
   ARRAY[]::text[],
   24)

) AS v(key, label, hinweis, titel, inhalt, platzhalter, sort_order)
ON CONFLICT (key) DO NOTHING;

-- Aus der Erklärung faellt der Satz mit dem Betrag heraus – er steht jetzt in
-- den drei Fassungen oben. Nur wenn er dort noch unveraendert steht.
UPDATE public.pdf_texts
SET inhalt = 'Ja, ich will Mitglied bei {{verein}} werden und beantrage hiermit meine Aufnahme!' || E'\n' ||
             'Mit dem Antrag auf Mitgliedschaft erkenne ich die Satzung des Vereins {{verein}} an. Mir ist bekannt, dass die Mitgliedschaft beitragspflichtig sein kann.',
    platzhalter = ARRAY['verein'],
    hinweis = 'Steht im Formular über den Ankreuzfeldern und im PDF im eingerahmten Kasten. Der Satz zum Beitrag kommt aus einer eigenen Vorlage, weil er vom Beitragsmodell abhängt.',
    standard = jsonb_build_object(
      'titel', titel,
      'inhalt', 'Ja, ich will Mitglied bei {{verein}} werden und beantrage hiermit meine Aufnahme!' || E'\n' ||
                'Mit dem Antrag auf Mitgliedschaft erkenne ich die Satzung des Vereins {{verein}} an. Mir ist bekannt, dass die Mitgliedschaft beitragspflichtig sein kann.')
WHERE key = 'erklaerung'
  AND inhalt = standard->>'inhalt';
