-- Erste Schritte: Aufgaben statt Diashow, Inhalte aus der Datenbank
--
-- Bisher war das Onboarding eine Reihe von Fenstern in der Bildschirmmitte,
-- deren Texte im Quelltext standen. Drei Dinge waren daran falsch:
--
--   Es half nicht. Wer elf Fenster wegklickt, hat elf Texte gelesen und danach
--   dieselbe unerklärte Oberfläche vor sich. Beim zweiten Anmelden ist nichts
--   mehr da.
--
--   Es war nicht pflegbar. Ein anderer Verein bekam unsere Formulierungen über
--   unsere Bereiche. Für ein Produkt, das andere aufsetzen, ist das schlicht
--   falscher Inhalt.
--
--   Es zeigte nie auf etwas. Ein Fenster in der Mitte, das von einem Knopf
--   erzählt, den man nicht sieht.
--
-- Diese Migration legt die Grundlage für alle drei: Schritte und Hilfetexte
-- als Zeilen, ein Anker je Schritt für die Hervorhebung, und eine Kennung für
-- Schritte, die eine echte Aufgabe sind – etwas, das jemand tut und das die
-- Anwendung selbst als erledigt erkennt.

-- ══ Die Schritte ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.onboarding_schritte (
  key        text PRIMARY KEY,
  gruppe     text NOT NULL DEFAULT 'mitmachen',
  -- Name aus lucide-react. Unbekannte Namen zeigen ein neutrales Zeichen,
  -- damit ein Tippfehler keinen leeren Kasten ergibt.
  icon       text NOT NULL DEFAULT 'Sparkles',
  titel      text NOT NULL,
  text       text NOT NULL,
  tipp       text,
  -- Wohin die Tour springt.
  route      text,
  -- Was hervorgehoben wird: das Element mit data-tour="<anker>".
  anker      text,
  -- Nur mit diesem Recht sichtbar. Leer = für alle.
  recht      text,
  -- Nur bei eingeschaltetem Modul. Leer = immer.
  modul      text,
  /*
   * Ist dieser Schritt eine echte Aufgabe?
   *
   * Leer heisst: nur lesen. Steht hier eine Kennung, prüft
   * onboarding_erledigt() selbst nach, ob die Sache getan ist – dann hakt sich
   * die Aufgabe ab, ohne dass jemand ein Kästchen anklickt. Genau das ist der
   * Unterschied zwischen einer Aufgabenliste und einer Diashow.
   */
  aufgabe    text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  -- Der Auslieferungszustand, damit „Zurücksetzen" möglich bleibt.
  standard   jsonb
);

COMMENT ON TABLE public.onboarding_schritte IS
  'Die Einfuehrung im Mitgliederbereich. Ein Schritt = eine Zeile.';

ALTER TABLE public.onboarding_schritte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_schritte_lesen ON public.onboarding_schritte;
CREATE POLICY onboarding_schritte_lesen ON public.onboarding_schritte
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS onboarding_schritte_pflegen ON public.onboarding_schritte;
CREATE POLICY onboarding_schritte_pflegen ON public.onboarding_schritte
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'system.settings'))
  WITH CHECK (public.has_permission(auth.uid(), 'system.settings'));

-- ══ Hilfe am Feld ═══════════════════════════════════════════════════════════
--
-- Zwei Sätze dort, wo die Frage entsteht. Das schlägt jede Erklärung vorab:
-- Wer den Zeltabstand eingibt, fragt sich in dem Moment, was gemeint ist – und
-- nicht drei Wochen vorher beim ersten Anmelden.

CREATE TABLE IF NOT EXISTS public.onboarding_hilfe (
  key      text PRIMARY KEY,
  titel    text,
  text     text NOT NULL,
  standard jsonb
);

COMMENT ON TABLE public.onboarding_hilfe IS
  'Kurze Erklaerungen neben schwierigen Feldern. Angezeigt ueber das Fragezeichen.';

ALTER TABLE public.onboarding_hilfe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_hilfe_lesen ON public.onboarding_hilfe;
CREATE POLICY onboarding_hilfe_lesen ON public.onboarding_hilfe
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS onboarding_hilfe_pflegen ON public.onboarding_hilfe;
CREATE POLICY onboarding_hilfe_pflegen ON public.onboarding_hilfe
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'system.settings'))
  WITH CHECK (public.has_permission(auth.uid(), 'system.settings'));

-- ══ Was schon erledigt ist ══════════════════════════════════════════════════

