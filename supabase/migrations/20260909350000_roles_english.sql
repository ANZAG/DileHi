-- Rollen: Aufräumen, und die Namen auf Englisch
--
-- Drei Dinge in einem, weil sie dieselbe Tabelle betreffen.
--
-- ── 1. Zwei tote Funktionen ────────────────────────────────────────────────
--
-- `is_herold()` und `is_schatzmeister()` galten als Altlast in „rund zehn
-- älteren Zugriffsregeln". Der Blick ins echte Schema zeigt: Sie stecken in
-- keiner einzigen. Nicht in einer Regel, nicht in einer anderen Funktion,
-- nicht im Programm.
--
-- Mein früherer Befund kam aus den Migrationsdateien, und die Regeln von
-- damals sind längst ersetzt. Eine Datei sagt, was einmal war; nur die
-- Datenbank sagt, was ist.
--
-- ── 2. Grundausstattung nach Funktion, nicht nach Namen ────────────────────
--
-- Die vorige Migration setzte `is_system` auf 'vorstand' und 'mitglied' – also
-- auf unsere Rollennamen, in genau der Migration, die Rollennamen frei machen
-- sollte. Ein Verein könnte damit „Vorstand" nie loswerden, auch wenn seine
-- Vorsitzende „1. Officiatus" heisst.
--
-- Geschützt gehört, was eine Aufgabe hat: die Rolle, die Rechte vergeben darf,
-- und die Rolle, die neue Mitglieder bekommen. Beides steht jetzt woanders.
--
-- ── 3. Englische Bezeichner ────────────────────────────────────────────────
--
-- `is_leitung` und `rollen_status` waren zwei Tage alt und schon Gemisch.
-- Datenbankbezeichner sind ab hier englisch; die Oberfläche bleibt deutsch.

-- ══ 1. Die toten Funktionen ═════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.is_herold(uuid);
DROP FUNCTION IF EXISTS public.is_schatzmeister(uuid);

-- ══ 2. Die Standardrolle ════════════════════════════════════════════════════
--
-- Welche Rolle bekommt ein neu eingeladenes Mitglied? Das stand als 'mitglied'
-- fest im Programm – in der Mitgliederverwaltung und im Aufnahmeantrag.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS default_role text;

COMMENT ON COLUMN public.app_settings.default_role IS
  'Rolle, die ein neu eingeladenes Mitglied bekommt. Leer = die unterste im Katalog.';

-- Was heute gilt, bleibt: die Rolle „mitglied", falls es sie gibt.
UPDATE public.app_settings
SET default_role = COALESCE(
  (SELECT key FROM public.role_catalog WHERE key = 'mitglied'),
  (SELECT key FROM public.role_catalog ORDER BY sort_order DESC LIMIT 1)
)
WHERE default_role IS NULL;

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_default_role_fkey;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_default_role_fkey
  FOREIGN KEY (default_role) REFERENCES public.role_catalog(key)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- ══ 3. Bezeichner auf Englisch ══════════════════════════════════════════════
--
-- Umbenennen statt neu anlegen, damit die Werte erhalten bleiben. Der Umweg
-- über einen DO-Block, weil ALTER TABLE kein „IF EXISTS" für Spalten kennt und
-- diese Migration auch auf einer Datenbank laufen soll, in der die vorige
-- schon eingespielt ist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'role_catalog'
      AND column_name = 'is_leitung'
  ) THEN
    ALTER TABLE public.role_catalog RENAME COLUMN is_leitung TO is_leadership;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'role_catalog'
      AND column_name = 'is_leadership'
  ) THEN
    ALTER TABLE public.role_catalog ADD COLUMN is_leadership boolean NOT NULL DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN public.role_catalog.is_leadership IS
  'Hat diese Rolle die Rechte der Vereinsleitung? Wertet is_vorstand() aus. Nicht zu verwechseln mit is_board (Vorstand im Vereinsrechtssinn).';

-- Die Grundausstattung neu bestimmen: nicht nach Namen, sondern nach Aufgabe.
UPDATE public.role_catalog SET is_system = false WHERE is_system;

UPDATE public.role_catalog SET is_system = true
WHERE key IN (
  SELECT role FROM public.role_permissions
  WHERE permission = 'roles.manage' AND granted
  UNION
  SELECT default_role FROM public.app_settings WHERE id AND default_role IS NOT NULL
);

-- ══ Die Funktionen dazu ═════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_vorstand(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_catalog rc ON rc.key = ur.role
    WHERE ur.user_id = _user_id AND rc.is_leadership
  )
$fn$;

DROP FUNCTION IF EXISTS public.rollen_status();

CREATE OR REPLACE FUNCTION public.role_status()
RETURNS TABLE (
  key           text,
  label         text,
  description   text,
  sort_order    integer,
  is_board      boolean,
  is_leadership boolean,
  public_listed boolean,
  is_system     boolean,
  is_default    boolean,
  max_holders   integer,
  member_count  integer,
  permission_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT rc.key, rc.label, rc.description, rc.sort_order,
         rc.is_board, rc.is_leadership, rc.public_listed, rc.is_system,
         rc.key = (SELECT s.default_role FROM public.app_settings s WHERE s.id),
         rc.max_holders,
         (SELECT count(*)::int FROM public.user_roles ur WHERE ur.role = rc.key),
         (SELECT count(*)::int FROM public.role_permissions rp
           WHERE rp.role = rc.key AND rp.granted)
  FROM public.role_catalog rc
  WHERE public.has_permission(auth.uid(), 'roles.manage')
  ORDER BY rc.sort_order, rc.label;
$fn$;

REVOKE ALL ON FUNCTION public.role_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.role_status() TO authenticated;

/*
 * Der Schutz beim Löschen, jetzt mit der Standardrolle.
 *
 * Vier Wege, sich selbst auszusperren, und alle vier sind hier zu.
 */
DROP TRIGGER IF EXISTS role_catalog_schutz_trigger ON public.role_catalog;
DROP FUNCTION IF EXISTS public.role_catalog_schutz();

CREATE OR REPLACE FUNCTION public.role_catalog_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = OLD.key) THEN
    RAISE EXCEPTION 'An der Rolle „%" hängen noch Mitglieder. Trage sie erst um.', OLD.label;
  END IF;

  IF EXISTS (SELECT 1 FROM public.app_settings WHERE id AND default_role = OLD.key) THEN
    RAISE EXCEPTION 'Die Rolle „%" ist die Standardrolle für neue Mitglieder. Stelle erst eine andere ein.', OLD.label;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role = OLD.key AND permission = 'roles.manage' AND granted
  ) AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role <> OLD.key AND permission = 'roles.manage' AND granted
  ) THEN
    RAISE EXCEPTION 'Das ist die letzte Rolle, die Rechte vergeben darf. Ohne sie kommt niemand mehr in die Rechteverwaltung.';
  END IF;

  RETURN OLD;
END;
$fn$;

REVOKE ALL ON FUNCTION public.role_catalog_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER role_catalog_guard_trigger
  BEFORE DELETE ON public.role_catalog
  FOR EACH ROW EXECUTE FUNCTION public.role_catalog_guard();
