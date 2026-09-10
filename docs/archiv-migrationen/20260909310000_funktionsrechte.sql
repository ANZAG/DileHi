-- Wer welche Datenbankfunktion aufrufen darf
--
-- In Postgres darf PUBLIC jede neue Funktion ausführen, solange niemand
-- widerspricht. Das ist bei einer Datenbank hinter einer Anwendung eine
-- Kleinigkeit – bei Supabase nicht: Der anon-Schlüssel steht im ausgelieferten
-- Programm, jeder Besucher hat ihn, und damit lässt sich jede Funktion
-- aufrufen, der niemand widersprochen hat.
--
-- Zwei davon sind der eigentliche Grund für diese Migration:
--
--   pending_digests()          Liefert Namen und ALLE ungelesenen
--                              Benachrichtigungen jedes Mitglieds. Gedacht für
--                              die Edge Function, die abends die
--                              Zusammenfassung verschickt. Aufrufbar war sie
--                              von jedem.
--   push_targets_for_thread()  Wer welches Forumsthema abonniert hat.
--
-- Dazu backup_manifest() und backup_schema_ddl(), die den Aufbau der Datenbank
-- ausgeben, und die Triggerfunktionen, die niemand direkt aufrufen soll.
--
-- ── Warum das hier Schleifen sind und keine Aufzählung ─────────────────────
--
-- Die erste Fassung zählte die Funktionen namentlich auf. Sie scheiterte an
-- der ersten Zeile: `create_forum_mention_notifications()` gibt es nicht mehr,
-- sie wurde im Mai gelöscht. Die Liste war aus den CREATE-Anweisungen der
-- Migrationen entstanden – und hatte die DROPs übersehen.
--
-- Eine von Hand gepflegte Liste von Funktionsnamen geht genau so aus. Deshalb
-- fragt diese Migration die Datenbank: Was es nicht gibt, wird übersprungen,
-- und die Triggerfunktionen ergeben sich aus den Triggern selbst statt aus
-- einer Abschrift.

-- ══ Nur für den Server ══════════════════════════════════════════════════════
--
-- Diese fünf ruft eine Edge Function mit dem Service-Schlüssel auf. Für alle
-- anderen gibt es keinen Grund, sie zu erreichen.

DO $$
DECLARE
  v_namen text[] := ARRAY[
    'pending_digests',
    'push_targets_for_thread',
    'push_mark_failure',
    'backup_manifest',
    'backup_schema_ddl'
  ];
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(v_namen)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- ══ Triggerfunktionen ═══════════════════════════════════════════════════════
--
-- Werden vom Trigger gerufen, nie von aussen: Postgres führt sie im Rahmen der
-- auslösenden Anweisung aus und nicht im Namen der anfragenden Person. Der
-- Entzug ist deshalb folgenlos für den Betrieb und schliesst den direkten
-- Aufruf aus – etwa den, Benachrichtigungen zu erzeugen, zu denen es gar
-- keinen Beitrag gibt.
--
-- Abgeleitet aus pg_trigger und nicht aus einer Liste: Was ein Trigger ruft,
-- weiss die Datenbank besser als wir.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT p.oid::regprocedure AS sig
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- ══ Rollenprüfungen ═════════════════════════════════════════════════════════
--
-- is_herold() und is_schatzmeister() werden in alten RLS-Regeln benutzt. Die
-- Regeln haben keine TO-Klausel und gelten damit auch für nicht angemeldete
-- Anfragen; fehlte dort das Ausführungsrecht, käme statt „keine Zeilen" ein
-- Fehler zurück. Deshalb bleibt der Zugang – aber ausdrücklich und nicht über
-- PUBLIC, das jede künftige Datenbankrolle mit einschliesst.

DO $$
DECLARE
  v_namen text[] := ARRAY['is_herold', 'is_schatzmeister'];
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(v_namen)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', r.sig);
  END LOOP;
END $$;

-- ══ Fester Suchpfad ═════════════════════════════════════════════════════════
--
-- Ohne `SET search_path` entscheidet der Aufrufer, in welchem Schema die
-- benutzten Namen gesucht werden. Bei einer Funktion, die aus einer
-- SECURITY-DEFINER-Umgebung heraus gerufen wird, lässt sich damit eigener Code
-- unterschieben. Beide Funktionen hier sind harmlos – aber die Regel gilt für
-- alle, sonst muss man bei jeder einzeln nachdenken.

CREATE OR REPLACE FUNCTION public.forum_mentioned_users(_body text)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT DISTINCT m[1]::uuid
  FROM regexp_matches(
         COALESCE(_body, ''),
         'data-mention-id="([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"',
         'g'
       ) AS m;
$fn$;

CREATE OR REPLACE FUNCTION public.beitragsstufe_angeboten(
  _is_active boolean, _geloescht_ab integer, _jahr integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
  SELECT _is_active
     AND (_geloescht_ab IS NULL
          OR COALESCE(_jahr, EXTRACT(YEAR FROM CURRENT_DATE)::int) < _geloescht_ab);
$fn$;

-- Beide werden aus anderen Funktionen und aus Regeln heraus benutzt, nicht von
-- aussen aufgerufen. Der Zugang bleibt, aber ausdrücklich.
REVOKE ALL ON FUNCTION public.forum_mentioned_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_mentioned_users(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.beitragsstufe_angeboten(boolean, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beitragsstufe_angeboten(boolean, integer, integer) TO anon, authenticated;

-- ══ Was übrig bleibt ════════════════════════════════════════════════════════
--
-- Zum Schluss dasselbe noch einmal von der anderen Seite: Jede Funktion in
-- `public`, die weder ausdrücklich jemandem gegeben noch entzogen wurde, steht
-- weiterhin PUBLIC offen. Statt sie zu erraten, werden sie hier aufgelistet –
-- als Hinweis im Protokoll des Einspielens, nicht als Fehler.
--
-- Angefasst wird nichts: Was eine Funktion darf, ist eine Entscheidung und
-- keine Aufräumarbeit.

DO $$
DECLARE v_offen text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname)
  INTO v_offen
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND has_function_privilege('anon', p.oid, 'EXECUTE')
    AND NOT EXISTS (
      SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
      WHERE a.grantee <> 0
    );

  IF v_offen IS NOT NULL THEN
    RAISE NOTICE 'Ohne ausdrueckliche Regelung, weiter fuer PUBLIC ausfuehrbar: %', v_offen;
  END IF;
END $$;
