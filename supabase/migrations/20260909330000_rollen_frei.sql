-- Rollen sind keine feste Liste mehr
--
-- `user_roles.role` hing an einem Aufzählungstyp mit sechs Werten: vorstand,
-- mitglied, herold, schatzmeister, officiatus_1, officiatus_2. Ein Verein mit
-- einer Rolle „Zeugwart" konnte sie nicht anlegen – und ein fremder Verein
-- erbte unsere Ämterbezeichnungen samt der Nassauer Latinismen.
--
-- Der Rollenkatalog ist längst eine Tabelle, die Rechte auch. Nur die Menge
-- der Rollen selbst stand fest.
--
-- ── Was das kostet ─────────────────────────────────────────────────────────
--
-- Wenig, wie sich beim Nachsehen im Schema herausstellte: Der Typ hängt an
-- genau drei Spalten, und keine einzige Zugriffsregel vergleicht direkt gegen
-- ihn. Die Funktionen arbeiten schon heute mit `role::text`.
--
-- Zwei Funktionen zählen die Rollennamen allerdings fest auf, und die sind der
-- eigentliche Kern:
--
--   is_member()    „vorstand, mitglied, herold, schatzmeister, officiatus_1,
--                  officiatus_2" – also: irgendeine Rolle. Genau das steht
--                  jetzt da.
--   is_vorstand()  „vorstand, officiatus_1, officiatus_2" – der
--                  geschäftsführende Vorstand, absichtlich ohne den
--                  Schatzmeister. Das ist eine Eigenschaft der Rolle und
--                  bekommt deshalb eine Spalte im Katalog.
--
-- ── Warum nicht is_board ───────────────────────────────────────────────────
--
-- Der Katalog hat schon `is_board`: gehört die Rolle dem Vorstand im
-- Vereinsrechtssinn an? Nach unserer Satzung sind das 1. Officiatus,
-- 2. Officiatus UND Schatzmeister. `is_vorstand()` meint etwas anderes – die
-- Rechte des geschäftsführenden Vorstands, ohne den Schatzmeister.
--
-- Beides zusammenzulegen wäre bequem und falsch: Der Schatzmeister bekäme
-- schlagartig die Rechte aus fünfzehn Zugriffsregeln. Deshalb eine zweite
-- Eigenschaft. Sie beschreibt, was `is_vorstand()` bisher hart verdrahtet
-- hatte – jetzt nur eben dort, wo ein Verein sie ändern kann.

-- ══ Die Eigenschaft ═════════════════════════════════════════════════════════

ALTER TABLE public.role_catalog
  ADD COLUMN IF NOT EXISTS is_leitung boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.role_catalog.is_leitung IS
  'Hat diese Rolle die Rechte der Vereinsleitung? Wertet is_vorstand() aus. Nicht zu verwechseln mit is_board (Vorstand im Vereinsrechtssinn).';

-- Genau die drei, die is_vorstand() bisher aufzählte. Damit ändert sich für
-- diese Installation nichts.
UPDATE public.role_catalog
SET is_leitung = true
WHERE key IN ('vorstand', 'officiatus_1', 'officiatus_2');

-- ══ Jede benutzte Rolle muss im Katalog stehen ══════════════════════════════
--
-- Vor dem Fremdschlüssel: Was in user_roles steht, aber nicht im Katalog,
-- liesse die nächste Anweisung scheitern. Nachgetragen wird mit dem Schlüssel
-- als Beschriftung – lieber ein hässlicher Eintrag als eine Migration, die
-- mittendrin abbricht.

INSERT INTO public.role_catalog (key, label, sort_order)
SELECT DISTINCT r.role::text, r.role::text, 99
FROM (
  SELECT role FROM public.user_roles
  UNION SELECT role FROM public.role_permissions
  UNION SELECT role FROM public.forum_category_roles
) r
ON CONFLICT (key) DO NOTHING;

-- ══ Vom Aufzählungstyp zum Text ═════════════════════════════════════════════

ALTER TABLE public.user_roles           ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.role_permissions     ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.forum_category_roles ALTER COLUMN role TYPE text USING role::text;

-- Der Fremdschlüssel ersetzt, was der Aufzählungstyp geleistet hat: Es gibt
-- keine Rolle ausserhalb des Katalogs. ON UPDATE CASCADE, damit sich eine
-- Rolle umbenennen lässt, ohne die Zuordnungen zu verlieren.

ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_fkey;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_fkey
  FOREIGN KEY (role) REFERENCES public.role_catalog(key) ON UPDATE CASCADE;

ALTER TABLE public.role_permissions
  DROP CONSTRAINT IF EXISTS role_permissions_role_fkey;
ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_role_fkey
  FOREIGN KEY (role) REFERENCES public.role_catalog(key) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.forum_category_roles
  DROP CONSTRAINT IF EXISTS forum_category_roles_role_fkey;
ALTER TABLE public.forum_category_roles
  ADD CONSTRAINT forum_category_roles_role_fkey
  FOREIGN KEY (role) REFERENCES public.role_catalog(key) ON UPDATE CASCADE ON DELETE CASCADE;

