-- Die Datenbank spricht englisch.
--
-- DING soll ein Produkt sein, das andere Vereine aufsetzen, und dafür gilt:
-- Code und Datenbank englisch, die Oberfläche deutsch. Was hier noch deutsch
-- hiess, stammt aus der Zeit, als DileHi ein Vereinsprojekt war.
--
-- Umbenannt wird, was zum Aufbau gehört, und die Werte, die daran hängen:
--
--   Tabellen      onboarding_schritte → onboarding_steps
--                 onboarding_hilfe    → onboarding_help
--
--   Spalten       titel → title, tipp → tip, anker → anchor,
--                 recht → permission, modul → module, aufgabe → task,
--                 standard → defaults, hinweis → description,
--                 betreff → subject, kennzeile → eyebrow,
--                 ueberschrift → heading, inhalt → body,
--                 knopf → button_label, fussnote → footnote,
--                 platzhalter → placeholders, art → kind, bereich → area,
--                 geloescht_ab → removed_from,
--                 beitrag_aufbewahrung_jahre → contribution_retention_years,
--                 satzung_document_id → statutes_document_id,
--                 satzung_link → statutes_link
--
--   Werte         app_modules.kind      grundfunktion → core, zusatz → addon
--                 site_menu.area        kopf → header, fuss_rechtliches → footer_legal
--                 Modulschlüssel        besucher_highlights → visitor_highlights,
--                                       einbindung → embedding,
--                                       fahrgemeinschaften → carpools,
--                                       helfer → helpers,
--                                       lagerlogistik → camp_logistics,
--                                       verpflegung → catering
--                 Aufgaben im Profil    profil → profile, zelte → tents,
--                                       steckbrief → persona, zusage → attendance,
--                                       verein_benannt → club_named,
--                                       bankverbindung → bank_account,
--                                       seite → page, mitglieder → members
--                 JSON in `defaults`    dieselben Namen wie die Spalten
--
--   Funktionen    is_vorstand → has_leadership_role
--                 vorlagen_touch → templates_touch
--                 get_current_satzung_path → get_current_statutes_path
--                 satzung_auswahl → statutes_options
--                 seo_organisation_seiten → seo_organization_pages
--                 beitragsstufe_angeboten → contribution_category_offered
--                 beitragsstufe_entfernen → remove_contribution_category
--                 beitragsstufe_wieder_anbieten → restore_contribution_category
--                 beitragsstufen_status → contribution_category_status
--                 onboarding_erledigt → onboarding_completed_tasks
--                 dazu die Rückgaben von module_status, public_branding,
--                 public_contribution_settings
--
--   Richtlinien   alle in public mit deutschem Namen
--
-- Bewusst noch nicht: Werte, die Inhalte des Vereins sind oder in ihnen
-- stecken – Mitgliedsarten (aktiv, foerder), Beitragsmodell (fest),
-- Dokumentkategorien (satzung, vorstand), Schlüssel der Touren und Anker,
-- die Namen der Seitenbausteine im Editor. Und die Richtlinien in `storage`:
-- Die Tabelle gehört nicht postgres, ein Umbenennen dort ist nicht sicher.
--
-- Umbenennen statt neu anlegen: Richtlinien, Fremdschlüssel und Rechte hängen
-- an der Kennung eines Objekts, nicht an seinem Namen, und ziehen mit. Nur
-- was als Text in einem Funktionsrumpf steht, zieht nicht mit – deshalb
-- werden die betroffenen Funktionen unten neu geschrieben.

-- ── Tabellen ─────────────────────────────────────────────────────────────────

ALTER TABLE public.onboarding_schritte RENAME TO onboarding_steps;
ALTER TABLE public.onboarding_hilfe RENAME TO onboarding_help;
ALTER TABLE public.onboarding_steps RENAME CONSTRAINT onboarding_schritte_pkey TO onboarding_steps_pkey;
ALTER TABLE public.onboarding_help RENAME CONSTRAINT onboarding_hilfe_pkey TO onboarding_help_pkey;

-- ── Spalten ──────────────────────────────────────────────────────────────────