/*
 * Welche Aufgaben diese Person bereits erledigt hat.
 *
 * Hier steht die einzige Stelle, an der eine Aufgabe mit der Wirklichkeit
 * verbunden wird. Eine neue Aufgabe braucht deshalb zwei Dinge: eine Zeile in
 * onboarding_schritte mit `aufgabe` und einen Zweig hier. Mehr nicht – die
 * Anzeige rechnet nichts nach.
 *
 * Bewusst grosszuegig: „Profil ausgefuellt" verlangt Vor- und Nachnamen und
 * einen Wohnort, nicht jedes Feld. Eine Aufgabe, die sich nie abhaken laesst,
 * ist schlimmer als gar keine.
 */
CREATE OR REPLACE FUNCTION public.onboarding_erledigt()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(array_agg(k), ARRAY[]::text[]) FROM (
    SELECT 'profil' AS k WHERE EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE(p.first_name, '') <> ''
        AND COALESCE(p.last_name, '') <> ''
        AND COALESCE(p.city, '') <> ''
    )
    UNION ALL
    SELECT 'zelte' WHERE EXISTS (
      SELECT 1 FROM public.member_tents t WHERE t.user_id = auth.uid()
    )
    UNION ALL
    SELECT 'steckbrief' WHERE EXISTS (
      SELECT 1 FROM public.member_personas m WHERE m.user_id = auth.uid()
    )
    UNION ALL
    SELECT 'zusage' WHERE EXISTS (
      SELECT 1 FROM public.event_attendees a WHERE a.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_form_responses r WHERE r.user_id = auth.uid()
    )
    UNION ALL
    SELECT 'forum' WHERE EXISTS (
      SELECT 1 FROM public.forum_posts f WHERE f.created_by = auth.uid()
    )
    -- Ab hier die Einrichtung. Sie haengt nicht an der Person, sondern am
    -- Verein: Wer das Logo hochlaedt, erledigt es fuer alle.
    UNION ALL
    SELECT 'verein_benannt' WHERE EXISTS (
      SELECT 1 FROM public.app_settings s
      WHERE s.id AND s.org_name <> 'Mein Verein e. V.'
    )
    UNION ALL
    SELECT 'logo' WHERE EXISTS (
      SELECT 1 FROM public.app_settings s WHERE s.id AND COALESCE(s.logo_path, '') <> ''
    )
    UNION ALL
    SELECT 'bankverbindung' WHERE EXISTS (
      SELECT 1 FROM public.app_settings s WHERE s.id AND COALESCE(s.bank_iban, '') <> ''
    )
    UNION ALL
    SELECT 'seite' WHERE EXISTS (
      SELECT 1 FROM public.site_pages p WHERE p.is_published
    )
    UNION ALL
    SELECT 'mitglieder' WHERE (SELECT count(*) FROM public.profiles) > 1
  ) t;
$fn$;

REVOKE ALL ON FUNCTION public.onboarding_erledigt() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.onboarding_erledigt() TO authenticated;

-- ══ Die ausgelieferten Schritte ═════════════════════════════════════════════
--
-- Wortlaut aus der bisherigen Fassung, um Anker und Aufgaben ergaenzt. Nur
-- beim ersten Einspielen: Wer die Texte angepasst hat, behaelt sie.

INSERT INTO public.onboarding_schritte
  (key, gruppe, icon, titel, text, tipp, route, anker, recht, modul, aufgabe, sort_order)
