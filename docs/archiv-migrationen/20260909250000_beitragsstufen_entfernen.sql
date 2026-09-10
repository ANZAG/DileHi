-- Eine Beitragsstufe wieder loswerden
--
-- Anlegen ging bisher, entfernen nicht. Ein Verein, der keine Fördermitglieder
-- kennt, schleppte die Stufe für immer mit: im Aufnahmeantrag, im Profil und
-- in der Beitragsübersicht.
--
-- Einfach löschen geht aber nicht. An einer Stufe hängen zwei Dinge, die man
-- nicht verlieren darf:
--
--   Mitglieder     profiles.membership_type zeigt auf den Schlüssel. Ist die
--                  Zeile weg, steht dort ein Wort, das niemand mehr auflösen
--                  kann.
--   Beitragssätze  Wer nachvollziehen will, warum ein Mitglied 2023 zwanzig
--                  Euro gezahlt hat, braucht den Satz von 2023 für seine
--                  Stufe. Diese Unterlagen unterliegen einer
--                  Aufbewahrungsfrist.
--
-- Daraus ergeben sich vier Fälle. Die Entscheidung trifft die Datenbank und
-- nicht die Oberfläche, sonst steht die Regel an zwei Stellen und läuft
-- auseinander:
--
--   1. Es hängen Mitglieder daran     Gar nichts. Erst umtragen.
--   2. Nie ein Satz hinterlegt        Löschen, die Stufe war nie in Gebrauch.
--   3. Sätze nur aus früheren Jahren  Ab sofort nicht mehr anbieten. Die alten
--                                     Sätze bleiben bis zum Ende der
--                                     Aufbewahrungsfrist stehen.
--   4. Für dieses Jahr steht schon    Dieses Jahr gilt sie noch. Es wird ein
--      ein Satz                       Löschvermerk zum nächsten Jahr gesetzt.
--
-- Endgültig verschwindet die Zeile, wenn die Frist abgelaufen ist, und zwar
-- beim nächsten Versuch und nicht im Hintergrund. Wer löscht, soll es sehen.

-- ══ Die Aufbewahrungsfrist ══════════════════════════════════════════════════
--
-- Fünf Jahre als Vorgabe, weil die Beitragsübersicht seit jeher fünf Jahre
-- zeigt. Steuerlich sind für Unterlagen der Beitragsverwaltung eher zehn Jahre
-- üblich. Welche Frist gilt, entscheidet der Verein und nicht diese Software.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS beitrag_aufbewahrung_jahre integer NOT NULL DEFAULT 5;

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_aufbewahrung_check;

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_aufbewahrung_check
  CHECK (beitrag_aufbewahrung_jahre BETWEEN 1 AND 30);

COMMENT ON COLUMN public.app_settings.beitrag_aufbewahrung_jahre IS
  'Wie lange Beitragsunterlagen aufbewahrt werden. Bestimmt, ab wann eine stillgelegte Beitragsstufe endgueltig geloescht werden darf.';

-- ══ Der Löschvermerk ════════════════════════════════════════════════════════

ALTER TABLE public.contribution_categories
  ADD COLUMN IF NOT EXISTS geloescht_ab integer;

COMMENT ON COLUMN public.contribution_categories.geloescht_ab IS
  'Erstes Jahr, in dem die Stufe nicht mehr angeboten wird. NULL = wird angeboten. Die Zeile bleibt, solange alte Saetze der Aufbewahrungsfrist unterliegen.';

/*
 * Wird eine Stufe in einem Jahr angeboten?
 *
 * Eine Funktion, damit die Frage überall gleich beantwortet wird: im
 * Aufnahmeantrag, im Profil und in der Verwaltung. `is_active` bleibt der
 * Schalter von Hand, `geloescht_ab` der Vermerk mit Datum.
 */
