-- Korrektur der Vorlagen
--
-- Beim Herausloesen der Texte aus dem Code habe ich sie stellenweise
-- umformuliert statt sie zu uebernehmen:
--
--   * „Klicke auf den folgenden Knopf" statt „Button" (drei Vorlagen)
--   * In der Zusammenfassung fiel die Anzahl weg: „gibt es Neues" statt
--     „gibt es eine Neuigkeit" bzw. „gibt es 3 Neuigkeiten"
--   * „Guten Tag {{name}}," ergab „Guten Tag ," ohne Namen – im Original war
--     der Name samt Leerzeichen davor optional
--   * Der Verweis auf die Website zeigte die Adresse samt „https://"
--
-- Ausserdem standen die Beschreibungen in der Verwaltung in ae/oe/ue statt in
-- Umlauten – neben den Texten selbst, die richtig gesetzt sind, sah das aus
-- wie ein Fehler. Es war einer.
--
-- Geaendert wird nur, was noch im Auslieferungszustand steht: Wer eine Vorlage
-- inzwischen angepasst hat, behaelt seine Fassung. Der hinterlegte
-- Auslieferungszustand wird in jedem Fall berichtigt – sonst stellt der Knopf
-- „Auslieferungszustand" auf meine Umformulierung zurueck.

