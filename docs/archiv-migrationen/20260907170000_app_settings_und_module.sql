-- Konfigurationsebene: Vereinsdaten und Modulschalter
--
-- Bisher stecken Vereinsname, Anschrift, Absenderadresse, Farben und der
-- Funktionsumfang fest im Code – verteilt über ms-email.ts, invite-member,
-- SEO.tsx, Layout.tsx und index.html. Diese Migration legt die Datenbasis an,
-- damit die Werte künftig aus der Datenbank kommen.
--
-- Bewusst einmandantig: Es gibt genau eine Zeile in app_settings. Jeder Verein
-- bekommt eine eigene Installation, deshalb keine org_id in jeder Tabelle.
--
-- Geheimnisse gehören NICHT hierher. SMTP-Passwort, Microsoft-Graph-Zugang und
-- Ähnliches bleiben Edge-Function-Secrets – app_settings ist für jedes
-- angemeldete Mitglied lesbar.

-- ══ 1. Vereinsdaten ═════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_settings (
  -- Single-Row-Tabelle: Der Primärschlüssel kann nur true sein, damit es
  -- niemals eine zweite Konfigurationszeile geben kann.
  id                 boolean PRIMARY KEY DEFAULT true CHECK (id),

  -- Identität
  org_name           text NOT NULL DEFAULT 'Mein Verein e. V.',
  org_short_name     text NOT NULL DEFAULT 'Mein Verein',
  org_tagline        text,
  org_street         text,
  org_zip            text,
  org_city           text,
  org_country        text NOT NULL DEFAULT 'Deutschland',
  org_email          text,
  org_phone          text,
  website_url        text,

  -- Erscheinungsbild
  logo_path          text,          -- Pfad im Storage-Bucket, nicht die Datei selbst
  color_primary      text NOT NULL DEFAULT '#dd9933',
  color_dark         text NOT NULL DEFAULT '#1c1917',

  -- E-Mail-Versand (Zugangsdaten bleiben in den Edge-Function-Secrets)
  mail_from_address  text,
  mail_from_name     text,
  mail_reply_to      text,
  mail_transport     text NOT NULL DEFAULT 'microsoft_graph'
                     CHECK (mail_transport IN ('microsoft_graph', 'smtp')),

  -- Kalender
  calendar_timezone  text NOT NULL DEFAULT 'Europe/Berlin',

  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid
);

COMMENT ON TABLE public.app_settings IS
  'Genau eine Zeile. Vereinsdaten und Erscheinungsbild der Installation. Keine Geheimnisse.';

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Jedes Mitglied darf die Vereinsdaten sehen (Anschrift, Absender, Farben).
DROP POLICY IF EXISTS "Mitglieder lesen Vereinsdaten" ON public.app_settings;
CREATE POLICY "Mitglieder lesen Vereinsdaten"
  ON public.app_settings FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));

-- Ändern darf nur, wer das Systemrecht hat.
DROP POLICY IF EXISTS "Systemverwaltung aendert Vereinsdaten" ON public.app_settings;
CREATE POLICY "Systemverwaltung aendert Vereinsdaten"
  ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'system.settings'))
  WITH CHECK (public.has_permission(auth.uid(), 'system.settings'));

-- Kein INSERT und kein DELETE: Die eine Zeile wird hier angelegt und bleibt.

DROP TRIGGER IF EXISTS app_settings_touch ON public.app_settings;
CREATE TRIGGER app_settings_touch
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Bestandswerte übernehmen, damit sich am Verhalten nichts ändert.
INSERT INTO public.app_settings (
  id, org_name, org_short_name, org_tagline,
  org_street, org_zip, org_city, org_email, website_url,
  mail_from_address, mail_from_name, calendar_timezone
) VALUES (
  true,
  'Diu lebendec Histôrje e. V.',
  'Diu lebendec Histôrje',
  'Living History & Lebendige Geschichtsvermittlung',
  'Am Schloßpark 17', '65203', 'Wiesbaden',
  'vorstand@dilehi.de', 'https://www.dilehi.de',
  'vorstand@dilehi.de', 'Diu lebendec Histôrje e. V.',
  'Europe/Berlin'
) ON CONFLICT (id) DO NOTHING;

-- ══ 2. Module ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_modules (
  key          text PRIMARY KEY,
  label        text NOT NULL,
  description  text,
  enabled      boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  -- Module, die andere voraussetzen (z. B. Auswertungen brauchen Veranstaltungen).
  requires     text REFERENCES public.app_modules(key) ON DELETE SET NULL
);

COMMENT ON TABLE public.app_modules IS
  'Welche Funktionsbereiche diese Installation nutzt. Abschalten blendet aus, loescht keine Daten.';

ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;

-- Auch Gäste müssen den Modulstatus kennen: Kontaktformular und Aufnahmeantrag
-- liegen auf öffentlichen Seiten. Welche Module aktiv sind, ist nicht geheim.
DROP POLICY IF EXISTS "Modulstatus ist oeffentlich lesbar" ON public.app_modules;
CREATE POLICY "Modulstatus ist oeffentlich lesbar"
  ON public.app_modules FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Systemverwaltung schaltet Module" ON public.app_modules;