ALTER TABLE public.onboarding_steps RENAME COLUMN titel TO title;
ALTER TABLE public.onboarding_steps RENAME COLUMN tipp TO tip;
ALTER TABLE public.onboarding_steps RENAME COLUMN anker TO anchor;
ALTER TABLE public.onboarding_steps RENAME COLUMN recht TO permission;
ALTER TABLE public.onboarding_steps RENAME COLUMN modul TO module;
ALTER TABLE public.onboarding_steps RENAME COLUMN aufgabe TO task;
ALTER TABLE public.onboarding_steps RENAME COLUMN standard TO defaults;

ALTER TABLE public.onboarding_help RENAME COLUMN titel TO title;
ALTER TABLE public.onboarding_help RENAME COLUMN standard TO defaults;

ALTER TABLE public.mail_templates RENAME COLUMN hinweis TO description;
ALTER TABLE public.mail_templates RENAME COLUMN betreff TO subject;
ALTER TABLE public.mail_templates RENAME COLUMN kennzeile TO eyebrow;
ALTER TABLE public.mail_templates RENAME COLUMN ueberschrift TO heading;
ALTER TABLE public.mail_templates RENAME COLUMN inhalt TO body;
ALTER TABLE public.mail_templates RENAME COLUMN knopf TO button_label;
ALTER TABLE public.mail_templates RENAME COLUMN fussnote TO footnote;
ALTER TABLE public.mail_templates RENAME COLUMN platzhalter TO placeholders;
ALTER TABLE public.mail_templates RENAME COLUMN standard TO defaults;

ALTER TABLE public.pdf_texts RENAME COLUMN hinweis TO description;
ALTER TABLE public.pdf_texts RENAME COLUMN titel TO title;
ALTER TABLE public.pdf_texts RENAME COLUMN inhalt TO body;
ALTER TABLE public.pdf_texts RENAME COLUMN platzhalter TO placeholders;
ALTER TABLE public.pdf_texts RENAME COLUMN standard TO defaults;

ALTER TABLE public.profile_fields RENAME COLUMN modul TO module;

ALTER TABLE public.contribution_categories RENAME COLUMN hinweis TO description;
ALTER TABLE public.contribution_categories RENAME COLUMN geloescht_ab TO removed_from;

ALTER TABLE public.app_settings RENAME COLUMN beitrag_aufbewahrung_jahre TO contribution_retention_years;
ALTER TABLE public.app_settings RENAME COLUMN satzung_document_id TO statutes_document_id;
ALTER TABLE public.app_settings RENAME COLUMN satzung_link TO statutes_link;
ALTER TABLE public.app_settings RENAME CONSTRAINT app_settings_satzung_document_fk TO app_settings_statutes_document_fk;

ALTER TABLE public.site_menu RENAME CONSTRAINT site_menu_ziel TO site_menu_target_check;

-- ── Werte mit Prüfregel ──────────────────────────────────────────────────────
--
-- Erst die Regel weg, dann die Werte, dann die Regel mit den neuen Werten.

ALTER TABLE public.app_modules DROP CONSTRAINT app_modules_art_check;
ALTER TABLE public.app_modules RENAME COLUMN art TO kind;
UPDATE public.app_modules SET kind = CASE kind WHEN 'grundfunktion' THEN 'core' WHEN 'zusatz' THEN 'addon' ELSE kind END;
ALTER TABLE public.app_modules ALTER COLUMN kind SET DEFAULT 'core';
ALTER TABLE public.app_modules ADD CONSTRAINT app_modules_kind_check CHECK (kind IN ('core', 'addon'));

ALTER TABLE public.site_menu DROP CONSTRAINT site_menu_bereich_check;
ALTER TABLE public.site_menu RENAME COLUMN bereich TO area;
UPDATE public.site_menu SET area = CASE area WHEN 'kopf' THEN 'header' WHEN 'fuss_rechtliches' THEN 'footer_legal' ELSE area END;
ALTER TABLE public.site_menu ALTER COLUMN area SET DEFAULT 'header';
ALTER TABLE public.site_menu ADD CONSTRAINT site_menu_area_check CHECK (area IN ('header', 'footer_legal'));

-- ── Modulschlüssel ───────────────────────────────────────────────────────────
--
-- `requires` zeigt auf `key` ohne ON UPDATE CASCADE. Keines der umbenannten
-- Module wird von einem anderen vorausgesetzt; die Zeilen, die selbst etwas
-- voraussetzen, behalten ihren Verweis.

