-- Mailvorlagen und die Texte des Aufnahmeantrags
--
-- Beides stand fest im Code der Edge Functions: Vereinsname, Anschrift, Farben,
-- der Verweis auf unsere WhatsApp-Gruppe, die Satzungserklaerung im PDF. Ein
-- anderer Verein haette Einladungen mit unserem Namen verschickt und einen
-- Aufnahmeantrag gedruckt, der auf unsere Satzung verweist.
--
-- Bewusst KEIN Feld mit rohem HTML: Die Vorlagen sind in Felder zerlegt
-- (Betreff, Kennzeile, Ueberschrift, Text, Knopf, Fussnote). Die Gestaltung
-- macht weiterhin der Code – der Siteadmin schreibt Text, keine Formatierung.
-- Ein HTML-Feld haette bedeutet: Wer die Einladung umformulieren will, muss
-- Inline-Styles fuer Outlook pflegen.
--
-- `standard` haelt den Auslieferungszustand fest, damit sich jede Vorlage im
-- Verwaltungsbereich zurueckstellen laesst. Ohne das traut sich niemand,
-- etwas auszuprobieren.

-- ══ 1. Mailvorlagen ═════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mail_templates (
  key          text PRIMARY KEY,
  label        text NOT NULL,
  hinweis      text,
  betreff      text NOT NULL DEFAULT '',
  -- Die kleine Zeile ueber der Ueberschrift („Einladung", „Sicherheit").
  kennzeile    text NOT NULL DEFAULT '',
  ueberschrift text NOT NULL DEFAULT '',
  -- Einfaches HTML: Absaetze, fett, kursiv, Listen, Links. Mehr braucht eine
  -- Vereinsmail nicht, und mehr uebersteht auch kein Mailprogramm zuverlaessig.
  inhalt       text NOT NULL DEFAULT '',
  -- Beschriftung des Knopfes; leer = kein Knopf. Wohin er fuehrt, weiss nur
  -- der Code (ein Einladungslink ist nichts, was man eintippen kann).
  knopf        text NOT NULL DEFAULT '',
  fussnote     text NOT NULL DEFAULT '',
  platzhalter  text[] NOT NULL DEFAULT '{}',
  standard     jsonb NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid
);

COMMENT ON TABLE public.mail_templates IS
  'Texte der versendeten E-Mails. Die Gestaltung macht der Code.';

-- ══ 2. Texte des Aufnahmeantrags ════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pdf_texts (
  key         text PRIMARY KEY,
  label       text NOT NULL,
  hinweis     text,
  -- Ueberschrift des Abschnitts im PDF. Leer = kein eigener Abschnitt.
  titel       text NOT NULL DEFAULT '',
  inhalt      text NOT NULL DEFAULT '',
  platzhalter text[] NOT NULL DEFAULT '{}',
  standard    jsonb NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);

COMMENT ON TABLE public.pdf_texts IS
  'Textbausteine des Aufnahmeantrags. Anschrift und Vorstand kommen aus app_settings.';

-- ══ 3. Rechte ═══════════════════════════════════════════════════════════════
--
-- Lesen und Aendern nur mit system.settings – dasselbe Recht wie fuer das
-- Erscheinungsbild. Anlegen und Loeschen gar nicht: Welche Vorlagen es gibt,
-- bestimmt der Code. Eine geloeschte Vorlage waere eine Mail, die nicht mehr
-- verschickt werden kann.

ALTER TABLE public.mail_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_texts      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mail_templates_lesen ON public.mail_templates;
CREATE POLICY mail_templates_lesen ON public.mail_templates
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'system.settings'));

DROP POLICY IF EXISTS mail_templates_aendern ON public.mail_templates;
CREATE POLICY mail_templates_aendern ON public.mail_templates
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'system.settings'))
  WITH CHECK (public.has_permission(auth.uid(), 'system.settings'));

DROP POLICY IF EXISTS pdf_texts_lesen ON public.pdf_texts;
CREATE POLICY pdf_texts_lesen ON public.pdf_texts
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'system.settings'));

DROP POLICY IF EXISTS pdf_texts_aendern ON public.pdf_texts;
CREATE POLICY pdf_texts_aendern ON public.pdf_texts
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'system.settings'))
  WITH CHECK (public.has_permission(auth.uid(), 'system.settings'));

CREATE OR REPLACE FUNCTION public.vorlagen_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mail_templates_touch_trg ON public.mail_templates;
CREATE TRIGGER mail_templates_touch_trg
BEFORE UPDATE ON public.mail_templates
FOR EACH ROW EXECUTE FUNCTION public.vorlagen_touch();

DROP TRIGGER IF EXISTS pdf_texts_touch_trg ON public.pdf_texts;
CREATE TRIGGER pdf_texts_touch_trg
BEFORE UPDATE ON public.pdf_texts
FOR EACH ROW EXECUTE FUNCTION public.vorlagen_touch();