SELECT * FROM (VALUES

  ('willkommen', 'start', 'Sparkles',
   'Willkommen im Mitgliederbereich',
   'Schön, dass du da bist. Diese kurze Einführung zeigt dir, was es hier gibt und was du am besten zuerst einrichtest. Du kannst sie jederzeit abbrechen und später neu starten.',
   NULL, '/intern', NULL, NULL, NULL, NULL, 10),

  ('profil', 'start', 'User',
   'Dein Profil ausfüllen',
   'Hinterlege deinen Namen und deinen Wohnort. Was dort steht, schlägt dir die Anwendung bei Anmeldungen schon vor, damit du es nicht jedes Mal wiederholen musst.',
   'Am Ende der Seite stellst du ein, ob du Benachrichtigungen bekommen möchtest.',
   '/intern/profil', 'profil-daten', NULL, NULL, 'profil', 20),

  ('veranstaltungen', 'mitmachen', 'CalendarDays',
   'Veranstaltungen',
   'Alle Vereinstermine an einer Stelle. Du kannst zusagen, wieder absagen und den Kalender abonnieren, damit die Termine auf deinem Handy stehen.',
   NULL, '/intern/veranstaltungen', 'kachel-events', NULL, 'events', NULL, 30),

  ('zusage', 'mitmachen', 'ClipboardList',
   'Bei einer Veranstaltung zusagen',
   'Klicke auf einen Termin, um die Einzelheiten zu sehen. Gibt es ein Anmeldeformular, füllst du es einmal aus und kannst deine Angaben später jederzeit ändern. Ohne Formular genügt ein Klick auf „Teilnehmen“.',
   'Was in deinem Profil steht, ist im Formular schon eingetragen.',
   '/intern/veranstaltungen', NULL, NULL, 'events', 'zusage', 40),

  ('zelte', 'mitmachen', 'Tent',
   'Deine Zelte eintragen',
   'Trage in deinem Profil ein, welche Zelte du mitbringst und wie gross sie sind. Daraus entsteht die Lagerplanung, und du musst die Masse nicht bei jeder Anmeldung neu heraussuchen.',
   NULL, '/intern/profil', 'profil-zelte', NULL, 'lagerlogistik', 'zelte', 50),

  ('steckbrief', 'mitmachen', 'ScrollText',
   'Deinen Darstellungssteckbrief anlegen',
   'Trage ein, was du darstellst und was du kannst. Daraus entsteht die öffentliche Übersicht, mit der Museen und Veranstalter sehen, was der Verein zeigen kann. Dein Name steht dort nicht.',
   NULL, '/intern/profil', 'profil-darstellung', NULL, 'personas', 'steckbrief', 60),

  ('forum', 'mitmachen', 'MessagesSquare',
   'Im Forum vorstellen',
   'Absprachen, Fragen und alles dazwischen. Ein kurzer Beitrag zur Vorstellung ist der einfachste Einstieg; Themen eröffnen und Umfragen starten kannst du auch.',
   NULL, '/intern/forum', 'kachel-forum', NULL, 'forum', 'forum', 70),

  ('versammlungen', 'mitmachen', 'Megaphone',
   'Versammlungen',
   'Ankündigungen, Einladungen zur Mitgliederversammlung und Protokolle. Auf Beiträge kannst du auch antworten.',
   NULL, '/intern/versammlungen', 'kachel-announcements', NULL, 'announcements', NULL, 80),

  ('abstimmungen', 'mitmachen', 'Vote',
   'Abstimmungen',
   'Wahlen und Beschlüsse laufen hier. Du bekommst eine Nachricht, sobald eine Abstimmung offen ist.',
   NULL, '/intern/abstimmungen', 'kachel-elections', NULL, 'elections', NULL, 90),

  ('dokumente', 'mitmachen', 'FileText',
   'Dokumente',
   'Satzung, Ordnungen und Berichte zum Nachlesen und Herunterladen.',
   NULL, '/intern/dokumente', 'kachel-documents', NULL, 'documents', NULL, 100),

  ('beitraege', 'mitmachen', 'Coins',
   'Beiträge',
   'Hier siehst du, ob dein Beitrag für dieses Jahr verbucht ist, und die Bankverbindung des Vereins.',
   NULL, '/intern/beitraege', NULL, NULL, 'contributions', NULL, 110),

  ('quellen', 'mitmachen', 'BookOpen',
   'Quellensammlung',
   'Die gemeinsame Bibliothek: Funde, Abbildungen und Literatur, nach Kategorie sortiert. Eigene Quellen kannst du selbst ergänzen.',
   NULL, '/intern/quellen', 'kachel-sources', NULL, 'sources', NULL, 120),

  ('karte', 'mitmachen', 'MapPin',
   'Mitgliederkarte',
   'Zeigt, wo die anderen wohnen. Nützlich, um Fahrgemeinschaften zu finden.',
   'Du erscheinst dort nur, wenn du es in deinem Profil erlaubst.',
   '/intern/karte', 'kachel-member_map', NULL, 'member_map', NULL, 130),

  -- ── Verwalten ─────────────────────────────────────────────────────────────

  ('verwaltung', 'verwalten', 'Settings',
   'Die Verwaltung',
   'Du hast mehr Rechte als die meisten. Alles dafür liegt hier, nach Bereichen sortiert. Was du nicht siehst, brauchst du auch nicht.',
   NULL, '/intern/verwaltung', 'knopf-verwaltung', 'admin.access', NULL, NULL, 200),

  ('mitglieder', 'verwalten', 'Users',
   'Die ersten Mitglieder einladen',
   'Das Register aller Mitglieder. Hier lädst du neue Leute ein, pflegst Stammdaten und setzt ein Mitglied auf inaktiv, wenn es austritt.',
   NULL, '/intern/verwaltung', 'kachel-members', 'members.manage', NULL, 'mitglieder', 210),

  ('antraege', 'verwalten', 'UserPlus',
   'Aufnahmeanträge',
   'Neue Anträge liegen hier zur Prüfung. Du siehst alle Angaben, kannst den Antrag als PDF öffnen und ihn annehmen oder ablehnen. Bei Annahme geht die Einladung automatisch raus.',
   NULL, '/intern/verwaltung', 'kachel-applications', 'members.manage', 'applications', NULL, 220),

  ('kontaktanfragen', 'verwalten', 'Mail',
   'Kontaktanfragen',
   'Was über das Kontaktformular hereinkommt, steht hier. Antworten kannst du direkt aus der Anwendung, die Mail geht dann im Namen des Vereins raus.',
   NULL, '/intern/verwaltung', 'kachel-messages', 'admin.access', 'contact', NULL, 230),

  ('seiten', 'verwalten', 'FileText',
   'Die öffentlichen Seiten',
   'Die Website stellst du aus Bausteinen zusammen: Text, Bilder, Kästen, Galerien. Was du siehst, ist auch das, was später dasteht.',
   'Änderungen sind erst öffentlich, wenn du sie veröffentlichst. Bis dahin kannst du in Ruhe probieren.',
   '/intern/verwaltung', 'kachel-sitepages', 'site.content_edit', NULL, 'seite', 240),

  ('galerie', 'verwalten', 'Image',
   'Galerie',
   'Bilder hochladen, kurz beschreiben und einer Kategorie zuordnen. Die Beschreibung ist wichtig: Sie wird vorgelesen, wenn jemand die Seite nicht sehen kann.',
   NULL, '/intern/verwaltung', 'kachel-gallery', 'gallery.manage', 'gallery', NULL, 250),

  ('darstellungen_freigeben', 'verwalten', 'ScrollText',
   'Darstellungen freigeben',
   'Die Steckbriefe der Mitglieder werden nicht von selbst öffentlich. Du gibst frei, was auf der Website erscheint. Namen stehen dort nie, nur die Darstellung.',
   NULL, '/intern/verwaltung', 'kachel-personas', 'personas.publish', 'personas', NULL, 260),

  ('beitraege_verwalten', 'verwalten', 'Coins',
   'Beiträge verwalten',
   'Für alle Mitglieder siehst du den Stand, buchst Zahlungen und erfasst Teilzahlungen. Die Beitragssätze und die Beitragsstufen pflegst du auf derselben Seite.',
   NULL, '/intern/beitraege', NULL, 'contributions.manage', 'contributions', NULL, 270),

  ('rollen', 'verwalten', 'Shield',
   'Rollen und Rechte',
   'Welche Rolle was darf, und wer welche Rolle hat. Geh damit sparsam um: Wer Rechte vergeben darf, kann sie auch sich selbst geben.',
   NULL, '/intern/verwaltung', 'kachel-permissions', 'roles.manage', NULL, NULL, 280),

  -- ── Einrichten ────────────────────────────────────────────────────────────

  ('module', 'einrichten', 'PackageOpen',
   'Module auswählen',
   'Was diese Installation überhaupt anbietet. Was der Verein nicht braucht, schaltest du ab: Der Bereich verschwindet samt Menüpunkt und Kachel. Die Daten bleiben und kommen beim Wiedereinschalten zurück.',
   'Fang hiermit an. Alles Weitere richtet sich danach, was eingeschaltet ist.',
   '/intern/verwaltung', 'kachel-module', 'system.modules', NULL, NULL, 300),

  ('verein_benannt', 'einrichten', 'Palette',
   'Den Verein benennen',
   'Name, Anschrift, Farben und Schriften. Diese Angaben stehen anschliessend überall: auf der Website, im Impressum, in jeder Mail und auf dem Aufnahmeantrag.',
   NULL, '/intern/verwaltung', 'kachel-erscheinungsbild', 'system.settings', NULL, 'verein_benannt', 310),

  ('logo', 'einrichten', 'ImagePlus',
   'Logo hochladen',
   'Das Logo steht in der Kopfzeile, in den Mails und auf dem Aufnahmeantrag. PNG oder JPEG, damit es auch im PDF landet.',
   NULL, '/intern/verwaltung', 'kachel-erscheinungsbild', 'system.settings', NULL, 'logo', 320),

  ('bankverbindung', 'einrichten', 'Banknote',
   'Bankverbindung hinterlegen',
   'Ohne Kontonummer erscheint die Karte im Beitragsbereich gar nicht. Eine falsche Nummer, auf die jemand überweist, wäre schlimmer als keine.',
   NULL, '/intern/verwaltung', 'kachel-erscheinungsbild', 'system.settings', 'contributions', 'bankverbindung', 330),

  ('vorlagen', 'einrichten', 'MailPlus',
   'Texte und Formulare prüfen',
   'Die Texte der versendeten Mails, die Felder des Aufnahmeantrags und die Angaben im Mitgliederprofil lassen sich anpassen. Zu jeder Vorlage gibt es einen Knopf zurück auf den Auslieferungszustand.',
   'Unter Erscheinungsbild gibt es einen Probeversand, mit dem du den Mailweg prüfen kannst.',
   '/intern/verwaltung', 'kachel-vorlagen', 'system.settings', NULL, NULL, 340)

) AS v(key, gruppe, icon, titel, text, tipp, route, anker, recht, modul, aufgabe, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.onboarding_schritte);