CREATE TEMP TABLE module_rename (old text PRIMARY KEY, new text NOT NULL) ON COMMIT DROP;
INSERT INTO module_rename VALUES
  ('besucher_highlights', 'visitor_highlights'),
  ('einbindung', 'embedding'),
  ('fahrgemeinschaften', 'carpools'),
  ('helfer', 'helpers'),
  ('lagerlogistik', 'camp_logistics'),
  ('verpflegung', 'catering');

UPDATE public.app_modules m SET key = r.new FROM module_rename r WHERE m.key = r.old;
UPDATE public.app_modules m SET requires = r.new FROM module_rename r WHERE m.requires = r.old;
UPDATE public.onboarding_steps s SET module = r.new FROM module_rename r WHERE s.module = r.old;
UPDATE public.profile_fields f SET module = r.new FROM module_rename r WHERE f.module = r.old;

-- ── Aufgaben im Profil ───────────────────────────────────────────────────────

UPDATE public.onboarding_steps SET task = CASE task
  WHEN 'profil' THEN 'profile'
  WHEN 'zelte' THEN 'tents'
  WHEN 'steckbrief' THEN 'persona'
  WHEN 'zusage' THEN 'attendance'
  WHEN 'verein_benannt' THEN 'club_named'
  WHEN 'bankverbindung' THEN 'bank_account'
  WHEN 'seite' THEN 'page'
  WHEN 'mitglieder' THEN 'members'
  ELSE task END
WHERE task IS NOT NULL;

-- ── JSON in `defaults` ───────────────────────────────────────────────────────
--
-- Der Auslieferungszustand zum Zurücksetzen trägt die Spaltennamen als
-- Schlüssel. Ohne diesen Schritt setzte „Zurücksetzen" nichts mehr zurück.

CREATE FUNCTION pg_temp.rename_keys(doc jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_object_agg(
    CASE k
      WHEN 'titel' THEN 'title'
      WHEN 'tipp' THEN 'tip'
      WHEN 'inhalt' THEN 'body'
      WHEN 'betreff' THEN 'subject'
      WHEN 'kennzeile' THEN 'eyebrow'
      WHEN 'ueberschrift' THEN 'heading'
      WHEN 'knopf' THEN 'button_label'
      WHEN 'fussnote' THEN 'footnote'
      ELSE k END,
    v)
  FROM jsonb_each(doc) AS e(k, v)
$$;

UPDATE public.onboarding_steps SET defaults = pg_temp.rename_keys(defaults) WHERE defaults IS NOT NULL AND defaults <> '{}'::jsonb;
UPDATE public.onboarding_help SET defaults = pg_temp.rename_keys(defaults) WHERE defaults IS NOT NULL AND defaults <> '{}'::jsonb;
UPDATE public.mail_templates SET defaults = pg_temp.rename_keys(defaults) WHERE defaults IS NOT NULL AND defaults <> '{}'::jsonb;
UPDATE public.pdf_texts SET defaults = pg_temp.rename_keys(defaults) WHERE defaults IS NOT NULL AND defaults <> '{}'::jsonb;

-- ── Funktionen: nur der Name ändert sich ────────────────────────────────────
--
-- Rechte und die Verweise aus Richtlinien bleiben, weil sie an der Kennung
-- hängen. has_leadership_role steckt in neunzehn Richtlinien.

ALTER FUNCTION public.is_vorstand(uuid) RENAME TO has_leadership_role;
ALTER FUNCTION public.vorlagen_touch() RENAME TO templates_touch;
ALTER FUNCTION public.satzung_auswahl() RENAME TO statutes_options;
ALTER FUNCTION public.seo_organisation_seiten() RENAME TO seo_organization_pages;
ALTER FUNCTION public.get_current_satzung_path() RENAME TO get_current_statutes_path;
ALTER FUNCTION public.beitragsstufe_wieder_anbieten(text) RENAME TO restore_contribution_category;
ALTER FUNCTION public.beitragsstufe_entfernen(text) RENAME TO remove_contribution_category;

-- ── Funktionen: neuer Rumpf, gleiche Form ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_current_statutes_path()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    -- Das ausdrücklich gewählte Dokument.
    (SELECT d.storage_path
       FROM public.documents d
       JOIN public.app_settings s ON s.statutes_document_id = d.id
      WHERE s.id),
    -- Sonst das neueste der Kategorie.
    (SELECT storage_path
       FROM public.documents
      WHERE category = 'satzung'
      ORDER BY created_at DESC
      LIMIT 1)
  );