-- ══ 4. Auslieferungszustand ═════════════════════════════════════════════════
--
-- Das sind die Texte, die bisher im Code standen – Wort fuer Wort, damit sich
-- am Verhalten zunaechst nichts aendert. Der Vereinsname ist zu {{verein}}
-- geworden; er kommt jetzt aus den Vereinsangaben.

INSERT INTO public.mail_templates (key, label, hinweis, betreff, kennzeile, ueberschrift, inhalt, knopf, fussnote, platzhalter, sort_order, standard)
SELECT key, label, hinweis, betreff, kennzeile, ueberschrift, inhalt, knopf, fussnote, platzhalter, sort_order,
       jsonb_build_object('betreff', betreff, 'kennzeile', kennzeile, 'ueberschrift', ueberschrift,
                          'inhalt', inhalt, 'knopf', knopf, 'fussnote', fussnote)
FROM (VALUES

  ('einladung',
   'Einladung in den Mitgliederbereich',
   'Geht an ein neues Mitglied, sobald es angelegt wird. Enthaelt den Link zum Aktivieren des Kontos.',
   'Einladung – {{verein}}',
   'Einladung',
   'Willkommen im Mitgliederbereich',
   '<p>Du wurdest als <strong>{{rolle}}</strong> zum internen Bereich von {{verein}} eingeladen.</p>' ||
   '<p>Klicke auf den folgenden Knopf, um dein Konto zu aktivieren und ein Passwort zu setzen:</p>',
   'Konto aktivieren',
   '',
   ARRAY['verein', 'rolle'],
   10),

  ('willkommen',
   'Willkommen im Verein',
   'Die Aufnahmebestaetigung. Geht an das neue Mitglied, in Kopie an die Vereinsadresse.',
   'Herzlich willkommen bei {{verein}}!',
   'Aufnahmebestätigung',
   'Herzlich willkommen!',
   '<p>Hallo {{vorname}},</p>' ||
   '<p>wir freuen uns sehr, dich als neues Mitglied in unserem Verein <strong>{{verein}}</strong> willkommen zu heißen!</p>' ||
   '<p>Mit deiner Anmeldung bist du nun Teil unserer lebendigen Gemeinschaft, die sich mit viel Herzblut der Darstellung und Vermittlung historischer Lebenswelten widmet. Wir sind gespannt auf deine Ideen, dein Engagement und die gemeinsamen Erlebnisse, die vor uns liegen.</p>' ||
   '<p>Alle wichtigen Infos rund um den Verein, Termine und Mitmachmöglichkeiten findest du auf unserer Website <a href="{{webseite}}">{{webseite}}</a> und in unserer WhatsApp-Gruppe, der wir dich in Kürze hinzufügen.</p>' ||
   '<p>Wenn du Fragen hast oder etwas unklar ist, melde dich jederzeit gern bei uns. Schön, dass du dabei bist – auf eine spannende Zeit mit dir!</p>',
   '',
   '',
   ARRAY['verein', 'vorname', 'webseite'],
   20),

  ('passwort_vergessen',
   'Passwort vergessen',
   'Wird verschickt, wenn jemand auf der Anmeldeseite ein neues Passwort anfordert.',
   'Passwort zurücksetzen – {{verein}}',
   'Sicherheit',
   'Passwort zurücksetzen',
   '<p>Du hast angefordert, dein Passwort für den Mitgliederbereich von {{verein}} zurückzusetzen.</p>' ||
   '<p>Klicke auf den folgenden Knopf, um ein neues Passwort zu setzen:</p>',
   'Neues Passwort setzen',
   'Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.',
   ARRAY['verein'],
   30),

  ('passwort_zurueckgesetzt',
   'Passwort durch die Verwaltung zurückgesetzt',
   'Wird verschickt, wenn ein Verwalter das Passwort eines Mitglieds zuruecksetzt.',
   'Passwort zurücksetzen – {{verein}}',
   'Sicherheit',
   'Passwort zurücksetzen',
   '<p>Dein Passwort für den Mitgliederbereich von {{verein}} wurde zurückgesetzt.</p>' ||
   '<p>Klicke auf den folgenden Knopf, um ein neues Passwort zu setzen:</p>',
   'Neues Passwort setzen',
   '',
   ARRAY['verein'],
   40),

  ('veranstaltung_anmeldung',
   'Anmeldung zu einer Veranstaltung',
   'Bestaetigung an Gaeste, die sich ueber ein Veranstaltungsformular angemeldet haben.',
   'Anmeldung bestätigt: {{veranstaltung}}',
   'Anmeldebestätigung',
   '{{veranstaltung}}',
   '<p>Hallo {{name}},</p>' ||
   '<p>deine Anmeldung für <strong>{{veranstaltung}}</strong> ist bei uns eingegangen. Vielen Dank!</p>' ||
   '{{block}}',
   '',
   'Bei Fragen kannst du dich jederzeit an {{vereinsmail}} wenden.',
   ARRAY['name', 'veranstaltung', 'vereinsmail', 'block'],
   50),

  ('kontakt_eingang',
   'Neue Kontaktanfrage (an den Verein)',
   'Meldung an die Vereinsadresse, wenn jemand das Kontaktformular ausfuellt.',
   'Neue Kontaktanfrage von {{name}}',
   'Neue Kontaktanfrage',
   '{{name}}',
   '{{block}}',
   '',
   '',
   ARRAY['name', 'block'],
   60),

  ('kontakt_antwort',
   'Antwort auf eine Kontaktanfrage',
   'Der Rahmen um eine Antwort, die im Verwaltungsbereich geschrieben wird.',
   'Ihre Anfrage – {{verein}}',
   '',
   '',
   '<p>Guten Tag {{name}},</p>{{block}}',
   '',
   '',
   ARRAY['verein', 'name', 'block'],
   70),

  ('zusammenfassung',
   'Tägliche Zusammenfassung',
   'Die Abendmail mit allem, was seit dem letzten Besuch neu ist.',
   '{{neuigkeiten}} für dich',
   'Neu für dich',
   '',
   '<p>Hallo {{name}}, seit deinem letzten Besuch gibt es Neues:</p>{{block}}',
   'Im Forum ansehen',
   'Diese Zusammenfassung lässt sich in deinem Profil abstellen.',
   ARRAY['name', 'neuigkeiten', 'anzahl', 'block'],
   80),

  ('probeversand',
   'Probeversand',
   'Die Testmail aus den Einstellungen. Aendern lohnt sich selten.',
   'Probeversand',
   'Einstellungen',
   'Der Probeversand hat geklappt',
   '<p>Diese Nachricht wurde über <strong>{{versandweg}}</strong> verschickt. Damit funktionieren Einladungen, das Zurücksetzen von Passwörtern, Kontaktanfragen und die Abendzusammenfassung.</p>',
   '',
   'Angefordert am {{zeitpunkt}}.',
   ARRAY['versandweg', 'zeitpunkt'],
   90)

) AS v(key, label, hinweis, betreff, kennzeile, ueberschrift, inhalt, knopf, fussnote, platzhalter, sort_order)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.pdf_texts (key, label, hinweis, titel, inhalt, platzhalter, sort_order, standard)
SELECT key, label, hinweis, titel, inhalt, platzhalter, sort_order,
       jsonb_build_object('titel', titel, 'inhalt', inhalt)
