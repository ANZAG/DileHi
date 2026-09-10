-- Die Bereichstouren
--
-- Der Rundgang sagt, wo etwas liegt. Diese Touren sagen, wie man dort
-- arbeitet – im jeweiligen Bereich und nur dort. Angeboten werden sie über
-- den Streifen „Neu hier?" beim ersten Besuch und bleiben über das
-- Fragezeichen im Kopf erreichbar.
--
-- Erklärt wird am echten Bildschirm, nicht an Bildern. Ein Bild veraltet mit
-- der nächsten Änderung, zeigt fremde Farben und fremde Beispieldaten – für
-- ein Produkt, das andere Vereine aufsetzen, ist es dreimal falsch. Die Tour
-- öffnet stattdessen den obersten echten Termin und erklärt daran.
--
-- Kein Eintrag für Forum, Versammlungen, Dokumente, Quellensammlung und
-- Mitgliederkarte: Die sind so alt und so verbreitet, dass eine Anleitung
-- mehr Zeit kostet als sie spart. Sie werden im Rundgang genannt, mehr nicht.
--
-- Alle Schritte haben `route = NULL`, und das ist wichtig: Eine Bereichstour
-- läuft dort, wo sie gestartet wurde. Mit einer Route hätte der Schritt über
-- die Speicherleiste den Formularbauer verlassen, in dem er gerade erklärt,
-- worauf man beim Speichern achten muss. Zu navigieren ist Sache des
-- Rundgangs, und selbst der tut es nur einmal, ganz am Ende.

INSERT INTO public.onboarding_schritte
  (key, tour, icon, titel, text, tipp, route, anker, recht, modul, aufgabe, sort_order)
VALUES

-- ══ Veranstaltungen ═════════════════════════════════════════════════════════

  ('v_ueberblick', 'veranstaltungen', 'CalendarDays',
   'Der Kalender und die Liste',
   'Oben der Monat, darunter die nächsten Termine. Beides zeigt dasselbe – der Kalender für den Überblick, die Liste zum Arbeiten.',
   NULL, NULL, NULL, NULL, 'events', NULL, 10),

  ('v_termin', 'veranstaltungen', 'ClipboardList',
   'Ein Termin von innen',
   'Ein Klick auf einen Termin klappt ihn auf: Zeiten, Ort, Beschreibung und wer bisher zugesagt hat. Ich habe den obersten schon geöffnet.',
   NULL, NULL, 'termin-erster', NULL, 'events', NULL, 20),

  ('v_zusagen', 'veranstaltungen', 'Check',
   'Zusagen und absagen',
   'Ohne Anmeldeformular steht hier nur „Zusagen“ – ein Klick, fertig, und genauso wieder ab. Gibt es ein Formular, heisst der Knopf „Anmelden“ und führt zu den Fragen; deine Profilangaben sind darin schon eingetragen. „Absprache“ öffnet das Forumsthema zum Termin.',
   'Deine Antworten kannst du bis zum Anmeldeschluss jederzeit ändern.',
   NULL, 'termin-aktionen', NULL, 'events', NULL, 30),

  ('v_kalender', 'veranstaltungen', 'CalendarDays',
   'Termine aufs Handy',
   'Einmal abonniert, stehen alle Vereinstermine in deinem Kalender und bleiben dort aktuell. Das ist etwas anderes als der iCal-Knopf daneben: Der lädt den Stand von heute herunter und weiss von späteren Änderungen nichts.',
   NULL, NULL, 'knopf-kalender', NULL, 'events', NULL, 40),

  ('v_anlegen', 'veranstaltungen', 'Plus',
   'Selbst einen Termin anlegen',
   'Das darf jeder, nicht nur der Vorstand. Beim Anlegen kannst du gleich ein Anmeldeformular dazunehmen, wenn du wissen musst, wer was mitbringt.',
   'Hast du vorher einen Tag im Kalender angeklickt, ist das Datum schon eingetragen.',
   NULL, 'knopf-termin-anlegen', NULL, 'events', NULL, 50),