$function$;

CREATE OR REPLACE FUNCTION public.restore_contribution_category(_key text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.contribution_categories
  SET removed_from = NULL, is_active = true
  WHERE key = _key
    AND public.has_permission(auth.uid(), 'contributions.manage');
$function$;

CREATE OR REPLACE FUNCTION public.assign_response_to_member(_response_id uuid, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _event_owner uuid;
BEGIN
  SELECT e.created_by INTO _event_owner
  FROM event_form_responses r
  JOIN event_forms ef ON ef.id = r.form_id
  JOIN events e ON e.id = ef.event_id
  WHERE r.id = _response_id;

  IF _event_owner IS NULL THEN
    RAISE EXCEPTION 'Anmeldung nicht gefunden';
  END IF;

  IF NOT (
    _event_owner = auth.uid()
    OR public.has_leadership_role(auth.uid())
    OR public.has_permission(auth.uid(), 'events.moderate')
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  IF _user_id IS NOT NULL AND NOT public.is_member(_user_id) THEN
    RAISE EXCEPTION 'Zielnutzer ist kein aktives Mitglied';
  END IF;

  UPDATE event_form_responses
  SET user_id = _user_id, updated_at = now()
  WHERE id = _response_id;
END;
$function$;

-- Die Antwort ist englisch, die Meldungen dazu stehen in der Oberfläche
-- (src/components/beitraege/meldungen.ts).
CREATE OR REPLACE FUNCTION public.remove_contribution_category(_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year           int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_retention      int;
  v_members        int;
  v_former_members int;
  v_last_year      int;
  v_removed_from   int;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'contributions.manage') THEN
    RAISE EXCEPTION 'Keine Berechtigung.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contribution_categories WHERE key = _key) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown');
  END IF;

  -- Die letzte Stufe darf nicht weg: Ohne eine einzige stünde im Antrag keine
  -- Auswahl, und jedes neue Mitglied bekäme einen leeren Wert.
  IF (SELECT count(*) FROM public.contribution_categories) <= 1 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'last');
  END IF;

  SELECT s.contribution_retention_years INTO v_retention
  FROM public.app_settings s WHERE s.id;
  v_retention := COALESCE(v_retention, 5);

  SELECT
    count(*) FILTER (WHERE p.is_active IS DISTINCT FROM false),
    count(*) FILTER (WHERE p.is_active IS false)
  INTO v_members, v_former_members
  FROM public.profiles p WHERE p.membership_type = _key;

  IF v_members > 0 OR v_former_members > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'members',
                              'members', v_members, 'former_members', v_former_members);
  END IF;

  SELECT max(r.year) INTO v_last_year
  FROM public.contribution_rates r WHERE r.category = _key;

  -- Kein Satz, nie in Gebrauch: weg damit.
  IF v_last_year IS NULL THEN
    DELETE FROM public.contribution_categories WHERE key = _key;
    RETURN jsonb_build_object('ok', true, 'action', 'deleted');
  END IF;

  -- Aufbewahrungsfrist abgelaufen: Jetzt darf auch die Zeile weg. Die alten
  -- Sätze gehen mit, sie ergeben ohne die Stufe keinen Sinn mehr und
  -- unterliegen derselben Frist.
  IF v_last_year + v_retention < v_year THEN
    DELETE FROM public.contribution_rates WHERE category = _key;
    DELETE FROM public.contribution_categories WHERE key = _key;
    RETURN jsonb_build_object('ok', true, 'action', 'deleted',
                              'last_data_year', v_last_year);
  END IF;

  -- Steht für dieses Jahr schon ein Satz, gilt die Stufe noch bis Jahresende.
  v_removed_from := CASE WHEN v_last_year >= v_year THEN v_year + 1 ELSE v_year END;

  UPDATE public.contribution_categories
  SET removed_from = v_removed_from
  WHERE key = _key;

  RETURN jsonb_build_object(
    'ok', true,
    'action', CASE WHEN v_last_year >= v_year THEN 'scheduled' ELSE 'retired' END,
    'removed_from', v_removed_from,
    'deletable_from', v_last_year + v_retention + 1,
    'last_data_year', v_last_year
  );
END;
$function$;

-- ── Funktionen: neue Form ────────────────────────────────────────────────────
--
-- Parameter- und Spaltennamen einer Rückgabe lassen sich nicht ersetzen, nur
-- neu anlegen. Rechte deshalb wie bisher neu vergeben.

