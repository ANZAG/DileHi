# Textprüfung und Feinschliff im Mitgliederbereich

Ziel: Alle sichtbaren Texte im internen Bereich klingen natürlich, helfen der jeweiligen Rolle weiter, benennen gleiche Dinge gleich, und die Menüs sind übersichtlich und auf dem Handy bedienbar.

## 1. Sprache: Gedankenstriche und KI-Klang raus

Betroffen sind laufende Sätze in der Oberfläche (nicht Datumsangaben wie „14–18 Uhr" und nicht Platzhalter „–" in Tabellen, die bleiben).

Beispiele, die umformuliert werden:

- Onboarding-Tour: mehrere Sätze mit eingeschobenem Gedankenstrich („… vorgeschlagen", „… an einem Ort", „… für volle Nachvollziehbarkeit", „Du hast Zugriff auf die Mitgliedsunterlagen – … –, die du …").
- Verwaltung: Seiten, Menü, Module, Darstellungen, Forum-Rubriken, Aufnahmeantrag, Mitgliederprofil, Erscheinungsbild.
- Veranstaltungen: Formular-Baukasten, Feldbeschreibungen und Auswertung.
- Meldungen wie „Mitglied deaktiviert – Zugang entzogen" werden zu zwei klaren Sätzen bzw. Halbsätzen.

Stilregeln: kurze Hauptsätze, Doppelpunkt oder Punkt statt Gedankenstrich, keine Dreiklänge („schnell, einfach und zuverlässig"), keine Werbefloskeln, Anrede wie bisher per „du".

## 2. Mehrwert je Rolle

- Mitglieder, Vorstand, Schatzmeister, Herold: Texte sagen, was zu tun ist und was danach passiert, ohne technische Begriffe. Wörter wie „Schlüssel", „Feld-Typ", „JSON-LD", „Slug", „Chunk" verschwinden aus sichtbaren Texten oder werden erklärt („Adresse der Seite" statt „Slug").
- Systemadministrator: bei Modulen, Berechtigungen, Einbindung, Audit-Log darf es genauer werden, aber mit Folgesatz „Was passiert, wenn ich das ändere".
- Leere Zustände bekommen überall einen nächsten Schritt statt nur „Noch nichts vorhanden".

## 3. Einheitliche Benennung

Regel: Intern heißt es **Kategorie**, im Text darf der Zusatz stehen, dass das bei uns die Epochen sind. Nach außen (öffentliche Seiten, Menü, Kontaktformular) bleibt **Epoche**.

Zu vereinheitlichen:

- Verwaltungskachel „Quellen" beschreibt heute „Epochen-Quellenangaben pflegen", die Kachel „Kategorien" dagegen „Ordnen Galerien und Quellen". Beide auf Kategorie-Sprache bringen.
- „Besucher-Highlights" nennt im Inhalt „Keine Stichpunkte für diese Epoche vorhanden".
- Galerie, Quellen und Besucher-Highlights bieten jeweils eine fest im Code stehende Epochenliste an, während unter „Kategorien" gepflegte Einträge nicht dort erscheinen. Diese drei Stellen ziehen künftig dieselbe Liste wie der Seitenbaukasten (mit der bisherigen Liste als Rückfall, wenn nichts gepflegt ist).
- Weitere Paare prüfen und angleichen: „Umfrage-Vorlage" gegen „Anmeldeformular", „Darstellungen" gegen „Darstellungssteckbrief", „Versammlungen" gegen „Pinnwand", „Anmeldungen" gegen „Auswertungen".

## 4. Übersicht der Menüs

- Verwaltung hat drei Reiter: Mitglieder und Anfragen, Öffentliche Website, System und Einrichtung. „Forum-Rubriken" und „Umfrage-Vorlage" liegen unter System, gehören aber zum Mitgliederbereich. Vorschlag: vierte Gruppe „Mitgliederbereich" für Forum-Rubriken, Umfrage-Vorlage und Mitgliederprofil.  ->Menschliche (meine) ANmelrkung: Umfragevorlage ist etwas das möglichst selten angepasst werden sollte. Daher bitte nicht in Mitgliederbereich. Lieber die aktuelle Kategorie in Allgemeine Einstellungen umbenennen. Sollten später mal mehr Customizingpunkte für den Mitgliederbereich kommen, kann dann Forum-Rubriken dort mit hingezogen werden.
- Kachelbeschreibungen sind auf dem Handy ausgeblendet. Die Kachelnamen werden so gewählt, dass sie allein verständlich sind.
- Reihenfolge innerhalb der Gruppen nach Häufigkeit der Nutzung, Einrichtungssachen nach unten.
- Dashboard-Kacheltexte werden auf einen Satz mit klarem Nutzen gebracht.

## 5. Responsivität

Durchgang mit schmaler Ansicht (375 px) über Dashboard, Profil, Veranstaltungen, Anmeldungen/Auswertung, Abstimmungen, Beiträge, Dokumente, Quellen, Karte, Forum und alle Verwaltungsbereiche. Bekannte Kandidaten:

- Mitgliederregister: feste Sechs-Spalten-Raster in der Ladeansicht.
- Berechtigungen und Forum-Rubriken: breite Tabellen, seitliches Scrollen prüfen und Hinweis ergänzen.
- Formular-Baukasten mit geteilter Ansicht und die Zeltplanung.
Auffälligkeiten werden korrigiert, Screenshots dienen als Beleg.

## 6. Ergebnis

Am Ende gibt es eine kurze Liste der geänderten Texte und der behobenen Darstellungsprobleme sowie eine Liste der Punkte, die bewusst offen bleiben.

## Technische Hinweise

- Kategorienquelle: `src/components/sitebuilder/auswahl.ts` liest bereits `site_categories`; `GalleryAdmin.tsx`, `SourcesAdmin.tsx` und `VisitorHighlightsAdmin.tsx` nutzen stattdessen lokale `EPOCH_OPTIONS`. Ein gemeinsamer Hook (z. B. `useKategorien`) ersetzt die drei Kopien, Fallback bleibt die bisherige Liste.
- Gruppierung der Verwaltung: `gruppe`-Feld in `src/pages/intern/Admin.tsx`, neue Gruppe nur dort ergänzen.
- Keine Datenbank- oder Rechteänderungen, keine Änderung an Modul-Logik. Nur Texte, Beschriftungen, Anordnung und CSS-Klassen.
- Abschluss mit `npm run ci` (Lint inklusive Barrierefreiheit) und Build.