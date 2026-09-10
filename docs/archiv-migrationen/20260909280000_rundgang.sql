-- Aus einer langen Kette werden Touren
--
-- Die erste Fassung war eine Liste von dreissig Schritten quer durch die
-- Anwendung. Sie sprang: Schritt 2 war eine Aufgabe im Profil, Schritt 3 eine
-- Bereichsvorstellung, Schritt 5 wieder eine Aufgabe im Profil. Jeder Schritt
-- war für sich richtig, und niemand hatte die Reihenfolge je als Erzählung
-- gelesen.
--
-- Jetzt gibt es zwei Ebenen:
--
--   Der Rundgang.  Einmal über die Startseite, in Lesereihenfolge, mit ein
--                  bis zwei Sätzen je Bereich. Ohne Seitenwechsel. Am Ende
--                  landet man im Profil, weil das der erste sinnvolle
--                  Handgriff ist.
--   Bereichstouren. Im jeweiligen Bereich und nur dort. Sie erklären, wie man
--                  dort arbeitet, nicht dass es ihn gibt.
--
-- Was selbsterklärend ist – Forum, Versammlungen, Dokumente, Quellensammlung,
-- Mitgliederkarte – wird im Rundgang genannt und bekommt keine eigene Tour.
--
-- Die Inhalte der ersten Fassung werden ersetzt, nicht ergänzt. Die Schritte
-- sind andere, ihre Reihenfolge ist eine andere, und Schlüssel, die es nicht
-- mehr gibt, wären nur noch Rätsel in der Tabelle.

ALTER TABLE public.onboarding_schritte
  ADD COLUMN IF NOT EXISTS tour text NOT NULL DEFAULT 'start';

COMMENT ON COLUMN public.onboarding_schritte.tour IS
  'Zu welcher Fuehrung der Schritt gehoert: start (Rundgang) oder der Name eines Bereichs.';

-- `gruppe` war die Einteilung der alten Kette und hat keine Bedeutung mehr:
-- Die Tour sagt jetzt, wohin ein Schritt gehoert.
ALTER TABLE public.onboarding_schritte DROP COLUMN IF EXISTS gruppe;

TRUNCATE public.onboarding_schritte;

-- ══ Der Rundgang ════════════════════════════════════════════════════════════
--
-- Alle Schritte liegen auf der Startseite. Der letzte springt ins Profil –
-- „geh am besten dorthin" ist ein schlechterer Abschluss als dort zu sein.

INSERT INTO public.onboarding_schritte
  (key, tour, icon, titel, text, tipp, route, anker, recht, modul, aufgabe, sort_order)
VALUES

  ('willkommen', 'start', 'Sparkles',
   'Schön, dass du da bist',
   'Der Mitgliederbereich hat einige Ecken. Ich zeige sie dir in zwei Minuten einmal der Reihe nach, damit du weisst, was wo liegt. Danach fangen wir mit deinem Profil an.',
   'Abbrechen kannst du jederzeit. Über dein Profil findest du diese Einführung wieder.',
   '/intern', NULL, NULL, NULL, NULL, 10),

  ('profil', 'start', 'User',
   'Dein Profil',
   'Deine Daten, deine Benachrichtigungen und alles, was du bei Anmeldungen nicht jedes Mal neu eintippen willst. Da fangen wir gleich an.',
   NULL, '/intern', 'knopf-profil', NULL, NULL, NULL, 20),

  ('verwaltung', 'start', 'Settings',
   'Die Verwaltung',
   'Du hast mehr Rechte als die meisten. Was du damit tun kannst, liegt hier – nach Bereichen sortiert, und du siehst nur, was dich betrifft.',
   'Für die Verwaltung selbst gibt es eine eigene Einführung, wenn du das erste Mal dort bist.',
   '/intern', 'knopf-verwaltung', 'admin.access', NULL, NULL, 30),

  ('beitraege', 'start', 'Coins',
   'Beiträge',
   'Ob dein Beitrag für dieses Jahr verbucht ist und wohin überwiesen wird. Mehr musst du hier nicht tun.',
   NULL, '/intern', 'knopf-beitraege', NULL, 'contributions', NULL, 40),

  ('veranstaltungen', 'start', 'CalendarDays',
   'Veranstaltungen',
   'Alle Vereinstermine. Du sagst zu oder ab, siehst wer sonst kommt, und kannst den Kalender abonnieren, damit die Termine auf deinem Handy stehen.',
   NULL, '/intern', 'kachel-events', NULL, 'events', NULL, 50),

  ('forum', 'start', 'MessagesSquare',
   'Forum',
   'Für Absprachen, die im Messenger untergehen würden. Ein Thema je Sache, und man findet es in einem halben Jahr wieder.',
   NULL, '/intern', 'kachel-forum', NULL, 'forum', NULL, 60),

  ('versammlungen', 'start', 'Megaphone',
   'Versammlungen',
   'Ankündigungen, Einladungen zur Mitgliederversammlung und die Protokolle danach. Antworten kannst du dort auch.',
   NULL, '/intern', 'kachel-announcements', NULL, 'announcements', NULL, 70),

  ('abstimmungen', 'start', 'Vote',
   'Abstimmungen',
   'Wahlen und Beschlüsse laufen hier, auch für die, die nicht vor Ort sein können. Du bekommst eine Nachricht, sobald eine Abstimmung offen ist.',
   NULL, '/intern', 'kachel-elections', NULL, 'elections', NULL, 80),

  ('dokumente', 'start', 'FileText',
   'Dokumente',
   'Satzung, Ordnungen und Berichte zum Nachlesen und Herunterladen.',
   NULL, '/intern', 'kachel-documents', NULL, 'documents', NULL, 90),

  ('quellen', 'start', 'BookOpen',
   'Quellensammlung',
   'Die gemeinsame Bibliothek: Funde, Abbildungen und Literatur, nach Kategorie sortiert. Eigenes darfst du ergänzen.',
   NULL, '/intern', 'kachel-sources', NULL, 'sources', NULL, 100),

  ('karte', 'start', 'MapPin',
   'Mitgliederkarte',
   'Wer wo wohnt – praktisch für Fahrgemeinschaften. Du erscheinst dort nur, wenn du es in deinem Profil erlaubst.',
   NULL, '/intern', 'kachel-member_map', NULL, 'member_map', NULL, 110),

  ('los', 'start', 'ClipboardList',
   'Und jetzt du',
   'Das war der Überblick. Hier im Profil steht, was noch offen ist – das hakt sich von selbst ab, sobald du es erledigt hast. Nimm dir die Punkte, wann es dir passt.',
   NULL, '/intern/profil', 'profil-checkliste', NULL, NULL, NULL, 120);