DROP FUNCTION public.beitragsstufen_status();
DROP FUNCTION public.beitragsstufe_angeboten(boolean, integer, integer);
DROP FUNCTION public.module_status();
DROP FUNCTION public.public_branding();
DROP FUNCTION public.onboarding_erledigt();

CREATE FUNCTION public.contribution_category_offered(_is_active boolean, _removed_from integer, _year integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT _is_active
     AND (_removed_from IS NULL
          OR COALESCE(_year, EXTRACT(YEAR FROM CURRENT_DATE)::int) < _removed_from);
$function$;

CREATE FUNCTION public.contribution_category_status()
 RETURNS TABLE(key text, label text, description text, sort_order integer, is_active boolean, removed_from integer, offered boolean, members integer, former_members integer, last_data_year integer, deletable_from integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.key, c.label, c.description, c.sort_order, c.is_active, c.removed_from,
    public.contribution_category_offered(c.is_active, c.removed_from),
    (SELECT count(*)::int FROM public.profiles p
      WHERE p.membership_type = c.key AND p.is_active IS DISTINCT FROM false),
    (SELECT count(*)::int FROM public.profiles p
      WHERE p.membership_type = c.key AND p.is_active IS false),
    latest.year,
    CASE WHEN latest.year IS NULL THEN NULL
         ELSE latest.year + COALESCE(
                (SELECT s.contribution_retention_years FROM public.app_settings s WHERE s.id), 5
              ) + 1
    END
  FROM public.contribution_categories c
  LEFT JOIN LATERAL (
    SELECT max(r.year) AS year FROM public.contribution_rates r WHERE r.category = c.key
  ) latest ON true
  WHERE public.has_permission(auth.uid(), 'contributions.manage')
  ORDER BY c.sort_order, c.label;
$function$;

CREATE OR REPLACE FUNCTION public.public_contribution_settings()
 RETURNS TABLE(model text, options jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE((SELECT s.contribution_model FROM public.app_settings s WHERE s.id), 'fest'),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'key', c.key,
               'label', c.label,
               'description', c.description,
               'amount', public.get_contribution_rate(c.key)
             ) ORDER BY c.sort_order, c.label)
      FROM public.contribution_categories c
      WHERE public.contribution_category_offered(c.is_active, c.removed_from)
    ), '[]'::jsonb);
$function$;

CREATE FUNCTION public.module_status()
 RETURNS TABLE(key text, label text, description text, kind text, requires text, sort_order integer, enabled boolean, active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.key, m.label, m.description, m.kind, m.requires, m.sort_order,
         m.enabled, public.module_enabled(m.key)
  FROM public.app_modules m
  ORDER BY m.sort_order, m.label;
$function$;

CREATE FUNCTION public.public_branding()
 RETURNS TABLE(org_name text, org_short_name text, org_tagline text, org_street text, org_zip text, org_city text, org_country text, org_email text, org_phone text, logo_path text, favicon_path text, logo_in_header boolean, color_primary text, color_dark text, color_surface text, seo_description text, seo_image_path text, website_url text, font_headings text, font_body text, board_members text, register_court text, register_number text, vat_id text, privacy_contact text, privacy_officer text, hosting_provider text, hosting_address text, footer_navigation_label text, footer_legal_label text, statutes_link boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT org_name, org_short_name, org_tagline, org_street, org_zip, org_city,
         org_country, org_email, org_phone,
         logo_path, favicon_path, logo_in_header, color_primary, color_dark,
         color_surface, seo_description, seo_image_path, website_url,
         font_headings, font_body,
         board_members, register_court, register_number, vat_id,
         privacy_contact, privacy_officer, hosting_provider, hosting_address,
         footer_navigation_label, footer_legal_label, statutes_link
  FROM public.app_settings
  WHERE id;
$function$;

-- Welche Aufgaben im Profil schon erledigt sind. Die Schlüssel stehen in
-- onboarding_steps.task.
CREATE FUNCTION public.onboarding_completed_tasks()
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(k), ARRAY[]::text[]) FROM (
    SELECT 'profile' AS k WHERE EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE(p.first_name, '') <> ''
        AND COALESCE(p.last_name, '') <> ''
        AND COALESCE(p.city, '') <> ''
    )
    UNION ALL
    SELECT 'tents' WHERE EXISTS (
      SELECT 1 FROM public.member_tents t WHERE t.user_id = auth.uid()
    )
    UNION ALL
    SELECT 'persona' WHERE EXISTS (
      SELECT 1 FROM public.member_personas m WHERE m.user_id = auth.uid()
    )
    UNION ALL
    SELECT 'attendance' WHERE EXISTS (
      SELECT 1 FROM public.event_attendees a WHERE a.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_form_responses r WHERE r.user_id = auth.uid()
    )
    UNION ALL
    SELECT 'forum' WHERE EXISTS (
      SELECT 1 FROM public.forum_posts f WHERE f.created_by = auth.uid()
    )
    -- Ab hier die Einrichtung. Sie hängt nicht an der Person, sondern am
    -- Verein: Wer das Logo hochlädt, erledigt es für alle.
    UNION ALL
    SELECT 'club_named' WHERE EXISTS (
      SELECT 1 FROM public.app_settings s
      WHERE s.id AND s.org_name <> 'Mein Verein e. V.'
    )
    UNION ALL
    SELECT 'logo' WHERE EXISTS (
      SELECT 1 FROM public.app_settings s WHERE s.id AND COALESCE(s.logo_path, '') <> ''
    )
    UNION ALL
    SELECT 'bank_account' WHERE EXISTS (
      SELECT 1 FROM public.app_settings s WHERE s.id AND COALESCE(s.bank_iban, '') <> ''
    )
    UNION ALL
    SELECT 'page' WHERE EXISTS (
      SELECT 1 FROM public.site_pages p WHERE p.is_published
    )
    UNION ALL
    SELECT 'members' WHERE (SELECT count(*) FROM public.profiles) > 1
  ) t;