-- Kein Grund, den Typ zu behalten: Er hängt an nichts mehr, und stehen zu
-- lassen hiesse, dass ihn irgendwann jemand wieder benutzt.
DROP TYPE IF EXISTS public.app_role;

-- ══ Die zwei Funktionen ohne feste Namen ════════════════════════════════════

/*
 * Mitglied ist, wer eine Rolle hat.
 *
 * Vorher stand hier die Aufzählung aller sechs Rollen – was dasselbe bedeutete,
 * solange es genau diese sechs gab. Bei freien Rollen hätte eine neue Rolle
 * niemanden zum Mitglied gemacht, und der Fehler wäre erst aufgefallen, wenn
 * jemand den Mitgliederbereich nicht mehr sieht.
 */
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$fn$;

/*
 * Die Vereinsleitung, jetzt aus dem Katalog.
 *
 * Ausgewertet in fünfzehn Zugriffsregeln. Welche Rollen dazugehören, steht als
 * Eigenschaft an der Rolle und nicht mehr in dieser Funktion.
 */
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
    WHERE ur.user_id = _user_id AND rc.is_leitung
  )
$fn$;

/*
 * Wie viele Mitglieder es gibt.
 *
 * Zählte ebenfalls die sechs Rollen auf. Gemeint war: alle mit einer Rolle.
 */
CREATE OR REPLACE FUNCTION public.count_members()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COUNT(DISTINCT user_id) FROM public.user_roles
$fn$;

-- ══ Rollen pflegen ══════════════════════════════════════════════════════════
--
-- Bisher konnte der Katalog nur gelesen werden. Jetzt darf ihn ändern, wer
-- ohnehin Rechte vergibt – wer Rollen anlegen kann, kann sich sonst über eine
-- neue Rolle alles geben, also ist dasselbe Recht die richtige Schwelle.

DROP POLICY IF EXISTS role_catalog_lesen ON public.role_catalog;
CREATE POLICY role_catalog_lesen ON public.role_catalog
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS role_catalog_pflegen ON public.role_catalog;
CREATE POLICY role_catalog_pflegen ON public.role_catalog
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'roles.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'roles.manage'));

ALTER TABLE public.role_catalog ENABLE ROW LEVEL SECURITY;

/*
 * Grundrollen lassen sich nicht löschen.
 *
 * `is_system` sagt, dass eine Rolle zur Installation gehört. Ohne diese Sperre
 * kann jemand die letzte Rolle mit `roles.manage` entfernen und sich damit
 * selbst aussperren – ein Fehler, den niemand rückgängig machen kann, weil
 * dafür genau dieses Recht nötig wäre.
 */
CREATE OR REPLACE FUNCTION public.role_catalog_schutz()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'Die Rolle „%" gehört zur Grundausstattung und kann nicht gelöscht werden.', OLD.label;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = OLD.key) THEN
    RAISE EXCEPTION 'An der Rolle „%" hängen noch Mitglieder. Trage sie erst um.', OLD.label;
  END IF;

  -- Die letzte Rolle, die Rechte vergeben darf, muss bleiben.
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

REVOKE ALL ON FUNCTION public.role_catalog_schutz() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS role_catalog_schutz_trigger ON public.role_catalog;
CREATE TRIGGER role_catalog_schutz_trigger
  BEFORE DELETE ON public.role_catalog
  FOR EACH ROW EXECUTE FUNCTION public.role_catalog_schutz();

-- Die heutigen Rollen sind Grundausstattung – bis jemand sie umbenennt.
UPDATE public.role_catalog SET is_system = true
WHERE key IN ('vorstand', 'mitglied') AND NOT is_system;

-- ══ Der Katalog für die Verwaltung ══════════════════════════════════════════
--
-- get_role_catalog() liefert nur Schlüssel und Beschriftung. Die Verwaltung
-- braucht mehr, um Rollen zu pflegen.

CREATE OR REPLACE FUNCTION public.rollen_status()
RETURNS TABLE (
  key           text,
  label         text,
  description   text,
  sort_order    integer,
  is_board      boolean,
  is_leitung    boolean,
  public_listed boolean,
  is_system     boolean,
  max_holders   integer,
  mitglieder    integer,
  rechte        integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT rc.key, rc.label, rc.description, rc.sort_order,
         rc.is_board, rc.is_leitung, rc.public_listed, rc.is_system, rc.max_holders,
         (SELECT count(*)::int FROM public.user_roles ur WHERE ur.role = rc.key),
         (SELECT count(*)::int FROM public.role_permissions rp
           WHERE rp.role = rc.key AND rp.granted)
  FROM public.role_catalog rc
  WHERE public.has_permission(auth.uid(), 'roles.manage')
  ORDER BY rc.sort_order, rc.label;
$fn$;

REVOKE ALL ON FUNCTION public.rollen_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollen_status() TO authenticated;
