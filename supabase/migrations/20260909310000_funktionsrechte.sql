-- Wer welche Funktion aufrufen darf
--
-- In Postgres darf PUBLIC jede neue Funktion ausführen, solange niemand
-- widerspricht. Das ist bei einer Datenbank hinter einer Anwendung eine
-- Kleinigkeit – bei Supabase nicht: Der anon-Schlüssel steht im ausgelieferten
-- Programm, jeder Besucher hat ihn, und damit lässt sich jede Funktion
-- aufrufen, der niemand widersprochen hat.
--
-- Achtzehn Funktionen hatten keine einzige GRANT-Zeile. Zwei davon sind der
-- eigentliche Grund für diese Migration:
--
--   pending_digests()          Liefert Namen und ALLE ungelesenen
--                              Benachrichtigungen jedes Mitglieds. Gedacht für
--                              die Edge Function, die abends die
--                              Zusammenfassung verschickt. Aufrufbar war sie
--                              von jedem.
--   push_targets_for_thread()  Wer welches Forumsthema abonniert hat.
--
-- Dazu backup_manifest() und backup_schema_ddl(), die den Aufbau der Datenbank
-- ausgeben, und elf Triggerfunktionen, die niemand direkt aufrufen soll.
--
-- Triggerfunktionen brauchen kein EXECUTE: Postgres ruft sie im Rahmen der
-- auslösenden Anweisung auf, nicht im Namen der anfragenden Person. Entziehen
-- ist also folgenlos für den Betrieb und schliesst den direkten Aufruf aus.

-- ══ Nur für den Server ══════════════════════════════════════════════════════
--
-- Diese vier ruft eine Edge Function mit dem Service-Schlüssel auf. Für alle
-- anderen gibt es keinen Grund, sie zu erreichen.

REVOKE ALL ON FUNCTION public.pending_digests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pending_digests() TO service_role;

REVOKE ALL ON FUNCTION public.push_targets_for_thread(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_targets_for_thread(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.push_mark_failure(text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_mark_failure(text, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.backup_manifest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backup_manifest() TO service_role;

REVOKE ALL ON FUNCTION public.backup_schema_ddl() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backup_schema_ddl() TO service_role;

-- ══ Triggerfunktionen ═══════════════════════════════════════════════════════
--
-- Werden vom Trigger gerufen, nie von aussen. Ohne Entzug könnte jemand etwa
-- create_forum_reply_notifications() direkt aufrufen und Benachrichtigungen
-- erzeugen, zu denen es keinen Beitrag gibt.

REVOKE ALL ON FUNCTION public.create_forum_mention_notifications() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_forum_reply_notifications() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.events_archive_thread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.events_create_thread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.events_sync_thread_title() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.forum_keep_revision() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.forum_notify_post() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.forum_notify_thread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.forum_touch_thread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_thread_on_post() FROM PUBLIC, anon, authenticated;

-- ══ Rollenprüfungen ═════════════════════════════════════════════════════════
--
-- is_herold() und is_schatzmeister() werden in alten RLS-Regeln benutzt. Die
-- Regeln haben keine TO-Klausel und gelten damit auch für nicht angemeldete
-- Anfragen; fehlte dort das Ausführungsrecht, käme statt „keine Zeilen" ein
-- Fehler zurück. Deshalb bleibt der Zugang – aber ausdrücklich und nicht über
-- PUBLIC, das jede künftige Datenbankrolle mit einschliesst.

REVOKE ALL ON FUNCTION public.is_herold(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_herold(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.is_schatzmeister(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_schatzmeister(uuid) TO anon, authenticated;

-- Drei weitere Triggerfunktionen, beim Durchzaehlen aufgefallen.
REVOKE ALL ON FUNCTION public.forum_threads_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.site_pages_touch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vorlagen_touch() FROM PUBLIC, anon, authenticated;

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
-- aussen aufgerufen. Der Zugang bleibt, aber ausdruecklich.
REVOKE ALL ON FUNCTION public.forum_mentioned_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_mentioned_users(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.beitragsstufe_angeboten(boolean, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beitragsstufe_angeboten(boolean, integer, integer) TO anon, authenticated;