CREATE POLICY "Systemverwaltung schaltet Module"
  ON public.app_modules FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'system.modules'))
  WITH CHECK (public.has_permission(auth.uid(), 'system.modules'));

INSERT INTO public.app_modules (key, label, description, enabled, sort_order, requires) VALUES
  ('events',       'Veranstaltungen',   'Terminkalender, Zu- und Absagen, Kalender-Abo',            true,  10, NULL),
  ('event_forms',  'Anmeldeformulare',  'Formulare und Auswertungen zu Veranstaltungen',            true,  20, 'events'),
  ('announcements','Pinnwand',          'Ankündigungen, Einladungen und Protokolle',                true,  30, NULL),
  ('elections',    'Abstimmungen',      'Wahlen und Beschlüsse der Mitgliederversammlung',          true,  40, NULL),
  ('documents',    'Dokumente',         'Satzung, Ordnungen und Berichte zum Download',             true,  50, NULL),
  ('contributions','Beiträge',          'Mitgliedsbeiträge und Zahlungsstatus',                     true,  60, NULL),
  ('sources',      'Quellensammlung',   'Gemeinsame Recherche-Bibliothek',                          true,  70, NULL),
  ('personas',     'Steckbriefe',       'Darstellungen und Kenntnisse der Mitglieder',              true,  80, NULL),
  ('member_map',   'Mitgliederkarte',   'Wohnorte der Mitglieder auf einer Karte',                  true,  90, NULL),
  ('gallery',      'Galerie',           'Bildergalerien für die öffentliche Website',               true, 100, NULL),
  ('contact',      'Kontaktformular',   'Kontaktanfragen über die öffentliche Website',             true, 110, NULL),
  ('applications', 'Aufnahmeanträge',   'Online-Aufnahmeantrag mit PDF und Prüfung',                true, 120, NULL),
  ('forum',        'Forum',             'Diskussionen, Absprachen und Umfragen zu Veranstaltungen', false,  5, NULL)
ON CONFLICT (key) DO NOTHING;

-- ══ 3. Systemrechte ═════════════════════════════════════════════════════════
--
-- Getrennt von den Vereinsrechten: Wer den Server betreut, soll die Installation
-- konfigurieren können, ohne dadurch Mitgliederdaten, SEPA-Mandate oder
-- Abstimmungen zu sehen. system.* impliziert deshalb weder members.manage noch
-- profiles.view_all. Eine eigene Rolle "Technische Verwaltung" kommt separat.

INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES
  ('system.settings',     'Vereinsdaten & Erscheinungsbild', 'system', 900),
  ('system.modules',      'Module an- und abschalten',       'system', 910),
  ('system.email',        'E-Mail-Versand & Vorlagen',       'system', 920),
  ('system.integrations', 'Einbindungen & Schnittstellen',   'system', 930),
  ('system.maintenance',  'Wartung, Export & Protokolle',    'system', 940)
ON CONFLICT (key) DO NOTHING;

-- Vorerst beim geschäftsführenden Vorstand, damit die Installation bedienbar
-- bleibt. Umhängen auf eine eigene technische Rolle passiert in der Oberfläche.
INSERT INTO public.role_permissions (role, permission, granted)
SELECT r.role, p.permission, true
FROM (VALUES ('officiatus_1'::public.app_role), ('officiatus_2'::public.app_role)) AS r(role)
CROSS JOIN (VALUES
  ('system.settings'), ('system.modules'), ('system.email'),
  ('system.integrations'), ('system.maintenance')
) AS p(permission)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role = r.role AND rp.permission = p.permission
);

-- ══ 4. Hilfsfunktionen ══════════════════════════════════════════════════════

-- Für RLS-Policies: Ein abgeschaltetes Modul soll seine Daten auch über die API
-- nicht mehr herausgeben, nicht nur die Menüpunkte ausblenden.
CREATE OR REPLACE FUNCTION public.module_enabled(_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT enabled FROM public.app_modules WHERE key = _key), true)
$$;

COMMENT ON FUNCTION public.module_enabled(text) IS
  'Ist ein Modul aktiv? Unbekannte Schluessel gelten als aktiv, damit eine fehlende Zeile nichts sperrt.';

-- Was ein Gast von der Konfiguration sehen darf: Name, Logo, Farben.
-- Anschrift und Absenderadresse bleiben angemeldeten Mitgliedern vorbehalten.
CREATE OR REPLACE FUNCTION public.get_public_settings()
RETURNS TABLE (
  org_name text, org_short_name text, org_tagline text,
  website_url text, logo_path text, color_primary text, color_dark text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.org_name, s.org_short_name, s.org_tagline,
         s.website_url, s.logo_path, s.color_primary, s.color_dark
  FROM public.app_settings s
  WHERE s.id
$$;

REVOKE ALL ON FUNCTION public.module_enabled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.module_enabled(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_public_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_settings() TO anon, authenticated;