CREATE OR REPLACE FUNCTION public.beitragsstufe_angeboten(
  _is_active boolean, _geloescht_ab integer, _jahr integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
-- STABLE und nicht IMMUTABLE: Ohne _jahr fragt die Funktion CURRENT_DATE. Als
-- IMMUTABLE deklariert duerfte der Planer das Ergebnis als Konstante behandeln
-- – und die Antwort waere ab dem Jahreswechsel falsch.
STABLE
AS $fn$
  SELECT _is_active
     AND (_geloescht_ab IS NULL
          OR COALESCE(_jahr, EXTRACT(YEAR FROM CURRENT_DATE)::int) < _geloescht_ab);
$fn$;

-- ══ Der öffentliche Aufnahmeantrag ══════════════════════════════════════════
--
-- Bisher zählte nur `is_active`. Ohne den Vermerk stünde eine stillgelegte
-- Stufe weiter zur Auswahl, und jemand träte in eine Stufe ein, die es nicht
-- mehr gibt.

CREATE OR REPLACE FUNCTION public.public_contribution_settings()
RETURNS TABLE (model text, options jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
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
      WHERE public.beitragsstufe_angeboten(c.is_active, c.geloescht_ab)
    ), '[]'::jsonb);
$fn$;

GRANT EXECUTE ON FUNCTION public.public_contribution_settings() TO anon, authenticated;

-- ══ Was an einer Stufe hängt ════════════════════════════════════════════════

/*
 * Der Stand jeder Beitragsstufe, mit allem, was für die Entscheidung nötig ist.
 *
 * Eine Abfrage statt vier: Die Verwaltung braucht zu jeder Stufe zugleich die
 * Zahl der Mitglieder, das letzte Jahr mit einem Satz und den Vermerk. Einzeln
 * geholt wären das bei zehn Stufen dreissig Abfragen.
 */