-- ══ Anmeldeformular bauen ═══════════════════════════════════════════════════

  ('f_zweck', 'anmeldeformular', 'ListChecks',
   'Wofür ein Anmeldeformular gut ist',
   'Alles, was du vor der Veranstaltung wissen musst und nicht dreimal nachfragen willst: Wer übernachtet, wer bringt ein Zelt mit, wer isst was, wer fährt wen mit.',
   NULL, NULL, NULL, 'events.moderate', 'event_forms', NULL, 100),

  ('f_vorlage', 'anmeldeformular', 'Copy',
   'Mit der Vorlage anfangen',
   'Die Vorlage bringt die Fragen mit, die fast immer gebraucht werden. Schneller als bei null anzufangen, und was nicht passt, wirfst du raus.',
   'Die Vorlage selbst pflegst du unter Verwaltung → Umfrage-Vorlage.',
   NULL, 'knopf-vorlage', 'events.moderate', 'event_forms', NULL, 110),

  ('f_speichern', 'anmeldeformular', 'ListChecks',
   'Erst speichern, dann öffnen',
   'Änderungen sind erst gesichert, wenn du speicherst – die Leiste sagt dir, ob noch etwas offen ist. Solange das Formular geschlossen ist, sieht es niemand ausser dir.',
   'Ein Anmeldeschluss schliesst das Formular von selbst. Du musst nicht daran denken.',
   NULL, 'speicherleiste', 'events.moderate', 'event_forms', NULL, 120),

-- ══ Auswertung ══════════════════════════════════════════════════════════════

  ('a_ueberblick', 'auswertung', 'ClipboardList',
   'Wer kommt, und was gebraucht wird',
   'Alle Antworten auf einen Blick, zusammengezählt statt einzeln durchgeklickt. Je nachdem, welche Module eingeschaltet sind, stehen hier auch Verpflegung, Fahrgemeinschaften und die Zeltplanung.',
   NULL, NULL, NULL, 'events.moderate', 'event_forms', NULL, 200),

  ('a_export', 'auswertung', 'ClipboardList',
   'Mitnehmen',
   'Der CSV-Knopf gibt dir alle Antworten als Tabelle – für die Einkaufsliste, die Standmeldung oder was der Veranstalter sonst braucht.',
   NULL, NULL, 'knopf-csv', 'events.moderate', 'event_forms', NULL, 210),

-- ══ Abstimmungen ════════════════════════════════════════════════════════════

  ('ab_thema', 'abstimmungen', 'Vote',
   'Thema und Abstimmung',
   'Ein Thema ist die Klammer – eine Mitgliederversammlung etwa, oder ein Antrag mit mehreren Punkten. Darin liegen die einzelnen Abstimmungen. Diese Aufteilung gibt es, damit Stellvertretungen für die ganze Versammlung gelten und nicht für jede Frage neu eingerichtet werden müssen.',
   NULL, NULL, 'knopf-neues-thema', 'elections.manage', 'elections', NULL, 300),

  ('ab_stellvertretung', 'abstimmungen', 'Users',
   'Stellvertretungen',
   'Wer nicht da sein kann, überträgt seine Stimme an ein anwesendes Mitglied. Das trägst du hier ein, bevor die erste Abstimmung öffnet – wer vertritt, stimmt dann zusätzlich zur eigenen Stimme mit ab.',
   'Jede Änderung landet im Protokoll. Das schützt vor allem die, die nichts falsch gemacht haben.',
   NULL, 'knopf-stellvertretung', 'elections.manage', 'elections', NULL, 310),

  ('ab_ablauf', 'abstimmungen', 'Vote',
   'Öffnen, laufen lassen, schliessen',
   'Eine Abstimmung öffnest du, wenn es soweit ist. Solange sie läuft, siehst du nur, wie viele abgestimmt haben – nicht, wie. Erst nach dem Schliessen steht das Ergebnis da, und dann steht es fest.',
   NULL, NULL, NULL, 'elections.manage', 'elections', NULL, 320),