-- Auslieferungszustand festhalten, damit „Zurücksetzen" etwas hat, worauf es
-- zurücksetzen kann.
UPDATE public.onboarding_schritte
SET standard = jsonb_build_object('titel', titel, 'text', text, 'tipp', tipp)
WHERE standard IS NULL;

-- ══ Die ausgelieferten Hilfetexte ═══════════════════════════════════════════

INSERT INTO public.onboarding_hilfe (key, titel, text)
SELECT * FROM (VALUES

  ('zeltmasse', 'Wozu die Masse?',
   'Aus den Massen entsteht der Lagerplan: Wer wie viel Platz braucht und was nebeneinander passt. Miss die Grundfläche inklusive der Abspannung, nicht nur das Tuch.'),

  ('beitragsintervall', 'Beitragseinzug',
   'Wie oft du zahlen möchtest. Der Jahresbetrag bleibt derselbe, er wird nur auf mehr Termine verteilt. Wenn du unsicher bist: jährlich.'),

  ('mitgliedsart', 'Art der Mitgliedschaft',
   'Bestimmt, welcher Beitragssatz für dich gilt. Ändern kann sie nur der Vorstand, weil daran die Beiträge hängen.'),

  ('karte_sichtbar', 'Auf der Karte erscheinen',
   'Nur andere Mitglieder sehen die Karte, nie die Öffentlichkeit. Angezeigt wird dein Ort, nicht deine Anschrift. Du kannst das jederzeit wieder abschalten.'),

  ('darstellung', 'Darstellungssteckbrief',
   'Was du zeigst, wenn der Verein auftritt: Zeit, Rolle und was du dazu kannst. Der Vorstand gibt frei, was davon öffentlich wird; dein Name steht dort nie.'),

  ('stimmenanzahl', 'Wie viele Stimmen?',
   'Wie viele der Vorschläge jemand ankreuzen darf. Bei einer Wahl mit drei zu besetzenden Plätzen sind das drei. Weniger ankreuzen ist immer erlaubt.'),

  ('ernaehrung', 'Ernährung',
   'Wird bei Anmeldungen automatisch vorgeschlagen, damit die Küche planen kann. Allergien bitte dazuschreiben, auch wenn sie selten auftreten.')

) AS v(key, titel, text)
WHERE NOT EXISTS (SELECT 1 FROM public.onboarding_hilfe);

UPDATE public.onboarding_hilfe
SET standard = jsonb_build_object('titel', titel, 'text', text)
WHERE standard IS NULL;

-- ══ Alte Merkzettel aufräumen ═══════════════════════════════════════════════
--
-- Die Schlüssel der Zwischenfassung („anmelden", „quellen_pflege" …) gibt es
-- nicht mehr. Zeilen dazu wären nur noch Rätsel in der Tabelle.

DELETE FROM public.user_tours
WHERE tour_key NOT IN (SELECT key FROM public.onboarding_schritte)
  AND tour_key NOT LIKE 'aufgabe:%';

COMMENT ON COLUMN public.user_tours.tour_key IS
  'Schluessel eines Schrittes aus onboarding_schritte. Vorhanden = gesehen. Mit Praefix "aufgabe:" = Aufgabe ausgeblendet.';