CREATE OR REPLACE FUNCTION public.beitragsstufen_status()
RETURNS TABLE (
  key               text,
  label             text,
  hinweis           text,
  sort_order        integer,
  is_active         boolean,
  geloescht_ab      integer,
  angeboten         boolean,
  mitglieder        integer,
  ehemalige         integer,
  letztes_datenjahr integer,
  loeschbar_ab      integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    c.key, c.label, c.hinweis, c.sort_order, c.is_active, c.geloescht_ab,
    public.beitragsstufe_angeboten(c.is_active, c.geloescht_ab),
    (SELECT count(*)::int FROM public.profiles p
      WHERE p.membership_type = c.key AND p.is_active IS DISTINCT FROM false),
    (SELECT count(*)::int FROM public.profiles p
      WHERE p.membership_type = c.key AND p.is_active IS false),
    letzt.jahr,
    CASE WHEN letzt.jahr IS NULL THEN NULL
         ELSE letzt.jahr + COALESCE(
                (SELECT s.beitrag_aufbewahrung_jahre FROM public.app_settings s WHERE s.id), 5
              ) + 1
    END
  FROM public.contribution_categories c
  LEFT JOIN LATERAL (
    SELECT max(r.year) AS jahr FROM public.contribution_rates r WHERE r.category = c.key
  ) letzt ON true
  WHERE public.has_permission(auth.uid(), 'contributions.manage')
  ORDER BY c.sort_order, c.label;
$fn$;

REVOKE ALL ON FUNCTION public.beitragsstufen_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beitragsstufen_status() TO authenticated;

-- ══ Entfernen ═══════════════════════════════════════════════════════════════

/*
 * Eine Beitragsstufe entfernen, so weit es geht.
 *
 * Gibt zurück, was tatsächlich passiert ist. Die Oberfläche entscheidet
 * nichts, sie zeigt das Ergebnis an:
 *
 *   { ok: false, grund: 'mitglieder', mitglieder: 3, ehemalige: 1 }
 *   { ok: true,  aktion: 'geloescht' }
 *   { ok: true,  aktion: 'stillgelegt', geloescht_ab: 2026, loeschbar_ab: 2030 }
 *   { ok: true,  aktion: 'vermerkt',    geloescht_ab: 2027, loeschbar_ab: 2031 }
 */
CREATE OR REPLACE FUNCTION public.beitragsstufe_entfernen(_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_jahr       int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_frist      int;
  v_mitglieder int;
  v_ehemalige  int;
  v_letztes    int;
  v_geloescht  int;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'contributions.manage') THEN
    RAISE EXCEPTION 'Keine Berechtigung.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contribution_categories WHERE key = _key) THEN
    RETURN jsonb_build_object('ok', false, 'grund', 'unbekannt');
  END IF;

  -- Die letzte Stufe darf nicht weg: Ohne eine einzige stuende im Antrag keine
  -- Auswahl, und jedes neue Mitglied bekaeme einen leeren Wert.
  IF (SELECT count(*) FROM public.contribution_categories) <= 1 THEN
    RETURN jsonb_build_object('ok', false, 'grund', 'letzte');
  END IF;

  SELECT s.beitrag_aufbewahrung_jahre INTO v_frist
  FROM public.app_settings s WHERE s.id;
  v_frist := COALESCE(v_frist, 5);

  SELECT
    count(*) FILTER (WHERE p.is_active IS DISTINCT FROM false),
    count(*) FILTER (WHERE p.is_active IS false)
  INTO v_mitglieder, v_ehemalige
  FROM public.profiles p WHERE p.membership_type = _key;

  IF v_mitglieder > 0 OR v_ehemalige > 0 THEN
    RETURN jsonb_build_object('ok', false, 'grund', 'mitglieder',
                              'mitglieder', v_mitglieder, 'ehemalige', v_ehemalige);
  END IF;

  SELECT max(r.year) INTO v_letztes
  FROM public.contribution_rates r WHERE r.category = _key;

  -- Kein Satz, nie in Gebrauch: weg damit.
  IF v_letztes IS NULL THEN
    DELETE FROM public.contribution_categories WHERE key = _key;
    RETURN jsonb_build_object('ok', true, 'aktion', 'geloescht');
  END IF;

  -- Aufbewahrungsfrist abgelaufen: Jetzt darf auch die Zeile weg. Die alten
  -- Saetze gehen mit, sie ergeben ohne die Stufe keinen Sinn mehr und
  -- unterliegen derselben Frist.
  IF v_letztes + v_frist < v_jahr THEN
    DELETE FROM public.contribution_rates WHERE category = _key;
    DELETE FROM public.contribution_categories WHERE key = _key;
    RETURN jsonb_build_object('ok', true, 'aktion', 'geloescht',
                              'letztes_datenjahr', v_letztes);
  END IF;

  -- Steht für dieses Jahr schon ein Satz, gilt die Stufe noch bis Jahresende.
  v_geloescht := CASE WHEN v_letztes >= v_jahr THEN v_jahr + 1 ELSE v_jahr END;

  UPDATE public.contribution_categories
  SET geloescht_ab = v_geloescht
  WHERE key = _key;

  RETURN jsonb_build_object(
    'ok', true,
    'aktion', CASE WHEN v_letztes >= v_jahr THEN 'vermerkt' ELSE 'stillgelegt' END,
    'geloescht_ab', v_geloescht,
    'loeschbar_ab', v_letztes + v_frist + 1,
    'letztes_datenjahr', v_letztes
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.beitragsstufe_entfernen(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beitragsstufe_entfernen(text) TO authenticated;

/*
 * Den Löschvermerk zurücknehmen.
 *
 * Ein Vermerk ist mit einem Klick gesetzt, und wer ihn versehentlich setzt,
 * soll nicht bis zum Jahreswechsel damit leben müssen.
 */
CREATE OR REPLACE FUNCTION public.beitragsstufe_wieder_anbieten(_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  UPDATE public.contribution_categories
  SET geloescht_ab = NULL, is_active = true
  WHERE key = _key
    AND public.has_permission(auth.uid(), 'contributions.manage');
$fn$;

REVOKE ALL ON FUNCTION public.beitragsstufe_wieder_anbieten(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beitragsstufe_wieder_anbieten(text) TO authenticated;
