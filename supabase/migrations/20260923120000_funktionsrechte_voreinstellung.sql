-- Datenbankfunktionen: nur noch ausführbar, wer es ausdrücklich darf.
--
-- Supabase gibt jeder neuen Funktion im Schema public von sich aus das Recht
-- zum Ausführen an anon und authenticated – über die Voreinstellung
-- (ALTER DEFAULT PRIVILEGES), nicht über PUBLIC. Der Ausgangsstand entzieht
-- jeder Funktion PUBLIC und vergibt dann, was sie braucht. Das greift an der
-- Voreinstellung vorbei: anon behielt sein eigenes Recht.
--
-- Nachgeprüft am 23. September mit dem öffentlichen Schlüssel, also so, wie
-- es jeder Besucher kann: Ohne Anmeldung lieferten get_member_directory und
-- get_member_ids die Namen und Kennungen der Mitglieder, backup_schema_ddl
-- den ganzen Aufbau der Datenbank, pending_digests (vorgesehen nur für den
-- Server) die ungelesenen Benachrichtigungen samt Namen. Vierzig Funktionen
-- waren für anon ausführbar, die es nicht sein sollten.
--
-- Diese Migration
--   1. nimmt die Voreinstellungen zurück, damit künftige Funktionen nicht
--      wieder von selbst offenstehen,
--   2. setzt jede vorhandene Funktion auf genau die Rechte, die der
--      Ausgangsstand und die späteren Migrationen ihr geben wollten.
--
-- Die Listen unten sind diese gewollten Rechte, aus allen Migrationen
-- zusammengetragen (ohne die Voreinstellung von Supabase). Funktionen von
-- Erweiterungen bleiben unberührt. Der Server (service_role) darf alles.
--
-- Wiederholbar.

-- Zwei Stufen, weil PostgreSQL sie trennt: Die Voreinstellung für das Schema
-- kann nur hinzufügen, was die allgemeine gibt – und die allgemeine gibt jeder
-- neuen Funktion EXECUTE an PUBLIC. Die erste Zeile nimmt Supabases Zusatz für
-- anon und authenticated zurück, die zweite das Recht für PUBLIC. Künftige
-- Migrationen müssen deshalb ausdrücklich vergeben, wer eine neue Funktion
-- aufrufen darf – wie es die bisherigen ohnehin tun.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE
  -- Aufrufbar ohne Anmeldung: was die öffentliche Seite, der Aufnahmeantrag,
  -- die Formulare mit Zugangslink und die Zugriffsregeln brauchen.
  fuer_alle text[] := ARRAY[
    'contribution_category_offered', 'contribution_category_status', 'count_members',
    'forum_mentioned_users', 'get_contribution_rate', 'get_current_contribution_rate',
    'get_current_statutes_path', 'get_form_by_token', 'get_public_personas',
    'get_public_settings', 'get_response_by_edit_token', 'has_leadership_role',
    'has_permission', 'is_member', 'module_enabled', 'module_status',
    'onboarding_completed_tasks', 'public_branding', 'public_contribution_settings',
    'remove_contribution_category', 'restore_contribution_category',
    'seo_organization_pages', 'setup_needed', 'statutes_options',
    'submit_form_response', 'update_response_by_edit_token'
  ];
  -- Nur für Angemeldete.
  fuer_angemeldete text[] := ARRAY[
    'assign_response_to_member', 'can_vote', 'cancel_donation_receipt', 'cast_votes',
    'ensure_event_thread', 'event_attendee_care', 'event_attendee_certificates',
    'forum_can', 'forum_poll_results', 'forum_thread_audience', 'get_board_members',
    'get_election_results', 'get_map_members', 'get_member_directory', 'get_member_ids',
    'get_pending_application_count', 'get_permission_catalog', 'get_role_catalog',
    'get_user_permissions', 'get_user_vote_count', 'has_voted',
    'import_paid_contributions', 'inventory_available', 'issue_donation_receipt',
    'mark_notifications_read', 'role_status', 'set_persona_public', 'setup_status',
    'update_form_settings'
  ];
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signatur, p.proname AS name
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.prokind = 'f'
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signatur);
    IF f.name = ANY (fuer_alle) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', f.signatur);
    ELSIF f.name = ANY (fuer_angemeldete) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.signatur);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signatur);
  END LOOP;
END $$;