$function$;

REVOKE ALL ON FUNCTION public.contribution_category_offered(boolean, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contribution_category_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.module_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.onboarding_completed_tasks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contribution_category_offered(boolean, integer, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.contribution_category_status() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.module_status() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_completed_tasks() TO anon, authenticated, service_role;

-- ── Richtlinien ──────────────────────────────────────────────────────────────

DO $rename$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('app_modules', 'Modulstatus ist oeffentlich lesbar', 'Module status is public'),
    ('app_modules', 'Systemverwaltung schaltet Module', 'System admins toggle modules'),
    ('app_settings', 'Mitglieder lesen Vereinsdaten', 'Members read club settings'),
    ('app_settings', 'Systemverwaltung aendert Vereinsdaten', 'System admins change club settings'),
    ('application_fields', 'application_fields_lesen', 'application_fields_read'),
    ('application_fields', 'application_fields_pflegen', 'application_fields_manage'),
    ('contribution_categories', 'contribution_categories_lesen', 'contribution_categories_read'),
    ('contribution_categories', 'contribution_categories_pflegen', 'contribution_categories_manage'),
    ('event_form_responses', 'Event owner or vorstand can view responses', 'Event owner or leaders can view responses'),
    ('form_templates', 'Mitglieder koennen Vorlagen lesen', 'Members read form templates'),
    ('form_templates', 'Vorstand kann Vorlagen aendern', 'Leaders update form templates'),
    ('form_templates', 'Vorstand kann Vorlagen anlegen', 'Leaders create form templates'),
    ('form_templates', 'Vorstand kann Vorlagen loeschen', 'Leaders delete form templates'),
    ('forum_categories', 'Rubrik vorschlagen', 'Suggest forum category'),
    ('forum_categories', 'Rubriken loeschen', 'Delete forum categories'),
    ('forum_categories', 'Rubriken sehen', 'Read forum categories'),
    ('forum_categories', 'Rubriken verwalten', 'Manage forum categories'),
    ('forum_category_roles', 'Rubrikrechte sehen', 'Read forum category roles'),
    ('forum_category_roles', 'Rubrikrechte verwalten', 'Manage forum category roles'),
    ('forum_drafts', 'Eigene Entwuerfe', 'Own drafts'),
    ('forum_poll_votes', 'Eigene Stimme', 'Own vote'),
    ('forum_poll_votes', 'Stimmen sehen', 'Read votes'),
    ('forum_post_revisions', 'Verlauf sehen', 'Read revisions'),
    ('forum_posts', 'Beitraege sehen', 'Read posts'),
    ('forum_posts', 'Beitrag aendern', 'Edit post'),
    ('forum_posts', 'Beitrag entfernen', 'Remove post'),
    ('forum_posts', 'Beitrag schreiben', 'Write post'),
    ('forum_reactions', 'Eigene Reaktion', 'Own reaction'),
    ('forum_reactions', 'Reaktionen sehen', 'Read reactions'),
    ('forum_read_state', 'Eigener Lesestand', 'Own read state'),
    ('forum_subscriptions', 'Eigene Abos', 'Own subscriptions'),
    ('forum_threads', 'Thema aendern', 'Edit thread'),
    ('forum_threads', 'Thema eroeffnen', 'Open thread'),
    ('forum_threads', 'Thema loeschen', 'Delete thread'),
    ('forum_threads', 'Themen sehen', 'Read threads'),
    ('mail_templates', 'mail_templates_aendern', 'mail_templates_update'),
    ('mail_templates', 'mail_templates_lesen', 'mail_templates_read'),
    ('member_personas', 'Users or Vorstand can delete personas', 'Users or leaders can delete personas'),
    ('member_personas', 'Users or Vorstand can update personas', 'Users or leaders can update personas'),
    ('onboarding_help', 'onboarding_hilfe_lesen', 'onboarding_help_read'),
    ('onboarding_help', 'onboarding_hilfe_pflegen', 'onboarding_help_manage'),
    ('onboarding_steps', 'onboarding_schritte_lesen', 'onboarding_steps_read'),
    ('onboarding_steps', 'onboarding_schritte_pflegen', 'onboarding_steps_manage'),
    ('pdf_texts', 'pdf_texts_aendern', 'pdf_texts_update'),
    ('pdf_texts', 'pdf_texts_oeffentlich', 'pdf_texts_public'),
    ('profile_fields', 'profile_fields_lesen', 'profile_fields_read'),
    ('profile_fields', 'profile_fields_pflegen', 'profile_fields_manage'),
    ('push_subscriptions', 'Eigene Geraete', 'Own devices'),
    ('role_catalog', 'role_catalog_lesen', 'role_catalog_read'),
    ('role_catalog', 'role_catalog_pflegen', 'role_catalog_manage'),
    ('role_permissions', 'Vorstand can delete permissions', 'Leaders can delete permissions'),
    ('role_permissions', 'Vorstand can insert permissions', 'Leaders can insert permissions'),
    ('role_permissions', 'Vorstand can update permissions', 'Leaders can update permissions'),
    ('role_permissions', 'Vorstand can view permissions', 'Leaders can view permissions'),
    ('site_categories', 'Kategorien lesen', 'Read site categories'),
    ('site_categories', 'Kategorien verwalten', 'Manage site categories'),
    ('site_menu', 'Menue oeffentlich lesen', 'Read menu'),
    ('site_menu', 'Menue verwalten', 'Manage menu'),
    ('site_pages', 'Seiten anlegen', 'Create pages'),
    ('site_pages', 'Seiten bearbeiten', 'Edit pages'),
    ('site_pages', 'Seiten loeschen', 'Delete pages'),
    ('site_pages', 'Seiten oeffentlich lesen', 'Read published pages')
  ) AS t(tbl, old, new)
  LOOP
    -- Eine Richtlinie, die es nicht gibt, ist hier ein Fehler: Dann stimmt die
    -- Liste nicht mit der Datenbank überein, und das soll auffallen.
    EXECUTE format('ALTER POLICY %I ON public.%I RENAME TO %I', r.old, r.tbl, r.new);
  END LOOP;
END
$rename$;

-- ── Benannte NOT-NULL-Regeln ─────────────────────────────────────────────────
--
-- Ab Postgres 18 hat auch jedes NOT NULL einen Namen (<tabelle>_<spalte>_not_null),
-- und der zieht beim Umbenennen nicht mit. Die Bühne (PGlite) läuft schon so;
-- dort brachte der alte Name den Rundlauf durch EXPORT.md zum Scheitern.
-- Auf älteren Versionen findet die Schleife nichts.
DO $notnull$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname, rel.relname, att.attname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
    WHERE con.contype = 'n'
      AND rel.relnamespace = 'public'::regnamespace
      AND con.conname <> format('%s_%s_not_null', rel.relname, att.attname)
  LOOP
    EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',
                   c.relname, c.conname, format('%s_%s_not_null', c.relname, c.attname));
  END LOOP;
END
$notnull$;