FROM (VALUES

  ('titel',
   'Überschrift des Antrags',
   'Steht oben auf dem Blatt.',
   '',
   'Antrag auf Mitgliedschaft',
   ARRAY[]::text[],
   10),

  ('erklaerung',
   'Erklärung',
   'Der eingerahmte Kasten. Jeder Absatz beginnt auf einer neuen Zeile; der erste steht fett.',
   'ERKLÄRUNG',
   'Ja, ich will Mitglied bei {{verein}} werden und beantrage hiermit meine Aufnahme!' || E'\n' ||
   'Mit dem Antrag auf Mitgliedschaft erkenne ich die Satzung des Vereins {{verein}} an. Mir ist bekannt, dass die Mitgliedschaft beitragspflichtig ist.' || E'\n' ||
   'Derzeit beträgt der jährliche Beitragssatz {{beitrag}} EUR. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig.',
   ARRAY['verein', 'beitrag'],
   20),

  ('datenschutz',
   'Datenschutzhinweis',
   'Der Absatz unter der Erklärung. Sollte zur Datenschutzerklärung der Website passen.',
   'DATENSCHUTZ',
   'Der Schutz Deiner personenbezogenen Daten ist {{verein}} ein besonderes Anliegen. Wir verwenden die in diesem Aufnahmeantrag enthaltenen Angaben ausschließlich zur Erledigung aller im Zusammenhang mit der Mitgliedschaft stehenden Aufgaben im erforderlichen Umfang. Dies betrifft insbesondere die computergestützte Mitgliederbestandsverwaltung, die Mitgliederinformation sowie ggf. den Beitragseinzug. Deine Daten werden nicht an externe Dritte weitergegeben.',
   ARRAY['verein'],
   30),

  ('zustimmungen',
   'Beschriftung der Ankreuzfelder',
   'Zwei Zeilen: erst die Satzung, dann die Datenverarbeitung.',
   '',
   'Satzung anerkannt' || E'\n' || 'Datenverarbeitung gemäß Datenschutzerklärung zugestimmt',
   ARRAY[]::text[],
   40),

  ('fussnote',
   'Kasten unten rechts',
   'Zwei Zeilen neben dem Eingangsdatum.',
   '',
   'Digitale Antragstellung via {{webseite}}' || E'\n' || 'Eintrittsdatum = Datum dieses digitalen Antrags',
   ARRAY['webseite'],
   50)

) AS v(key, label, hinweis, titel, inhalt, platzhalter, sort_order)
ON CONFLICT (key) DO NOTHING;
