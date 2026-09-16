-- Startdaten für eine neue Installation
--
-- Der Ausgangsstand ist ein Abzug aus DileHis Datenbank. Er bringt deshalb
-- Dinge mit, die nur DileHi gehören: drei Epochen als Seitenkategorien und ein
-- Kopfmenü, das auf Seiten zeigt, die es in einer neuen Installation nicht
-- gibt ("Spätmittelalter", "Napoleonik", "Erster Weltkrieg", "Für
-- Veranstalter", "Über uns"). Ein fremder Verein sieht als Erstes ein Menü,
-- das ins Leere führt, und muss aufräumen, bevor er anfangen kann.
--
-- Diese Migration räumt das weg und setzt an seine Stelle, was jede
-- Installation braucht: eine Startseite im Kopf, Impressum und Datenschutz im
-- Fuß (die Seiten dazu legen die beiden folgenden Migrationen an), und SMTP
-- als Versandweg, weil ein Verein ohne Microsoft 365 sonst gar nicht
-- verschicken kann.
--
-- WICHTIG – die Schranke: Das alles passiert nur in einer Installation, in der
-- noch niemand angemeldet ist. Dieselbe Migration läuft beim nächsten
-- Ausrollen auch über DileHis Datenbank; dort steht das Menü seit einem Jahr,
-- und es bleibt unangetastet. Die Bedingung ist dieselbe wie in
-- `setup_needed()`: Solange keine Rolle vergeben ist, hat die Installation
-- noch niemanden. Dazu die Profile, falls jemand Konten anlegt, bevor er
-- Rollen verteilt.

DO $$
DECLARE
  frisch boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles)
     AND NOT EXISTS (SELECT 1 FROM public.profiles)
    INTO frisch;

  IF NOT frisch THEN
    RAISE NOTICE 'Startdaten übersprungen: Die Installation ist bereits in Betrieb.';
    RETURN;
  END IF;

  -- Seitenkategorien: Epochen sind DileHis Einteilung, kein Grundbestand.
  DELETE FROM public.site_categories;

  -- Kopfmenü: nur die Startseite. Alles andere baut der Verein selbst, sobald
  -- er seine Seiten hat – ein Menü mit toten Links ist schlimmer als ein
  -- kurzes.
  DELETE FROM public.site_menu
  WHERE area = 'header'
    AND (href IS DISTINCT FROM '/' OR href IS NULL);

  -- Falls im Abzug keine Startseite im Kopf stand, eine anlegen.
  INSERT INTO public.site_menu (label, href, area, sort_order, is_visible)
  SELECT 'Startseite', '/', 'header', 10, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.site_menu WHERE area = 'header' AND href = '/'
  );

  -- Fuß: Impressum und Datenschutz. Beide sind Pflicht, beide stehen im
  -- Ausgangsstand schon – hier nur für den Fall, dass sie fehlen.
  INSERT INTO public.site_menu (label, href, area, sort_order, is_visible)
  SELECT 'Impressum', '/impressum', 'footer_legal', 10, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.site_menu WHERE area = 'footer_legal' AND href = '/impressum'
  );

  INSERT INTO public.site_menu (label, href, area, sort_order, is_visible)
  SELECT 'Datenschutz', '/datenschutz', 'footer_legal', 20, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.site_menu WHERE area = 'footer_legal' AND href = '/datenschutz'
  );

  -- Die Rollen heissen, wie sie ein fremder Verein nennen würde.
  --
  -- Im Ausgangsstand stehen DileHis Ämter: „1. Officiatus", „2. Officiatus",
  -- „Herold", „Schatzmeister". Das ist unsere Sprache aus dem Reenactment —
  -- ein Turnverein sucht darin vergeblich, wer die Software verwaltet.
  --
  -- Umbenannt werden nur die Beschriftungen und die Erklärungen, nicht die
  -- Schlüssel: An `officiatus_1` und den anderen hängen über hundert
  -- Rechtezuweisungen, und an einigen Stellen im Programm hängt Verhalten
  -- daran (Symbol in der Mitgliederliste, die Rollen, die man nicht zum
  -- Ausprobieren wechseln kann). Die Schlüssel sind technisch, sie stehen
  -- nirgends vor einem Mitglied. Ihre Umbenennung gehört in den zweiten
  -- Durchgang der englischen Bezeichner, zusammen mit den Stellen im Code.
  --
  -- Jeder Verein kann alles davon in der Verwaltung ändern — das hier ist nur
  -- der Anfang, mit dem er etwas anfangen kann.
  UPDATE public.role_catalog SET label = 'Admin',
         description = 'Verwaltet die Installation, vergibt Rechte und Rollen'
   WHERE key = 'officiatus_1';
  UPDATE public.role_catalog SET label = 'Co-Admin',
         description = 'Vertretung des Admins, mit denselben Aufgaben'
   WHERE key = 'officiatus_2';
  UPDATE public.role_catalog SET label = 'Medienbeauftragter',
         description = 'Öffentlichkeitsarbeit: Website, Galerie, Ankündigungen'
   WHERE key = 'herold';
  UPDATE public.role_catalog SET label = 'Kassenwart',
         description = 'Kasse, Beiträge und Mitgliedsunterlagen'
   WHERE key = 'schatzmeister';

  -- Versandweg: SMTP ab Werk.
  --
  -- Microsoft Graph ist DileHis Weg und setzt Microsoft 365 samt eigener
  -- App-Registrierung voraus. Ein Verein mit einem gewöhnlichen Postfach hat
  -- SMTP; das ist die Vorgabe, mit der die meisten ankommen. Ist SMTP nicht
  -- eingerichtet, sagt die Verwaltung das und legt die Einladungslinks zum
  -- Weitergeben hin – niemand steht deshalb ohne Zugang da.
  UPDATE public.app_settings SET mail_transport = 'smtp';
END
$$;