-- ══ Die Aufgaben im Profil ══════════════════════════════════════════════════
--
-- Keine Tour, sondern eine Liste im Profil. Was erledigt ist, weiss die
-- Anwendung selbst (onboarding_erledigt); abgehakt wird nichts von Hand.
--
-- Die Einrichtungsaufgaben von vorher – Logo hochladen, Verein benennen,
-- erste Seite veroeffentlichen, erstes Mitglied einladen – stehen hier
-- bewusst NICHT mehr. Das ist die Installation eines neuen Vereins und nicht
-- die Sache eines Mitglieds; sie bekommt einen eigenen Ablauf.

INSERT INTO public.onboarding_schritte
  (key, tour, icon, titel, text, tipp, route, anker, recht, modul, aufgabe, sort_order)
VALUES

  ('aufgabe_profil', 'profil', 'User',
   'Namen und Wohnort eintragen',
   'Vorname, Nachname und Ort. Alles Weitere ist freiwillig, aber diese drei braucht der Verein.',
   NULL, '/intern/profil', 'profil-daten', NULL, NULL, 'profil', 10),

  ('aufgabe_zelte', 'profil', 'Tent',
   'Zelte eintragen',
   'Was du mitbringst und wie gross es ist. Daraus entsteht die Lagerplanung, und du musst die Masse nicht bei jeder Anmeldung heraussuchen.',
   NULL, '/intern/profil', 'profil-zelte', NULL, 'lagerlogistik', 'zelte', 20),

  ('aufgabe_steckbrief', 'profil', 'ScrollText',
   'Darstellung beschreiben',
   'Was du darstellst und was du kannst. Daraus entsteht die öffentliche Übersicht, mit der Museen und Veranstalter sehen, was der Verein zeigen kann. Dein Name steht dort nicht.',
   NULL, '/intern/profil', 'profil-darstellung', NULL, 'personas', 'steckbrief', 30),

  ('aufgabe_zusage', 'profil', 'CalendarDays',
   'Bei einer Veranstaltung zusagen',
   'Der einfachste Weg anzukommen: einen Termin heraussuchen und zusagen. Gibt es ein Anmeldeformular, sind deine Profilangaben darin schon eingetragen.',
   NULL, '/intern/veranstaltungen', NULL, NULL, 'events', 'zusage', 40);

UPDATE public.onboarding_schritte
SET standard = jsonb_build_object('titel', titel, 'text', text, 'tipp', tipp);

-- ══ Merkzettel ══════════════════════════════════════════════════════════════
--
-- Die Schluessel der ersten Fassung gibt es nicht mehr. Ausserdem kommt eine
-- neue Sorte dazu: „streifen:<tour>" haelt fest, dass jemand das Angebot
-- „Neu hier?" in einem Bereich weggeklickt hat. Sie liegt in der Datenbank und
-- nicht im Browser – ein Geraetewechsel soll das Angebot nicht zurueckholen.

DELETE FROM public.user_tours
WHERE tour_key NOT LIKE 'streifen:%'
  AND tour_key NOT LIKE 'aufgabe:%'
  AND tour_key NOT IN (SELECT key FROM public.onboarding_schritte);

COMMENT ON COLUMN public.user_tours.tour_key IS
  'Schluessel eines Schrittes (gesehen), "aufgabe:<key>" (Aufgabe ausgeblendet) oder "streifen:<tour>" (Angebot weggeklickt).';