WITH neu(key, label, hinweis, betreff, kennzeile, ueberschrift, inhalt, knopf, fussnote, platzhalter) AS (VALUES

  ('einladung',
   'Einladung in den Mitgliederbereich',
   'Geht an ein neues Mitglied, sobald es angelegt wird, und enthält den Link zum Aktivieren des Kontos.',
   'Einladung – {{verein}}',
   'Einladung',
   'Willkommen im Mitgliederbereich',
   '<p>Du wurdest als <strong>{{rolle}}</strong> zum internen Bereich von {{verein}} eingeladen.</p>' ||
   '<p>Klicke auf den folgenden Button, um dein Konto zu aktivieren und ein Passwort zu setzen:</p>',
   'Konto aktivieren',
   '',
   ARRAY['verein', 'rolle']),

  ('willkommen',
   'Willkommen im Verein',
   'Die Aufnahmebestätigung an das neue Mitglied, in Kopie an die Vereinsadresse. Darunter steht der Name des ersten Vorstandsmitglieds, das im System hinterlegt ist.',
   'Herzlich willkommen bei {{verein}}!',
   'Aufnahmebestätigung',
   'Herzlich willkommen!',
   '<p>Hallo {{vorname}},</p>' ||
   '<p>wir freuen uns sehr, dich als neues Mitglied in unserem Verein <strong>{{verein}}</strong> willkommen zu heißen!</p>' ||
   '<p>Mit deiner Anmeldung bist du nun Teil unserer lebendigen Gemeinschaft, die sich mit viel Herzblut der Darstellung und Vermittlung historischer Lebenswelten widmet. Wir sind gespannt auf deine Ideen, dein Engagement und die gemeinsamen Erlebnisse, die vor uns liegen.</p>' ||
   '<p>Alle wichtigen Infos rund um den Verein, Termine und Mitmachmöglichkeiten findest du auf unserer Website <a href="{{webseite}}">{{webseiteName}}</a> und in unserer WhatsApp-Gruppe, der wir dich in Kürze hinzufügen.</p>' ||
   '<p>Wenn du Fragen hast oder etwas unklar ist, melde dich jederzeit gern bei uns. Schön, dass du dabei bist – auf eine spannende Zeit mit dir!</p>',
   '',
   '',
   ARRAY['verein', 'vorname', 'webseite', 'webseiteName']),

  ('passwort_vergessen',
   'Passwort vergessen',
   'Wird verschickt, wenn jemand auf der Anmeldeseite ein neues Passwort anfordert.',
   'Passwort zurücksetzen – {{verein}}',
   'Sicherheit',
   'Passwort zurücksetzen',
   '<p>Du hast angefordert, dein Passwort für den Mitgliederbereich von {{verein}} zurückzusetzen.</p>' ||
   '<p>Klicke auf den folgenden Button, um ein neues Passwort zu setzen:</p>',
   'Neues Passwort setzen',
   'Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.',
   ARRAY['verein']),

  ('passwort_zurueckgesetzt',
   'Passwort durch die Verwaltung zurückgesetzt',
   'Wird verschickt, wenn ein Verwalter das Passwort eines Mitglieds zurücksetzt.',
   'Passwort zurücksetzen – {{verein}}',
   'Sicherheit',
   'Passwort zurücksetzen',
   '<p>Dein Passwort für den Mitgliederbereich von {{verein}} wurde zurückgesetzt.</p>' ||
   '<p>Klicke auf den folgenden Button, um ein neues Passwort zu setzen:</p>',
   'Neues Passwort setzen',
   '',
   ARRAY['verein']),

  ('veranstaltung_anmeldung',
   'Anmeldung zu einer Veranstaltung',
   'Bestätigung an Gäste, die sich über ein Veranstaltungsformular angemeldet haben. {{block}} enthält Datum, Ort und – falls vorhanden – den Link zum Ändern der Anmeldung.',
   'Anmeldung bestätigt: {{veranstaltung}}',
   'Anmeldebestätigung',
   '{{veranstaltung}}',
   '<p>Hallo {{name}},</p>' ||
   '<p>deine Anmeldung für <strong>{{veranstaltung}}</strong> ist bei uns eingegangen. Vielen Dank!</p>' ||
   '{{block}}',
   '',
   'Bei Fragen kannst du dich jederzeit an {{vereinsmail}} wenden.',
   ARRAY['name', 'veranstaltung', 'vereinsmail', 'block']),

  ('kontakt_eingang',
   'Neue Kontaktanfrage (an den Verein)',
   'Meldung an die Vereinsadresse, wenn jemand das Kontaktformular ausfüllt. {{block}} enthält Absenderadresse und Nachricht.',
   'Neue Kontaktanfrage von {{name}}',
   'Neue Kontaktanfrage',
   '{{name}}',
   '{{block}}',
   '',
   '',
   ARRAY['name', 'block']),

  ('kontakt_antwort',
   'Antwort auf eine Kontaktanfrage',
   'Der Rahmen um eine Antwort, die im Verwaltungsbereich geschrieben wird. {{anrede}} ist der Name mit einem Leerzeichen davor – und leer, wenn keiner bekannt ist. {{block}} ist die geschriebene Antwort.',
   'Ihre Anfrage – {{verein}}',
   '',
   '',
   '<p>Guten Tag{{anrede}},</p>{{block}}',
   '',
   '',
   ARRAY['verein', 'anrede', 'block']),

  ('zusammenfassung',
   'Tägliche Zusammenfassung',
   'Die Abendmail mit allem, was seit dem letzten Besuch neu ist. {{neuigkeiten}} lautet „eine Neuigkeit" oder „3 Neuigkeiten"; {{neuigkeitenGross}} ist dasselbe für den Satzanfang.',
   '{{neuigkeitenGross}} für dich',
   'Neu für dich',
   '',
   '<p>Hallo {{name}}, seit deinem letzten Besuch gibt es {{neuigkeiten}}:</p>{{block}}',
   'Im Forum ansehen',
   'Diese Zusammenfassung lässt sich in deinem Profil abstellen.',
   ARRAY['name', 'neuigkeiten', 'neuigkeitenGross', 'anzahl', 'block']),

  ('probeversand',
   'Probeversand',
   'Die Testmail aus den Einstellungen unter „Erscheinungsbild".',
   'Probeversand',
   'Einstellungen',
   'Der Probeversand hat geklappt',
   '<p>Diese Nachricht wurde über <strong>{{versandweg}}</strong> verschickt. Damit funktionieren Einladungen, das Zurücksetzen von Passwörtern, Kontaktanfragen und die Abendzusammenfassung.</p>',
   '',
   'Angefordert am {{zeitpunkt}}.',
   ARRAY['versandweg', 'zeitpunkt'])
)
UPDATE public.mail_templates t
SET label   = n.label,
    hinweis = n.hinweis,
    platzhalter = n.platzhalter,
    betreff      = CASE WHEN t.betreff      = t.standard->>'betreff'      THEN n.betreff      ELSE t.betreff      END,
    kennzeile    = CASE WHEN t.kennzeile    = t.standard->>'kennzeile'    THEN n.kennzeile    ELSE t.kennzeile    END,
    ueberschrift = CASE WHEN t.ueberschrift = t.standard->>'ueberschrift' THEN n.ueberschrift ELSE t.ueberschrift END,
    inhalt       = CASE WHEN t.inhalt       = t.standard->>'inhalt'       THEN n.inhalt       ELSE t.inhalt       END,
    knopf        = CASE WHEN t.knopf        = t.standard->>'knopf'        THEN n.knopf        ELSE t.knopf        END,
    fussnote     = CASE WHEN t.fussnote     = t.standard->>'fussnote'     THEN n.fussnote     ELSE t.fussnote     END,
    standard = jsonb_build_object(
      'betreff', n.betreff, 'kennzeile', n.kennzeile, 'ueberschrift', n.ueberschrift,
      'inhalt', n.inhalt, 'knopf', n.knopf, 'fussnote', n.fussnote)