-- ══ Verwaltung ══════════════════════════════════════════════════════════════

  ('vw_gruppen', 'verwaltung', 'Settings',
   'Vier Bereiche, ein Reiter offen',
   'Die Kacheln liegen in Gruppen: Personen, öffentliche Website, System. Du siehst nur, was deine Rechte hergeben – was fehlt, brauchst du auch nicht.',
   NULL, NULL, NULL, 'admin.access', NULL, NULL, 400),

  ('vw_mitglieder', 'verwaltung', 'Users',
   'Mitglieder sind anklickbar',
   'Die Liste sieht aus wie eine Tabelle, ist aber eine Kartei: Ein Klick auf eine Zeile öffnet das Mitglied mit allen Daten, der Rolle, dem Eintrittsdatum und dem Aufnahmeantrag. Dort änderst du auch, statt in der Liste zu suchen.',
   NULL, NULL, 'kachel-members', 'members.manage', NULL, NULL, 410),

  ('vw_seiten', 'verwaltung', 'FileText',
   'Die öffentlichen Seiten',
   'Jede Zeile ist eine Seite der Website. Sichtbar oder nicht, in welcher Reihenfolge, und was drinsteht.',
   NULL, NULL, 'kachel-sitepages', 'site.content_edit', NULL, NULL, 420),

  ('vw_seiten_regler', 'verwaltung', 'Settings',
   'Das Zahnrad neben einer Seite',
   'Dahinter liegt alles, was die Seite als Ganzes betrifft: ihre Adresse, der Titel in der Trefferliste, die Beschreibung für Suchmaschinen und der Schalter, ob sie überhaupt gefunden werden soll.',
   'Der Titel in der Trefferliste entscheidet über den Klick. Ein eigener Satz ist dort besser als ein Muster.',
   NULL, 'seite-einstellungen', 'site.content_edit', NULL, NULL, 425),

  ('vw_seiten_bauen', 'verwaltung', 'FileText',
   'Und „Bearbeiten“ öffnet den Baukasten',
   'Zwei verschiedene Dinge, deshalb zwei Knöpfe: Das Zahnrad ist die Seite als Ganzes, „Bearbeiten“ ist ihr Inhalt. Beim ersten Öffnen des Baukastens gibt es dort eine eigene kurze Einführung.',
   NULL, NULL, 'seite-bearbeiten', 'site.content_edit', NULL, NULL, 428),

  ('vw_bausteine', 'verwaltung', 'Image',
   'Womit die Bausteine gefüllt werden',
   'Galerie, Quellen, Besucher-Highlights und Darstellungen sind keine eigenen Seiten. Es sind Inhalte, die auf den öffentlichen Seiten in einem passenden Baustein erscheinen – du pflegst sie hier und setzt den Baustein dort ein, wo er stehen soll.',
   NULL, NULL, 'kachel-gallery', 'gallery.manage', 'gallery', NULL, 430),

  ('vw_kategorien', 'verwaltung', 'Tags',
   'Kategorien halten das zusammen',
   'Jedes Bild, jede Quelle und jeder Stichpunkt gehört zu einer Kategorie. Die Bausteine auf den Seiten zeigen dann genau die Kategorie, die dort hingehört – ohne dass du irgendwo eine Liste pflegst.',
   NULL, NULL, 'kachel-kategorien', 'site.content_edit', NULL, NULL, 440),

  ('vw_system', 'verwaltung', 'Palette',
   'Einmal einrichten',
   'Unter „System und Einrichtung“ steht, was selten angefasst wird und dann überall wirkt: Name und Aussehen des Vereins, die Module, die Texte der Mails, der Aufnahmeantrag und die Rechte der Rollen.',
   NULL, NULL, 'kachel-erscheinungsbild', 'system.settings', NULL, NULL, 450),

-- ══ Seiteneditor ════════════════════════════════════════════════════════════
--
-- Zwei der vier Schritte haben keinen Anker: Die beiden Seitenleisten gehören
-- zu Puck und haben keine Kennung, auf die man sich verlassen könnte. Dort
-- steht die Karte in der Mitte. Das ist ein Schönheitsfehler und kein Fehler.

  ('s_bausteine', 'seiten', 'FileText',
   'Links die Bausteine',
   'Eine Seite entsteht aus Bausteinen: Überschrift, Text, Bild, Kasten, Galerie. Du ziehst sie von links in die Seite und schiebst sie dort in die richtige Reihenfolge.',
   NULL, NULL, NULL, 'site.content_edit', NULL, NULL, 500),

  ('s_felder', 'seiten', 'Settings',
   'Rechts die Einstellungen',
   'Was ein Baustein anzeigt, stellst du rechts ein, sobald du ihn angeklickt hast: Text, Bild, Breite, Abstände. Was du siehst, ist auch das, was später dasteht.',
   NULL, NULL, NULL, 'site.content_edit', NULL, NULL, 510),

  ('s_entwurf', 'seiten', 'FileText',
   'Entwurf sichern heisst nicht veröffentlichen',
   'Du kannst in Ruhe probieren: „Entwurf sichern“ merkt sich deinen Stand, ohne dass ihn jemand sieht. Öffentlich wird die Seite erst, wenn du sie veröffentlichst.',
   'Eine veröffentlichte Seite lässt sich auch wieder zurückziehen. Sie ist dann für Besucher weg, die Inhalte bleiben.',
   NULL, 'knopf-entwurf', 'site.content_edit', NULL, NULL, 520);

UPDATE public.onboarding_schritte
SET standard = jsonb_build_object('titel', titel, 'text', text, 'tipp', tipp)
WHERE standard IS NULL;
