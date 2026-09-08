-- Grundlage für die Sicherung ohne Datenbank-Passwort
--
-- In der Lovable-Cloud gibt es weder eine Verbindungszeichenfolge noch das
-- Datenbank-Passwort; `pg_dump` von außen ist damit ausgeschlossen. Der
-- Service-Role-Schlüssel muss deshalb aber nicht herausgegeben werden: Die
-- Edge Functions haben ihn ohnehin in ihrer eigenen Umgebung. Der Abzug
-- entsteht also innen und wird nur abgeholt.
--
-- Diese beiden Funktionen liefern, was über die normale API nicht zu bekommen
-- ist: die Liste aller Tabellen und den Aufbau der Datenbank als SQL.

/**
 * Alle Tabellen des öffentlichen Schemas mit ungefährer Zeilenzahl.
 *
 * Die Zahl stammt aus der Planer-Statistik und ist nur ein Anhaltspunkt fürs
 * Protokoll – gezählt wird beim Abholen ohnehin exakt. Wichtig ist die Liste:
 * Wer eine neue Tabelle anlegt, hat sie damit automatisch in der Sicherung,
 * ohne dass jemand daran denken muss.
 */
CREATE OR REPLACE FUNCTION public.backup_manifest()
RETURNS TABLE (table_name text, approx_rows bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.relname::text, GREATEST(c.reltuples::bigint, 0)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY c.relname;
$$;

COMMENT ON FUNCTION public.backup_manifest() IS
  'Tabellenliste fuer die Sicherung. Nur fuer service_role.';

/**
 * Der Aufbau der Datenbank als SQL.
 *
 * Die Migrationen im Repository beschreiben den Aufbau zwar auch – aber nur
 * den beabsichtigten. Was tatsächlich in der Datenbank steht, kann davon
 * abweichen, sobald jemand einmal etwas von Hand im SQL-Editor ändert. Genau
 * dieser Abstand ist im Ernstfall das Problem, deshalb wird der Ist-Zustand
 * mitgesichert.
 *
 * Kein vollwertiger pg_dump: Reihenfolge und Feinheiten (Sequenzen,
 * Berechtigungen) fehlen. Für „was war da eigentlich?" und zum Nachbauen von
 * Hand reicht es, und mehr ist von außen nicht zu bekommen.
 */
CREATE OR REPLACE FUNCTION public.backup_schema_ddl()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _out text := '-- Aufbau des Schemas public, erzeugt am ' ||
               to_char(now(), 'YYYY-MM-DD HH24:MI:SS TZ') || E'\n';
  _part text;
BEGIN
  -- ── Aufzählungstypen ──────────────────────────────────────────────────────
  SELECT COALESCE(string_agg(
           format('CREATE TYPE public.%I AS ENUM (%s);', typname, labels),
           E'\n' ORDER BY typname), '')
    INTO _part
  FROM (
    SELECT t.typname::text AS typname,
           string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
  ) enums;
  _out := _out || E'\n-- ══ Typen ══\n' || _part || E'\n';

  -- ── Tabellen mit Spalten ──────────────────────────────────────────────────
  SELECT COALESCE(string_agg(
           format(E'CREATE TABLE public.%I (\n%s\n);', relname, cols),
           E'\n\n' ORDER BY relname), '')
    INTO _part
  FROM (
    SELECT c.relname::text AS relname,
           string_agg(
             format('  %I %s%s%s',
                    a.attname,
                    format_type(a.atttypid, a.atttypmod),
                    CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END,
                    COALESCE(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '')),
             E',\n' ORDER BY a.attnum) AS cols
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND NOT a.attisdropped
    GROUP BY c.relname
  ) tabs;
  _out := _out || E'\n-- ══ Tabellen ══\n' || _part || E'\n';

  -- ── Schlüssel, Fremdschlüssel, Prüfbedingungen ────────────────────────────
  SELECT COALESCE(string_agg(
           format('ALTER TABLE public.%I ADD CONSTRAINT %I %s;', tbl, con, def),
           E'\n' ORDER BY tbl, con), '')
    INTO _part
  FROM (
    SELECT c.relname::text AS tbl, con.conname::text AS con,
           pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  ) cons;
  _out := _out || E'\n-- ══ Bedingungen ══\n' || _part || E'\n';

  -- ── Indizes (die zu Bedingungen gehörenden stehen schon oben) ─────────────
  SELECT COALESCE(string_agg(indexdef || ';', E'\n' ORDER BY indexname), '')
    INTO _part
  FROM pg_indexes i
  WHERE i.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class ic ON ic.oid = con.conindid
      WHERE ic.relname = i.indexname
    );
  _out := _out || E'\n-- ══ Indizes ══\n' || _part || E'\n';

  -- ── Funktionen ────────────────────────────────────────────────────────────
  SELECT COALESCE(string_agg(def, E'\n\n' ORDER BY def), '')
    INTO _part
  FROM (
    SELECT pg_get_functiondef(p.oid) || ';' AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
  ) fns;
  _out := _out || E'\n-- ══ Funktionen ══\n' || _part || E'\n';

  -- ── Trigger ───────────────────────────────────────────────────────────────
  SELECT COALESCE(string_agg(pg_get_triggerdef(t.oid) || ';', E'\n' ORDER BY t.tgname), '')
    INTO _part
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal;
  _out := _out || E'\n-- ══ Trigger ══\n' || _part || E'\n';

  -- ── Zugriffsschutz ────────────────────────────────────────────────────────
  --
  -- Der wichtigste Teil überhaupt: Ohne die Policies stünden die Daten nach
  -- einer Wiederherstellung offen.
  SELECT COALESCE(string_agg(
           format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', relname),
           E'\n' ORDER BY relname), '')
    INTO _part
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity;
  _out := _out || E'\n-- ══ Zugriffsschutz ══\n' || _part || E'\n\n';

  SELECT COALESCE(string_agg(
           format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
                  policyname, tablename, permissive, cmd,
                  array_to_string(roles, ', '),
                  COALESCE(' USING (' || qual || ')', ''),
                  COALESCE(' WITH CHECK (' || with_check || ')', '')),
           E'\n' ORDER BY tablename, policyname), '')
    INTO _part
  FROM pg_policies
  WHERE schemaname = 'public';
  _out := _out || _part || E'\n';

  RETURN _out;
END;
$$;

COMMENT ON FUNCTION public.backup_schema_ddl() IS
  'Ist-Zustand des Schemas als SQL. Nur fuer service_role.';

-- Beides ist ausdrücklich NICHT für angemeldete Mitglieder: Die Tabellenliste
-- und erst recht der vollständige Aufbau samt Policies gehören niemandem außer
-- dem Sicherungslauf.
REVOKE ALL ON FUNCTION public.backup_manifest()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.backup_schema_ddl() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backup_manifest()   TO service_role;
GRANT EXECUTE ON FUNCTION public.backup_schema_ddl() TO service_role;