FROM neu n
WHERE t.key = n.key;

-- ══ Aufnahmeantrag: dieselben Texte fuer Formular und PDF ═══════════════════
--
-- Das Formular auf der Website hatte eigene Zustimmungssaetze, das PDF eigene.
-- Wer zustimmt, liest also den einen Text, unterschrieben protokolliert wird
-- der andere. Ab hier ist es derselbe.
--
-- Damit muss das Formular die Texte lesen koennen, und zwar ohne Anmeldung:
-- Ein Aufnahmeantrag wird von jemandem ausgefuellt, der noch kein Konto hat.

DROP POLICY IF EXISTS pdf_texts_oeffentlich ON public.pdf_texts;
CREATE POLICY pdf_texts_oeffentlich ON public.pdf_texts
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS pdf_texts_lesen ON public.pdf_texts;

COMMENT ON TABLE public.pdf_texts IS
  'Textbausteine des Aufnahmeantrags – im Webformular wie im PDF. Anschrift und Vorstand kommen aus app_settings.';

WITH neu(key, label, hinweis, titel, inhalt, platzhalter) AS (VALUES

  ('titel',
   'Überschrift des Antrags',
   'Steht oben auf dem gedruckten Antrag.',
   '',
   'Antrag auf Mitgliedschaft',
   ARRAY[]::text[]),

  ('erklaerung',
   'Erklärung',
   'Steht im Formular über den Ankreuzfeldern und im PDF im eingerahmten Kasten. Jede Zeile ist ein Absatz; der erste steht im PDF fett.',
   'ERKLÄRUNG',
   'Ja, ich will Mitglied bei {{verein}} werden und beantrage hiermit meine Aufnahme!' || E'\n' ||
   'Mit dem Antrag auf Mitgliedschaft erkenne ich die Satzung des Vereins {{verein}} an. Mir ist bekannt, dass die Mitgliedschaft beitragspflichtig ist.' || E'\n' ||
   'Derzeit beträgt der jährliche Beitragssatz {{beitrag}} EUR. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig.',
   ARRAY['verein', 'beitrag']),

  ('datenschutz',
   'Datenschutzhinweis',
   'Steht im Formular unter der Erklärung und im PDF in einem eigenen Abschnitt. Sollte zur Datenschutzerklärung der Website passen.',
   'DATENSCHUTZ',
   'Der Schutz Deiner personenbezogenen Daten ist {{verein}} ein besonderes Anliegen. Wir verwenden die in diesem Aufnahmeantrag enthaltenen Angaben ausschließlich zur Erledigung aller im Zusammenhang mit der Mitgliedschaft stehenden Aufgaben im erforderlichen Umfang. Dies betrifft insbesondere die computergestützte Mitgliederbestandsverwaltung, die Mitgliederinformation sowie ggf. den Beitragseinzug. Deine Daten werden nicht an externe Dritte weitergegeben.',
   ARRAY['verein']),

  ('zustimmungen',
   'Die beiden Ankreuzfelder',
   'Erste Zeile: Satzung, zweite Zeile: Datenverarbeitung. Genau dieser Wortlaut steht im Formular neben dem Häkchen und im PDF neben dem angekreuzten Kästchen. {{satzung}} wird im Formular zum Verweis auf die Satzung.',
   '',
   'Ich habe die {{satzung}} von {{verein}} gelesen und erkenne sie an.' || E'\n' ||
   'Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß Datenschutzerklärung zu.',
   ARRAY['verein', 'satzung']),

  ('fussnote',
   'Kasten unten rechts im PDF',
   'Zwei Zeilen neben dem Eingangsdatum. Erscheint nicht im Formular.',
   '',
   'Digitale Antragstellung via {{webseite}}' || E'\n' || 'Eintrittsdatum = Datum dieses digitalen Antrags',
   ARRAY['webseite'])
)
UPDATE public.pdf_texts t
SET label   = n.label,
    hinweis = n.hinweis,
    platzhalter = n.platzhalter,
    titel  = CASE WHEN t.titel  = t.standard->>'titel'  THEN n.titel  ELSE t.titel  END,
    inhalt = CASE WHEN t.inhalt = t.standard->>'inhalt' THEN n.inhalt ELSE t.inhalt END,
    standard = jsonb_build_object('titel', n.titel, 'inhalt', n.inhalt)
FROM neu n
WHERE t.key = n.key;
