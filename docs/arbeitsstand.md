# Arbeitsstand DING

Stand: 16. September 2026, abends. Der Umzug ist fertig — DileHi läuft im
eigenen Supabase-Projekt, die Dateien liegen in SharePoint, Lovable ist
abgeschaltet. Seitdem geht es darum, dass ein fremder Verein DING selbst
aufsetzen kann.

Diese Datei hält fest, was umgesetzt ist, an welchen Fehlern wir uns gestossen
haben, was man über das Projekt wissen muss und was als Nächstes kommt. Sie
ist für den Menschen geschrieben, der weitermacht, und für Claude, wenn eine
neue Unterhaltung beginnt.

---

## Auf einen Blick

| | |
| --- | --- |
| Produkt | **DING** — das Vereinsprogramm, das andere Vereine selbst aufsetzen können. DileHi ist seine erste Installation |
| Arbeitszweig | `DING` |
| Zweig der Vereinsseite | `main` — jeder Push baut dilehi.de und lädt per FTP zu gn2 |
| Datenbank von DileHi | Supabase-Projekt **DileHi**, Kennung `hmrogjpuslpzrittljjr`, Frankfurt (bis 11. September hiess es DING) |
| Test- und Vorführsystem | Supabase-Projekt **DING**, Kennung `nyloyirwppbetrkkyncw`, Frankfurt, angelegt am 11. September, noch völlig leer. Gehört zu `ding.dilehi.de` (`PROBE_SUPABASE_PROJECT_REF`) |
| Alte Datenbank | Lovable-Cloud, Kennung `sstplyhfebexeyqehsvv` — am 16. September abgeschaltet |
| Probeseite | `ding.dilehi.de` — seit 11. September leer. Später die Testinstallation gegen das Projekt DING, gebaut von Hand über `probeseite.yml` |
| Vereinsseite | `www.dilehi.de` — baut aus `main`, spricht seit 11. September mit dem eigenen Projekt |
| Plan | Der Umzug ist durch ([`umzug.md`](umzug.md)). Jetzt DING so weit bringen, dass ein fremder Verein es selbst aufsetzen kann: Startdaten, Einrichtungsassistent, Probelauf im leeren Projekt |
| Tests | 43 Dateien, 424 Prüfungen, alle grün (16. September, hier gelaufen) |

---

## Was umgesetzt ist

### Onboarding

Zweimal gebaut. Die erste Fassung war eine Diashow, die ich nur modular
gemacht hatte, statt sie zu ersetzen. Die jetzige:

- **Zwei Eingänge:** die Einrichtung einer neuen Installation und der erste
  Besuch eines Mitglieds.
- **Rundgang über die Startseite** in Lesereihenfolge, ohne Seitenwechsel bis
  auf den letzten Schritt ins Profil. Ein Test prüft die Reihenfolge gegen
  das Markup.
- **Bereichstouren** für einzelne Bereiche, gestartet über den Streifen „Neu
  hier?" oder das Fragezeichen. Sie erklären am echten Bildschirm, nicht an
  Bildern.
- **Aufgaben** im Profil, die sich nur abhaken, wenn die Sache wirklich getan
  ist (`onboarding_completed_tasks()` prüft in der Datenbank).
- **Hervorhebung** über vier Rechtecke um das Ziel, angesteuert über
  `data-tour`-Anker.
- **Hilfe am Feld** (`<Hilfe k="…">`) mit Texten aus der Datenbank.
- **Alle Inhalte in der Datenbank** (`onboarding_steps`,
  `onboarding_help`), pflegbar unter Verwaltung → Erste Schritte, mit
  Auslieferungszustand zum Zurücksetzen.

Näheres: [`onboarding.md`](onboarding.md).

### Beiträge

- Beitragsstufen lassen sich entfernen. Die Datenbank entscheidet selbst: ohne
  Daten löschen, mit Daten aus Vorjahren bis zum Ende der Aufbewahrung
  behalten, mit Daten aus dem laufenden Jahr zum nächsten Jahr vormerken.
- Kachel- und Listenansicht in der Beitragsübersicht.

### Oberfläche

- Eine Seitenbreite (`SEITE`, `max-w-6xl`) statt fünf, eine Lesebreite
  (`LESEBREITE`, 68 Zeichen), beide in `src/lib/layout.ts`.
- Profil zweispaltig, Verwaltung einheitlich breit.
- Menüs durchgesehen und Erklärungen dort ergänzt, wo sie fehlten.

### Rollen

- Das Enum `app_role` ist aufgelöst. Rollen sind Text mit Fremdschlüssel auf
  `role_catalog`, umbenennbar über `ON UPDATE CASCADE`.
- Die Rolle „vorstand" wird gelöscht, mit der Migration
  `20260911120000_remove_vorstand_role.sql`. Sie läuft beim nächsten Ausrollen.
  Den Vorsitz hat bei uns `officiatus_1`. Massgeblich ist nie ein Name,
  sondern das Recht: Wer `roles.manage` hat, darf Rollen vergeben.
  *Beim Schreiben dieser Datei aufgefallen:* Gewünscht war das schon am
  10. September. Die Migrationen danach haben aber nur die Namen frei gemacht,
  die Rolle selbst stand noch im Ausgangsstand. Mit `roles.manage` galt sie
  als Systemrolle und liess sich in der Verwaltung nicht löschen.
- `is_leadership`, `role_status()`, `role_catalog_guard()`,
  einstellbare Standardrolle (`app_settings.default_role`). Ist keine gesetzt,
  nimmt das Programm die unterste Rolle im Katalog.
- `is_herold()` und `is_schatzmeister()` sind gelöscht. Sie steckten in keiner
  einzigen Regel mehr.

### Sicherheit

- **Gespeichertes XSS** geschlossen: `src/lib/betonung.ts` maskiert erst und
  setzt dann die Hervorhebung, nicht umgekehrt.
- **Ausführungsrechte:** Jeder Funktion ist `PUBLIC` entzogen. Vorher konnte
  jeder Besucher `pending_digests()` aufrufen und bekam Namen und alle
  ungelesenen Benachrichtigungen jedes Mitglieds.
- Jede Funktion hat einen festen `search_path`.
- Die Sitemap kommt aus einer Edge Function statt aus einer Datei.
- **Zwischenstände laufender Abstimmungen** waren nicht geschützt:
  `get_election_results()` gab jedem Mitglied die Stimmen laufender
  Abstimmungen heraus, obwohl die Oberfläche das Ergebnis erst nach Abschluss
  zeigt. Jetzt nur geschlossene — laufende nur für `elections.manage`
  (`20260915115000_election_results_closed.sql`).
- **Anmeldung** (neu, im Ausrollen-Knopf): Adresse statt `localhost:3000`,
  Selbstregistrierung aus. Geprüft: Keine Leseregel gilt allein deshalb, weil
  jemand angemeldet ist. Ein fremdes Konto hätte also nur öffentliche Daten
  gesehen — abgeschaltet ist die Registrierung trotzdem.

### Installation ohne Kommandozeile

Die Anleitung für einen neuen Verein steht in
[`installation.md`](installation.md): sechs Schritte, gut eine Stunde, kein
SQL-Editor.

- **Der Ausgangsstand** `supabase/migrations/00000000000000_ausgangsstand.sql`:
  die ganze Datenbank in einer Datei, aus einer einzigen Abfrage
  ([`supabase/ausgangsstand/EXPORT.md`](../supabase/ausgangsstand/EXPORT.md)).
  62 Tabellen, 67 Funktionen, Zugriffsregeln, Rechte, Startdaten, Ablagen,
  der Trigger an `auth.users`.
- **Die alten Migrationen** liegen in `docs/archiv-migrationen/` (111 Dateien).
  Die Bereichstouren (`20260909290000_bereichstouren.sql`) sind zurückgeholt,
  weil sie in der alten Datenbank nie gelaufen waren.
- **Der Ausrollen-Knopf** (`.github/workflows/supabase.yml`): sieht zuerst
  nach, was in der Datenbank steht, prüft das Passwort auf mitkopierte
  Umbrüche, kann das Migrationsverzeichnis leeren (nur bei leerer Datenbank),
  spielt Migrationen ein, stellt Edge Functions bereit, stellt die Anmeldung
  ein.
- **Der erste Zugang** über `/einrichtung` und die Edge Function
  `setup-first-admin`. Dreifach gesichert: Sie braucht `SETUP_SECRET`, arbeitet
  nur, solange niemand eine Rolle hat, und vergibt die Rolle mit
  `roles.manage`. Ist noch keine Web-Adresse hinterlegt, nimmt sie die Seite,
  von der aus sie aufgerufen wurde.
- **Aufräumen, wenn ein Projekt schon etwas abbekommen hat:**
  [`projekt-leeren.sql`](projekt-leeren.sql).

### Probeseite

`ding.dilehi.de` ist seit dem 11. September **leer**. Das Projekt, gegen das
sie gebaut war, gehört seit dem Umzug DileHi.

`.github/workflows/probeseite.yml` läuft nur noch von Hand, mit zwei
Aktionen: `leeren` und `ausrollen`. Ausrollen braucht ein eigenes Geheimnis
`PROBE_SUPABASE_PROJECT_REF` und bricht ab, wenn es auf DileHi zeigt. Die
Prüfungen (Typen, Tests) für Pushes auf `DING` laufen jetzt in `deploy.yml`.

**Der Plan für ding.dilehi.de:**

1. Das zweite Supabase-Projekt steht seit dem 11. September leer bereit
   (`nyloyirwppbetrkkyncw`; der kostenlose Tarif erlaubt zwei). Dort DING
   streng nach [`installation.md`](installation.md) installieren — das ist der
   Probelauf der Anleitung. Was dafür vorher fehlt, steht unten unter
   „Was noch ansteht", Abschnitt 2.
2. Klappt das, die Seite hinter ein Passwort setzen (Verzeichnisschutz bei
   gn2) und als Vorführsystem nutzen.
3. Darin eine möglichst genaue Kopie von vuozvolc.de bauen, damit die sich
   DING ansehen können. Vorarbeit:
   [`vuozvolc-machbarkeit.md`](vuozvolc-machbarkeit.md).

### Umzug aus Lovable

Abgeschlossen am 11. September, die Werkzeuge liegen in
[`archiv-umzug/`](archiv-umzug/). Anleitung und Aufbau: [`umzug.md`](umzug.md). Kurz: `backup-export` gibt mit
`accounts: true` auch die Konten heraus, samt Passwort-Hash über
`transfer_accounts()` in der alten Datenbank. Der Workflow „Umzug aus Lovable"
spielt alles in einer Transaktion ein (`supabase/transfer/import.sql`, ohne
Trigger, Verweise danach nachgeprüft), wiederholt die Migrationen nach dem
Ausgangsstand und trägt die Dateien hinüber. Ohne Häkchen ist es ein
Probelauf, der zurückrollt.

**Gelaufen am 11. September:** alle 62 Tabellen, 19 Konten (16 mit Passwort),
127 von 140 Dateien. Am Nachmittag war dilehi.de umgestellt — Vereinsseite,
Probeseite, Kalender, Einbindung und Sitemap sprechen mit `hmrog…`. Die `.env`
ist raus, `deploy.yml` holt Adresse und Schlüssel aus dem Projekt, `types.ts`
kommt aus dem eigenen Projekt, Lovable-Reste sind entfernt, die Anmeldung steht
auf `https://www.dilehi.de`, die tägliche Sicherung ist wieder grün.

**Abgeschlossen am 16. September:** Die Dateiablage steht in SharePoint, alle
Dateien sind drüben — auch die dreizehn grossen Scans, die nicht nach Supabase
passten. Lovable ist abgeschaltet.

**Entschieden am 11. September**, damit es nicht noch einmal aufgemacht wird:

- Es zieht alles um, Konten samt Passwort. Geht das Passwort nicht, dann alles
  ohne; dafür gibt es das Häkchen im Workflow.
- Der Mailversand bleibt für DileHi Microsoft Graph. Für eine neue
  Installation soll SMTP die Vorgabe sein.
- Erst umziehen, dann aufräumen, dann eine leere Installation probieren. Das
  Projekt `hmrog…` ist DileHis Datenbank und kann danach umbenannt werden.

### Adressen nach draußen

Kalender-Abos, Einbindungen und Sitemap zeigen auf die eigene Seite
(`/kalender/…`, `/einbindung/…`, `/sitemap.xml`). Die `.htaccess` leitet an die
Edge Functions weiter; das Ziel setzt der Build aus `VITE_SUPABASE_URL` ein
(`vite.config.ts`, `src/lib/publicAddresses.ts`). Ein Umzug der Datenbank
ändert damit nur das Ziel, nicht die Adresse im Handy eines Mitglieds.

### Dateiablage in SharePoint

Gebaut vom 11. bis 12. September (Migration `20260912090000_file_storage.sql`,
Edge Function `sharepoint-files`, Verwaltung → Erscheinungsbild → Dateiablage).
Die Dateien der Quellensammlung liegen wahlweise bei Supabase oder in
SharePoint; Titel, Epoche, Ordner und Rechte bleiben in DING.

- **Eine Stelle für Microsoft 365:** Dateiablage und Mailversand stehen im
  Erscheinungsbild nebeneinander und teilen sich die Verzeichnis-ID
  (`MS_TENANT_ID`). Anwendungs-ID und Geheimnis bleiben getrennt, es ist eine
  eigene App mit eigenen Rechten (`Sites.Selected`).
- **Anleitung in DING selbst,** im gleichen Stil wie die für den Mailversand:
  Schritt für Schritt, Werte zum Kopieren, was welche Fehlermeldung bedeutet.
  Die gemeinsamen Bausteine (`src/components/admin/anleitung/Bausteine.tsx`)
  tragen später auch den Einrichtungsassistenten.
- **Eingangskorb** (Verwaltung → Mitgliederbereich, nur bei SharePoint): Wer
  viele oder sehr grosse Scans hat, legt sie mit dem Explorer in die
  SharePoint-Website. Der Korb zeigt, was dort liegt und zu keiner Quelle
  gehört, und ordnet zu — auch im Bund, erst alles einstellen, dann ein Knopf
  für alle. Oben stehen die Quellen, deren Datei fehlt. Beim Zuordnen wandert
  die Datei nach `Quellensammlung/<Epoche>/`.
- Beim Verschieben werden auch die zwölf am Semikolon abgeschnittenen
  Dateinamen gefunden.

### Zuschaltbare Module (beschlossen am 14. September)

Alle abgeschaltet ausgeliefert. Ein Verein schaltet an, was er braucht.

- **Nachweise mit Ablaufdatum** (Modul `certificates`, abgeschaltet
  ausgeliefert; Migration `20260915090000_certificates.sql`). Arten legt
  die Verwaltung an (Gültigkeit in Monaten, Vorlauf der Erinnerung).
  Mitglieder tragen im Profil ein, die Verwaltung prüft; eine Änderung
  durch das Mitglied hebt die Prüfung auf (Trigger). Erinnerung einmal
  vor dem Ablauf und einmal danach (höchstens 30 Tage zurück) über die
  Abendzusammenfassung. Die Leitung einer Veranstaltung sieht an den
  Zusagen, wer einen am Veranstaltungsende gültigen Nachweis hat.
  Offen: Scans der Nachweise – dafür müssen die Speicherregeln von
  internal-files erst einen privaten Ordner kennen.

- **Inventar und Ausleihe** (Modul `inventory`, abgeschaltet
  ausgeliefert; Migration `20260915100000_inventory.sql`, Seite
  `/intern/inventar`). Gegenstände mit Kategorie, Anzahl, Lagerort,
  Zustand und optional Leihgabe eines Mitglieds. Reservieren für einen
  Zeitraum oder eine Veranstaltung; Ausgeben und Zurücknehmen nur durch
  die Inventarverwaltung. Ein Trigger verhindert Doppelbuchung und
  Ausleihe von Ausgesondertem; ausgegeben und nicht zurück blockiert
  auch über das Rückgabedatum hinaus. Überfällige Rückgaben meldet die
  Abendzusammenfassung einmal. Bei der Veranstaltung steht, was für sie
  reserviert ist. Offen: Fotos der Gegenstände.

### Gemeinnützigkeit

Nur wenn die Einstellung gesetzt ist, erscheinen die Bereiche dafür. Ohne sie
bleiben sie unsichtbar, nicht ausgegraut.

- **Grundlage** (Migration `20260915110000_nonprofit_deadlines.sql`):
  Abfrage im Erscheinungsbild samt Finanzamt, Steuernummer, Art und
  Datum des Bescheids, steuerbegünstigten Zwecken und ob
  Mitgliedsbeiträge abziehbar sind (§ 10b Abs. 1 Satz 8 EStG). Das
  Häkchen schaltet über einen Trigger das Modul `nonprofit`, das nicht
  in der Modulliste steht; alle Bereiche hängen per `requires` daran.
  Hinweis, bis wann der Bescheid für Zuwendungsbestätigungen reicht
  (§ 63 Abs. 5 AO). Neue Verwaltungsgruppe „Vereinsführung". Die
  Einrichtungsseite fragt noch nicht – das gehört in den
  Einrichtungsassistenten.

- **Fristen** (Modul `club_deadlines`): mit Wiederholung, Vorlauf
  und zuständiger Rolle; beim Erledigen legt ein Trigger die nächste
  an. Erinnerung einmal vor der Frist und einmal danach (bis 60 Tage)
  über die Abendzusammenfassung. Vorschläge: Steuererklärung,
  Bescheid wird zu alt, Mitgliederversammlung, Versicherung,
  Vereinsregister nach Vorstandswahl.

- **Beschlussregister** (Modul `resolutions`, Migration
  `20260915120000_resolutions.sql`, Seite `/intern/beschluesse`):
  Nummer fortlaufend je Jahr („2026/03", vergibt ein Trigger mit
  Sperre gegen Doppelvergabe, von Hand überschreibbar), Gremium,
  Wortlaut, Ausgang, Ergebnis, Sichtbarkeit (alle Mitglieder oder nur
  Vorstand), Verweis auf Abstimmung und Protokoll, „aufgehoben durch".
  Aus einer geschlossenen Abstimmung per Knopf „Als Beschluss" mit
  Titel, Datum und Ergebnis vorausgefüllt.

- **Einwilligungen** (Modul `consents`, Migration
  `20260915130000_consents.sql`): Arten pflegt die Verwaltung; „Fotos
  und Videos" (Kennung `photos`) und „Name bei Veröffentlichungen"
  kommen als Vorlage mit Hinweis auf den Widerruf. Mitglieder
  entscheiden im Profil, Ja und Nein gleich gross; bei Minderjährigen
  (aus dem Geburtsdatum) ist der Name eines Erziehungsberechtigten
  Pflicht. Jede Entscheidung landet per Trigger mit Zeitpunkt im
  Protokoll, gleiche Entscheidung noch einmal nicht. Notfallkontakte
  je Mitglied. Die Leitung einer Veranstaltung sieht bei den Zusagen,
  wer ohne Fotofreigabe ist (auch wer nie entschieden hat), wer am Tag
  der Veranstaltung minderjährig ist, und die Notfallkontakte – sonst
  niemand. Verwaltung: Übersicht, die mit „ohne Fotofreigabe" beginnt.

- **Auslagen** (Modul `expense_claims`, Migration
  `20260915140000_expense_claims.sql`, Seite `/intern/auslagen`):
  Mitglieder reichen mit Foto oder PDF des Belegs ein, die Kasse
  (`expenses.manage`, vergeben an Leitung und an alle Rollen mit
  `contributions.manage`) genehmigt oder lehnt mit Vermerk ab und
  markiert als erstattet; beide Seiten bekommen eine Benachrichtigung.
  Ein Mitglied kann den Stand nicht selbst ändern und nach der Prüfung
  nichts mehr (Trigger, Gegenprobe gemacht). Belege liegen im neuen
  privaten Bucket `receipts`, Pfad `<Mitglied>/<Zeit>_<Datei>`, lesbar
  nur für das Mitglied selbst und die Kasse – bewusst nicht in
  `internal-files`, das alle Mitglieder lesen. Pauschalen: ausgezahlte
  Ehrenamtspauschale und Übungsleiterfreibetrag je Mitglied und Jahr,
  mit Warnung, wenn eine Zahlung den Freibetrag überschreitet. Die
  Beträge (voreingestellt 960 € und 3.300 €, Stand 2026 – **bitte
  prüfen**) stehen im Erscheinungsbild unter Gemeinnützigkeit.

- **Zuwendungsbestätigungen** (Modul `donation_receipts`, Migration
  `20260915150000_donation_receipts.sql`, Seite `/intern/zuwendungen`,
  Vorlage `src/lib/zuwendung.ts`): Spenden erfassen (Mitglied oder
  jemand von aussen, Verzicht auf Erstattung als Häkchen),
  Mitgliedsbeiträge nur, wenn sie laut Einstellung abziehbar sind – dann
  auch „bezahlte Beiträge übernehmen". Ausstellen einzeln oder als
  Sammelbestätigung je Person und Kalenderjahr über
  `issue_donation_receipt`; die Datenbank lehnt ab bei fehlenden
  Angaben, zu altem Bescheid (5 bzw. 3 Jahre, § 63 Abs. 5 AO, Gegenprobe
  gemacht), fehlender Anschrift, gemischten Personen oder schon
  bestätigten Zuwendungen. Nummer `JJJJ-NNN`, alle Angaben als
  Momentaufnahme gespeichert (Doppel); bestätigte Zuwendungen sind
  gesperrt, Zurücknehmen nur mit Grund. Gedruckt nach dem amtlichen
  Muster für § 5 Abs. 1 Nr. 9 KStG über den Druckdialog des Browsers
  („Als PDF speichern"), Betrag in Buchstaben. Mitglieder sehen ihre
  Bestätigungen selbst. Neu im Erscheinungsbild: letzter
  Veranlagungszeitraum. Nicht enthalten: Sachzuwendungen (eigenes
  Muster). **Wortlaut vor dem ersten echten Einsatz mit dem aktuellen
  BMF-Muster abgleichen.**

### Mitgliederlisten einlesen

Verwaltung → Mitglieder, Knopf „Aus Datei importieren" (`src/lib/import.ts`,
`MitgliederImport.tsx`, Edge Function `import-members`). Liest .xlsx ohne
zusätzliche Bibliothek (eigener ZIP-Leser über `DecompressionStream`,
Excel-Datum und führende Nullen bei PLZ) und CSV mit Semikolon, Komma oder Tabulator
in UTF-8 oder Windows-1252; altes .xls wird mit Hinweis abgelehnt.
Spaltennamen anderer Programme („Name", „Str.", „Hausnr.", „Mitglied seit",
„Beitragsart") werden erkannt und sind änderbar; Vorlage als CSV zum
Herunterladen. Vorschau je Zeile: wird angelegt, schon da, doppelt, Fehler –
mit Hinweisen zu unlesbarem Datum oder unbekannter Mitgliedsart. Angelegt wird
in Teilen zu 25; vorhandene Konten werden übersprungen, nicht umgerollt; keine
Willkommensmail je Person, die Einladung per Mail ist wählbar (sonst „Passwort
vergessen"). **Nicht in der Oberfläche getestet** (kein Login); Leser und
Prüfung mit 18 Tests abgedeckt, die Edge Function nur über `deno check` im
Deploy-Lauf.

### Abstimmungsergebnisse als Bild

Je Abstimmung ein Knopf „Als Bild", je Thema „Ergebnisse als Bild" mit allen
geschlossenen Abstimmungen darin — bei einer Jahreshauptversammlung mit
mehreren Wahlen braucht das Protokoll genau das. Gezeichnet auf ein Canvas
(`src/lib/ergebnisBild.ts`), nicht ein Stück Seite abfotografiert: ein
Bildschirmfoto hinge an Fensterbreite, dunklem Modus und geladener Schrift.
Das Bild trägt Vereinsname, Farbe und Schriften aus dem Erscheinungsbild.
Nur geschlossene Abstimmungen, Optionen ohne Stimme mit 0, Stimmen für eine
nicht mehr gelistete Option gehen nicht verloren.

### Feinschliff vom 12. bis 15. September

- **Forum:** Brotkrumen überall, Zurück aus einem Thema führt in dessen Rubrik,
  neue Themen tragen die Markierung selbst, Archiviertes zählt nie als neu,
  Ansicht „Ungelesen" über alle Rubriken. In geschlossenen und archivierten
  Themen lassen sich eigene Beiträge nicht mehr bearbeiten
  (`20260914090000_forum_closed_threads.sql`).
- **Verwaltung:** vier Reiter, der neue heisst „Mitgliederbereich"
  (Dateiablage, Mitgliederprofil, Forum-Rubriken, Audit-Log). Beiträge sind
  eine eigene Kachel mit den Beitragsstufen direkt darin statt hinter einem
  Fenster. Erste Schritte zugeklappt.
- **Oberfläche:** eine Komponente `SeitenTitel` für alle sechs Seiten mit
  Einführung, der Abstand zwischen den Kästen einmal in `layout.ts`
  (`ZWEISPALTIG`), der Speichern-Knopf unter beiden Spalten statt über dem
  Rahmen. Der Rahmen der Führung misst nach, bis die Seite steht.
- **Umlaute geradegezogen** (`20260912150000_normalize_umlauts.sql`): Aus der
  alten Cloud kamen zerlegte Umlaute („a" plus Pünktchen). Sichtbar ist das
  nicht, aber die Suche fand die Bände nicht.

### Edge Functions und englische Bezeichner

- **Ein Weg für alle Aufrufe:** `invokeFunction()` (`src/lib/functionError.ts`)
  bricht bei jedem Fehler mit der Meldung der Funktion ab, auf Deutsch, auch
  wenn der Server nicht erreichbar ist. Ein Test hält fest, welche fünf Aufrufe
  aus gutem Grund direkt bleiben. Nebenbei aufgefallen: Austreten lassen und
  Wieder aufnehmen hatten Fehler bisher verschluckt.
- **Typprüfung für Edge Functions:** `npm run functions:check`, im Workflow bei
  jedem Push. Fand beim ersten Lauf, dass der Aufnahmeantrag die Antworten auf
  die Zusatzfragen nie gespeichert hat (zod warf das Feld `extra` weg;
  2 Anträge betroffen, nicht wiederherstellbar).
- **Englische Bezeichner, erster Durchgang: der Aufbau der Datenbank.**
  Migration `20260911180000_english_identifiers.sql`, die Zuordnung alt → neu
  steht oben in der Datei: 2 Tabellen, 21 Spalten, 10 Funktionen samt
  Rückgaben, gut 60 Richtlinien, die Werte mit Prüfregel (`kind`, `area`),
  Modulschlüssel, Aufgabenschlüssel, JSON-Schlüssel in `defaults`. Code, Edge
  Functions und Tests ziehen mit. Der zweite und dritte Durchgang stehen noch
  aus.

### Startdaten und Einrichtungsassistent

Beides am 16. September gebaut, beides für den Verein, der DING zum ersten Mal
aufsetzt.

- **Startdaten** (`20260916100000_startdaten.sql` und die beiden Rechtstexte
  daneben): Der Ausgangsstand ist ein Abzug aus DileHis Datenbank und brachte
  DileHis Kopfmenü und die drei Epochen mit — für einen fremden Verein ein Menü
  ins Leere. Jetzt: im Kopf nur die Startseite, im Fuß Impressum und
  Datenschutz mit den Seiten dahinter (Text aus `scripts/rechtstexte.mjs`, die
  veränderlichen Angaben über den Baustein „Vereinsangaben"), keine
  Kategorien, Versandweg SMTP.
  **Die Schranke:** Das geschieht nur, solange keine Rolle vergeben und kein
  Profil angelegt ist. Dieselbe Migration läuft über DileHis Datenbank, ohne
  dort etwas anzufassen; ein Test spielt genau das durch und fällt durch,
  sobald die Schranke fehlt.
- **Einrichtungsassistent** (Verwaltung → Einrichtung): Eine Liste mit Ampeln —
  Migrationen, erster Zugang, Vereinsdaten, Mailversand, öffentliche Seiten,
  Dateiablage, Push, Sicherung, Web-Adresse. Zu jedem Punkt, der nicht grün
  ist, steht der nächste Handgriff; fehlende Secrets stehen mit Namen da, nie
  mit Wert. Der Probeversand hängt gleich daneben.
  Die Auskunft kommt aus zwei Richtungen: `setup_status()` liest die Datenbank
  (auch `supabase_migrations.schema_migrations`, das PostgREST nicht
  ausliefert — daher SECURITY DEFINER mit Rechteprüfung in der ersten Zeile),
  die Edge Function `einrichtung-status` sieht in den Secrets nach. Welche
  Migrationen dieser Stand mitbringt, setzt der Build als Liste von Namen ein
  (`vite.config.ts`); die SQL-Dateien selbst bleiben aus dem ausgelieferten
  Verzeichnis heraus.
- **Einladungen bleiben nicht liegen:** `invite-member` sagt jetzt, ob die Mail
  rausging, und gibt sonst den Link zurück. Die Mitgliederverwaltung und die
  Antragsprüfung zeigen ihn mit Kopierknopf — wie die Einrichtungsseite es
  schon immer tat. Vorher stand dort „Einladung versendet", während niemand
  eine bekam, und der einmalige Link war verloren.

### Neue Prüfungen

| Test | Was er prüft |
| --- | --- |
| `ausgangsstand.test.ts` | spielt den Ausgangsstand in eine leere Datenbank (PGlite), spielt den ersten Zugang durch und exportiert das Ergebnis mit der Abfrage aus `EXPORT.md` in eine zweite leere Datenbank |
| `funktionen.test.ts` | liest jede Edge Function so, wie Deno es beim Bündeln tut, und folgt jedem relativen Import |
| `transfer.test.ts` | spielt den Umzug durch: alte Installation auf dem Ausgangsstand, Abzug in der Form von `backup-export`, Einspielen in eine neue mit Einrichtungskonto. Gegenprobe mit acht absichtlich eingebauten Fehlern, sieben erkannt; der achte war eine Prüfung, die nie anschlagen konnte, und ist raus |
| `publicAddresses.test.ts` | die Adressen, die das Programm nach draußen gibt, und die Weiterleitungen in der `.htaccess` passen zusammen |
| `funktionsrechte.test.ts` | `PUBLIC` entzogen, `search_path` gesetzt, jede Triggerfunktion hängt an einem Trigger |
| `onboarding.test.ts` | Anker, Touren, Aufgaben und Hilfetexte passen zwischen Datenbank und Markup zusammen |

Die Hilfen dazu: `src/test/hilfe/datenbank.ts` (liest den Ausgangsstand und
die Startdaten) und `src/test/hilfe/buehne.ts` (die leere Supabase-Datenbank).

`transfer.test.ts` und `transferFiles.test.ts` laufen nicht mehr mit; sie
liegen mit dem übrigen Umzugswerkzeug in [`archiv-umzug/`](archiv-umzug/).
Neu seit dem 11. September: `import.test.ts`, `auslagen.test.ts`,
`zuwendungen.test.ts`, `einwilligungen.test.ts`, `beschluesse.test.ts`,
`nachweise.test.ts`, `inventar.test.ts`, `gemeinnuetzigkeit.test.ts`,
`ergebnisBild.test.ts`, `sharePointFiles.test.ts`, `layout.test.ts`,
`forumUngelesen.test.ts`.
Am 16. September dazu: `startdaten.test.ts`, `einrichtung.test.ts` und
`setupStatus.test.ts` (auf der Bühne, mit Rechteprüfung als Gegenprobe).

---

## Fehler, auf die ich achten muss

Das sind die Fehler, die tatsächlich passiert sind, und zwar mehrmals oder
teuer. Die meisten gehören zu einer von zwei Sorten: **Prüfungen, die grün
sind, weil sie an der falschen Stelle nachsehen**, und **Einstellungen oder
Tabellen, die es gibt, die aber nie gelesen oder nie angelegt werden**.

### Werkzeug

1. **Backslashes gehen im Bash-Werkzeug verloren.** In Heredocs und in
   `node -e` wird aus `"\\n"` ein `"\n"` und daraus ein echter Umbruch. So kam
   ein kaputtes `split("` in `invite-member` und blieb zwei Tage unbemerkt.
   → Skripte mit Backslash über das Write-Werkzeug als Datei anlegen.
2. **Gerade Anführungszeichen in deutschen Texten** beenden TypeScript-Strings.
   → Im Deutschen immer „…" schreiben.
3. **Zeilenenden:** Git wandelt in CRLF um, dann greifen Muster mit `\n` nicht
   mehr. → Vor dem Vergleichen `.replace(/\r\n/g, "\n")`.

### Prüfungen, die nichts prüfen

4. **Muster, die zur Schreibweise nicht passen.** Der Abzug schreibt
   Triggerfunktionen ohne `public.`. Mein erstes Muster fand deshalb null von
   vierzehn angebunden. Vorher: Anker mit mehreren Bindestrichen wurden
   übersehen, und mehrzeilige `INSERT` galten als nicht vorhanden.
   → **Jede neue Prüfung einmal gegen den alten, kaputten Stand laufen
   lassen.** Wenn sie dort nicht anschlägt, prüft sie nichts.
5. **Leere Listen sind grün.** → Jede Prüfung über eine Liste verlangt vorher
   eine Mindestzahl an Einträgen.
6. **Eine Datei sagt, was einmal war; nur die Datenbank sagt, was ist.** Die
   Behauptung, `is_herold()` stecke in zehn Regeln, stammte aus Migrationen.
   In der Datenbank waren es null. → Bei Fragen zum Stand in der Datenbank
   nachsehen (Supabase-Zugang, lesend).
7. **Bestandsaufnahme nur aus `CREATE`, ohne `DROP`** führte zu einer
   Migration, die an einer gelöschten Funktion scheiterte. Derselbe Fehler
   steckte eine Ebene höher im Test. → In einem Durchgang und in Reihenfolge
   lesen, oder gleich `pg_proc` fragen.

### Datenbank

8. **Neue Funktionen darf `PUBLIC` ausführen**, bis jemand widerspricht. Bei
   Supabase steht der anon-Schlüssel im ausgelieferten Programm, also heisst
   `PUBLIC`: jeder Besucher. → Bei jeder neuen Funktion `REVOKE ALL … FROM
   PUBLIC` und gezielt `GRANT`.
9. **Regeln ohne `TO`** gelten für `PUBLIC`, also auch für `anon`.
10. **`IMMUTABLE` bei einer Funktion, die `CURRENT_DATE` liest**, ist falsch.
    → `STABLE`.
11. **Ein Abzug ist eine Momentaufnahme.** Vier Teile aus zwei verschiedenen
    Momenten ergeben keine lauffähige Datei. → Eine Abfrage, ein Moment.
12. **Reihenfolge im Abzug:** Fremdschlüssel kamen vor ihren Schlüsseln,
    Module vor denen, die sie voraussetzen, weil alphabetisch sortiert war.
    Listen (`text[]`) standen in JSON-Schreibweise da. → Behoben in der
    Datei, in `backup_schema_ddl()` und in der Exportabfrage. Der Rundlauftest
    in `ausgangsstand.test.ts` fängt es künftig.
13. **`backup_schema_ddl()` sieht nur `public`.** Der Trigger an `auth.users`
    fehlte deshalb: Neue Konten hätten kein Profil bekommen.
14. **Die Sicherungen der alten Datenbank** haben dieselben
    Reihenfolgefehler. Zurückgespielt würden sie scheitern.

### Supabase

15. **Der SQL-Editor führt alles in einem Zug aus.** Scheitert eine Anweisung,
    ist auch alles davor rückgängig. Dann sieht es aus, als sei etwas passiert,
    und es ist nichts passiert.
16. **„Success. No rows returned" bei `DELETE`** heisst nur, dass nichts
    zurückgegeben wurde, nicht, dass nichts gelöscht wurde.
17. **Supabases eigene GitHub-Integration und unser Ausrollen-Knopf** machen
    dieselbe Arbeit. Beide zusammen haben alte Migrationen halb eingespielt.
    → Die Integration bleibt aus.
18. **`password authentication failed`** kam von einem Passwort, das nicht
    stimmte oder nicht so im Geheimnis stand wie gedacht. Der Workflow prüft
    jetzt Länge und Umbrüche, ohne den Wert zu zeigen.
19. **`Remote migration versions not found`**: Im Verzeichnis der Datenbank
    stehen Versionen, die es im Projekt nicht mehr gibt. → Schalter
    „Verzeichnis zurücksetzen" im Ausrollen-Knopf.
20. **Die Bühne (PGlite) läuft mit allen Rechten.** Was in Supabase an Rechten
    scheitert, sieht man dort nicht.
21. **Der lesende Zugang darf `setup_needed()` nicht aufrufen.** Das ist
    richtig so und kein Fehler.

### Frische Installation

Alles, was eine Installation braucht, bevor jemand etwas eintragen kann, muss
ohne Eintrag funktionieren. Drei Fälle, an denen das nicht so war oder nicht
so ist:

22. **Web-Adresse:** Die Einrichtung brauchte sie, bevor man sie eintragen
    konnte. Jetzt gilt die Seite, von der aus aufgerufen wird.
23. **Standardrolle leer:** Das Programm nimmt dann die unterste Rolle im
    Katalog. So gewollt.
24. **Versandweg:** steht ab Werk auf Microsoft Graph. SMTP-Angaben allein
    reichen nicht, SMTP muss unter Erscheinungsbild ausgewählt werden.
    **Noch offen**, siehe unten.

### Programm

25. **30 Sekunden pro Seitenwechsel in der Tour:** Ein Scroll-Listener rief
    `scrollIntoView({behavior: "smooth"})` auf, und das löste neue
    Scroll-Ereignisse aus. → Höchstens einmal je Schritt scrollen, per
    `requestAnimationFrame` messen, bei gleichen Massen dasselbe Objekt
    zurückgeben.
26. **Die Typprüfung sieht nur `src/`.** Edge Functions fielen durch jedes
    Raster. → `funktionen.test.ts`.
27. **Eingecheckte `.env`:** Jeder Build ohne eigene Umgebungsvariablen spricht
    mit der alten DileHi-Datenbank. Für ein Produkt ist das gefährlich: Ein
    fremder Verein, der die Variablen vergisst, landet bei uns.

### Arbeitsweise

28. **Den kritisierten Weg nicht verschönern, sondern ersetzen.** „Jetzt hast
    du doch wieder den alten Weg umgesetzt" — die Diashow war modular gemacht
    statt abgeschafft.
29. **Den Nutzer nicht zum Testlauf machen.** Dreimal hintereinander ist ein
    Fehler erst im Ausrollen-Knopf aufgefallen. Seitdem läuft alles vorher
    über die Bühne.
30. **Ein Wunsch ist erst erledigt, wenn die Datenbank es zeigt.** Die Rolle
    „vorstand" sollte am 10. September weg. Sie stand am 11. noch im
    Ausgangsstand, mit allen Rechten. Aufgefallen ist das nur, weil für diese
    Datei jede Aussage noch einmal nachgesehen wurde.
31. **Ausgerollt heisst nicht: der letzte Stand.** Die Einrichtung scheiterte,
    weil der Ausrollen-Knopf um 00:48 lief und die Korrektur erst um 09:20
    kam. → Bei einem Fehler in einer Edge Function zuerst nachsehen, welche
    Fassung in Supabase steht (`get_edge_function`, `updated_at`), dann erst
    im Code suchen.
32. **supabase-js verschluckt die Fehlermeldung.** Bei einem Fehlerstatus
    steht in `error.message` nur „Edge Function returned a non-2xx status
    code", die eigentliche Auskunft steckt im Rumpf. → `readFunctionError()`
    aus `src/lib/functionError.ts`, inzwischen über `invokeFunction()`
    überall.
33. **Edge Functions wurden nicht auf Typen geprüft** (behoben am 11. September, `deno check`). `setup-first-admin` las
    `m.org_short_name`, das es in `marke()` nicht gibt; die Einladung hätte
    „undefined: Zugang einrichten" geheissen. Kein Test hat es gesehen.
34. **`set_config()` ist nicht `SET`.** Supabase gibt `postgres` einige
    geschützte Einstellungen frei (`supautils.privileged_role_allowed_configs`,
    darunter `session_replication_role`), aber nur, wenn sie als `SET`-Befehl
    kommen. Über `set_config()` hiess es im ersten Probelauf „permission
    denied". Wieder Fehler 20: Die Bühne läuft mit allen Rechten. → Vor dem
    ersten Lauf in Supabase die Rechte lesend abfragen (`has_table_privilege`,
    `pg_has_role`), nicht annehmen.
35. **Grenzen einer Ablage gelten nur beim Hochladen.** In Lovable lagen
    Dateien, die die heutigen Grenzen der Ablage nie erlaubt hätten; das neue
    Projekt lehnte sie ab. Darüber liegt die Grenze des Tarifs (kostenlos:
    50 MB je Datei, 1 GB insgesamt), die sich nicht aufheben lässt. → Vor
    einem Umzug die Grössen im Abzug gegen den Tarif des Ziels halten.
36. **Lokal grün wegen einer Datei, die es nur lokal gibt.** Nach dem
    Entfernen der `.env` liefen die Tests bei mir durch – dank `.env.local` –
    und im Build von dilehi.de scheiterten sechs („supabaseUrl is required").
    → Die Tests haben feste Platzhalter in `vitest.config.ts`. Vor einem Push,
    der Umgebung oder Konfiguration ändert, einmal ohne `.env.local` prüfen.
37. **Die Typprüfung ist kein Netz, wo der Code castet.** Nach dem Umbenennen
    in `types.ts` meldete `tsc` null Fehler – nicht weil alles passte,
    sondern weil fast jeder Zugriff auf diese Tabellen über `as never` oder
    `as unknown as { from: … }` lief. Getragen hat erst, die Typen der Hooks
    umzustellen; von dort fand `tsc` jede lesende Stelle. → Bei einer
    Umbenennung zuerst die eigenen Typen ändern, dann suchen.
38. **Tests lasen den Text des Ausgangsstands.** Nach einer Migration, die
    etwas umbenennt, hätten sie die alten Namen gesucht und gefunden. Jetzt
    fragen sie die Bühne (`installation()`, `seedRows()`, `functionSource()`
    in `src/test/hilfe/buehne.ts`), auf der alle Migrationen gelaufen sind.
    Wieder Fehler 6: Nur die Datenbank sagt, was ist.
39. **Zwei Node-Versionen in einem Workflow.** Die Prüfung in `deploy.yml`
    lief mit Node 20, der Build mit 24, mein Rechner auch mit 24. Den Tests
    fehlten unter 20 eingebautes WebSocket und `fs.globSync`; aufgefallen ist
    es beim Ausrollen der Umbenennung, nachdem die Migration schon gelaufen
    war – rund zehn Minuten passten Seite und Datenbank nicht zusammen.
    → Überall Node 24. Und beim Ausrollen erst die Seite bauen lassen, dann
    die Migration starten, wenn beides zusammengehört.
40. **Ein Semikolon im Dateinamen.** Beim Umzug hat die Speicher-Schnittstelle
    von Supabase zwölf Dateinamen am `;` abgeschnitten („Werk; Band 01.pdf"
    → „Werk"), obwohl die Adresse sauber kodiert war. Aufgefallen erst beim
    Bau der SharePoint-Ablage, weil Datei und Quelle nicht zueinander
    fanden. Der Test des Umzugs lief gegen eine nachgebaute Ablage, die das
    nicht nachbildete. → Beim Übertragen von Dateien danach die Namen im Ziel
    mit denen in der Datenbank abgleichen, nicht nur die Anzahl. Die
    Verschiebe-Aktion nach SharePoint fängt die zwölf ab.
41. **Eine Auswahlliste bekommt nicht alles.** Die Download-Adresse ist keine
    Eigenschaft der Datei, sondern eine Anmerkung an der Antwort von Graph
    (`@microsoft.graph.downloadUrl`). Wer sie in ein `$select` schreibt,
    bekommt sie nicht — ohne Fehler, ohne Hinweis. Jede Vorschau und jeder
    Download in der Quellensammlung endete mit „SharePoint hat keine
    Download-Adresse geliefert". → Bei einer fremden Schnittstelle erst ohne
    Auswahlliste sehen, was überhaupt kommt.
42. **`replace` beim Anlegen eines Ordners** ersetzt in SharePoint einen
    gleichnamigen Ordner samt Inhalt. `ensureFolder` legt jetzt ohne an.
43. **`lg:space-y-0` setzt in Tailwind auch den unteren Rand auf null** und
    gewinnt mit seinem längeren Selektor gegen `[&>*]:mb-6`. In den
    zweispaltigen Seiten hatte deshalb nur der erste Kasten Abstand. → Die
    Klassen stehen einmal in `layout.ts`, ein Test fällt gegen die alte
    Klassenkette durch.
44. **Einmal messen reicht nicht.** Der Rahmen der Führung stand neben dem
    Ziel, weil die Seite nach dem Messen noch zusammenrückte (ein Termin
    klappte auf, ein Streifen verschwand). → In den ersten Sekunden jedes
    Bild messen, danach bei jeder Grössenänderung.
45. **Zerlegte Umlaute sind unsichtbar.** „ä" als „a" plus Pünktchen sieht
    gleich aus, wird aber nicht gefunden. Aus Lovable kam beides gemischt.
    → Beim Übernehmen von Texten normalisieren (NFC), nicht beim Suchen
    herumdoktern.
46. **Der Graph Explorer wirft den Anforderungstext weg,** wenn die Methode
    danach von GET auf POST wechselt — daher der 400 „Empty Payload" beim
    Freigeben der Website. Steht jetzt in der Anleitung, mit dem
    PowerShell-Weg daneben.
47. **Ein Lovable-Rest, wo keine Anwendung steht.** 206 Pakete im
    `package-lock.json` zeigten mit ihrer `resolved`-Adresse nicht auf die
    npm-Registry, sondern auf Lovables eigenen Spiegel
    (`europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache`). Solange
    Lovable lief, fiel das niemandem auf; jede frische Installation hing
    daran. → Umgeschrieben auf `https://registry.npmjs.org/`. Beim Aufräumen
    nach einem Umzug auch dort nachsehen, wo kein Programm steht: Sperrdatei,
    Workflows, Kommentare.

---

## Wissenswertes

### Arbeitsablauf mit Git

```
auf DING arbeiten → commit → push DING
→ checkout main → merge --no-ff DING → push main → zurück auf DING
```

- **Push auf `DING`** startet die Probeseite.
- **Push auf `main`** baut dilehi.de und lädt per FTP hoch. Solange die
  Oberfläche nichts von der neuen Datenbank verlangt, ist das harmlos.
- **Lovable** pusht noch selbst nach `main` („Changes", „Work in progress").
  Vor dem Pushen also `git fetch`, der Merge ist Routine. Das endet mit der
  Stilllegung.

### Geheimnisse und Variablen

| Wo | Name | Stand |
| --- | --- | --- |
| GitHub Secrets | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` | gesetzt |
| GitHub Secrets | `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` | gesetzt, für beide Seiten |
| GitHub Variables | `SITE_URL` | `https://ding.dilehi.de`, nach dem Umzug `https://www.dilehi.de` |
| GitHub Secrets | `BACKUP_TOKEN` | für den Umzug nötig. Die Sicherung ist rot, weil `backup-export` in Lovable nie bereitgestellt wurde (404); ebenso fehlen dort `mail-test` und `sitemap` |
| Supabase Edge Functions | `SETUP_SECRET` | gesetzt |
| Supabase Edge Functions | `MS_*`, `VAPID_*`, `DIGEST_SECRET`, `BACKUP_TOKEN` | fehlen noch, siehe [`umzug.md`](umzug.md) |
| Umgebung des Rechners | `SUPABASE_ACCESS_TOKEN` | gesetzt, für Claudes lesenden Zugang |

**Was Claude nie sieht:** das Datenbankpasswort, den `service_role`-Schlüssel
und den Wert des Zugriffsschlüssels. Öffentlich sind Project URL und
anon-Schlüssel, die stehen ohnehin im ausgelieferten Programm.

### Claudes Zugang zur Datenbank

- Über `.mcp.json` (im Ordner `GitHub` und in `DileHi`, beide nicht
  versioniert) mit `--read-only`.
- Oder über die Verwaltungsschnittstelle mit dem Schlüssel aus der Umgebung,
  nur mit `read_only: true`.
- **Schreibend nur nach ausdrücklicher Zustimmung**, und dann lieber über den
  Ausrollen-Knopf, damit es im Protokoll steht.

### Eine neue Migration anlegen

1. Neue Datei nach dem Ausgangsstand, etwa
   `supabase/migrations/20260912120000_irgendwas.sql`.
2. Englische Bezeichner. Bei jeder neuen Funktion `REVOKE … FROM PUBLIC`,
   gezieltes `GRANT` und `SET search_path`.
3. `npm test` — die Bühne spielt Ausgangsstand und alle Migrationen ein.
4. Pushen, dann **Actions → Supabase ausrollen**.

Den Ausgangsstand nicht von Hand erweitern, ausser für das, was der Abzug nicht
sieht (steht am Ende der Datei, gekennzeichnet). Ein neuer Abzug ersetzt ihn
ganz; der Rundlauftest sagt, ob die Abfrage noch taugt.

### Schreibregeln

- **Code und Datenbank englisch**, ohne Mischung. Das Ziel heisst „die neue
  SAP", nicht Vereinsprojekt.
- **Oberfläche deutsch**, und zwar deutsch gedacht, nicht übersetzt. Nicht wie
  eine KI schreiben. Beispiel: „Felder mit dem Vermerk ‚fest' sind das
  Fundament", nicht „tragen die Aufnahme".
- Typografische Anführungszeichen „…".

### Wo was steht

| Datei | Inhalt |
| --- | --- |
| [`installation.md`](installation.md) | die Anleitung für einen neuen Verein |
| [`umzug.md`](umzug.md) | der Umzug aus Lovable, Schritt für Schritt |
| [`sharepoint.md`](sharepoint.md) | Dateiablage in SharePoint einrichten |
| [`standalone.md`](standalone.md) | was für andere Vereine fehlte (teilweise veraltet, siehe unten) |
| [`onboarding.md`](onboarding.md), [`module.md`](module.md) | Aufbau von Einführung und Modulen |
| [`name-ding.md`](name-ding.md) | warum DING |
| [`vuozvolc-machbarkeit.md`](vuozvolc-machbarkeit.md) | der Nachbau von vuozvolc.de als Probe für den Seitenbaukasten |
| [`machbarkeit-oeffentliche-seiten.md`](machbarkeit-oeffentliche-seiten.md) | warum der Seiteneditor ein Blockeditor wurde und kein Baukasten |
| [`datenschutz-checkliste.md`](datenschutz-checkliste.md) | was die Anwendung verarbeitet, und wo es in der Erklärung steht |
| [`../supabase/ausgangsstand/EXPORT.md`](../supabase/ausgangsstand/EXPORT.md) | die Abfrage für den Ausgangsstand |

---

## Was noch ansteht

Am 16. September Zeile für Zeile gegen den Zweig `DING` nachgesehen. Was
erledigt ist, steht jetzt oben unter „Was umgesetzt ist"; was hier steht, ist
wirklich noch offen. In Reihenfolge, nicht als Sammlung.

### 1. Was DileHi im Betrieb noch fehlt

- [ ] **Datenschutzerklärung:** Steht auf der Seite noch der Satz zur Plattform
      Lovable? Wenn ja, im Editor streichen — die Vorlage in
      `scripts/rechtstexte.mjs` ist schon angepasst. Die Erklärung nennt jetzt
      Supabase und, wo Dateien dort liegen, Microsoft 365.
- [ ] **Quellen ohne Datei:** Aus dem Umzug blieben Einträge übrig, die auf
      keine Datei zeigen. Einmal in der Datenbank zählen, was nach dem
      Verschieben nach SharePoint noch übrig ist, und über den Eingangskorb
      zuordnen oder den Eintrag bereinigen. Die Zahlen, die früher in dieser
      Datei standen, waren aus zwei verschiedenen Momenten und taugen nicht.
- [ ] **Probeversand** unter Verwaltung → Erscheinungsbild: Geht Mail über
      Microsoft 365 aus dem neuen Projekt?
- [ ] **Mails von Supabase selbst** (Bestätigung einer neuen E-Mail-Adresse)
      laufen über Supabases eigenen Versand, zwei Mails pro Stunde. Unter
      Authentication → SMTP eigene Angaben eintragen.
- [ ] **Zahlen prüfen, bevor sie zählen.** Ehrenamtspauschale 960 € und
      Übungsleiterfreibetrag 3.300 € stehen als Vorgabe im Erscheinungsbild
      (Stand 2026), und der Wortlaut der Zuwendungsbestätigung gehört vor dem
      ersten echten Einsatz gegen das aktuelle BMF-Muster gehalten.
- [ ] **Den Mitglieder-Import einmal in der Oberfläche durchspielen.** Leser
      und Prüfung haben 18 Tests, die Edge Function nur `deno check`;
      angeklickt hat den Weg noch niemand.
- [ ] **Scans der Nachweise** und **Fotos der Gegenstände** fehlen den beiden
      neuen Modulen. Beides braucht dieselbe Vorarbeit: einen Ablageort, den
      nur das Mitglied selbst und die zuständige Rolle lesen — entweder ein
      privater Ordner in `internal-files` (das heute jedes Mitglied lesen darf)
      oder ein eigener Bucket wie `receipts` bei den Auslagen.
- [ ] **Bekannte Lücke:** Wird ein Ordner der Quellensammlung gelöscht, bleiben
      die Dateien seiner Quellen liegen — in Supabase wie in SharePoint.

### 2. Die leere Installation — daran arbeiten wir jetzt

DING ist ein Produkt, und geprüft ist es erst, wenn ein fremder Verein es ohne
uns aufsetzen kann. Der Probelauf dafür ist das zweite Supabase-Projekt
(`nyloyirwppbetrkkyncw`, seit dem 11. September leer). Startdaten und
Einrichtungsassistent stehen seit dem 16. September — als Nächstes kommt der
Lauf selbst.

- [ ] **DING streng nach [`installation.md`](installation.md) in das leere
      Projekt installieren.** Das ist der Probelauf der Anleitung: Was dabei
      hakt, ist ein Fehler in der Anleitung, nicht im Kopf dessen, der sie
      liest.
- [ ] **Umsehen, als wäre man ein fremder Verein:** Wo klingt es noch nach uns?
      Jetzt mit einer leeren Installation zu machen, nicht an DileHis Daten.
- [ ] **Probeseite hinter ein Passwort** (Verzeichnisschutz bei gn2) und als
      Vorführsystem nutzen.
- [ ] **Vuozvolc-Nachbau:** Die drei Bausteine und die Schrift Antic Didone
      sind da, die Seiten selbst noch nicht.
      ([`vuozvolc-machbarkeit.md`](vuozvolc-machbarkeit.md))

### 3. Module, die noch fehlen

- [ ] **Modul „Sitzungen" mit Protokoll** (Idee vom 14. September):
      Tagesordnung, Anwesenheit samt Stellvertretungen und Beschlussfähigkeit,
      verknüpfte Abstimmungen, Freigabe durch Vorsitz und Protokollführung,
      Protokoll als PDF. **Gewünscht ist direktes Speech-to-Text**
      (14. September): ein mitlaufendes Transkript während der Sitzung statt
      Aufnahme und späterem Upload. Anbieter mit EU-Verarbeitung vergleichen
      (Speechmatics, Azure Speech, AssemblyAI), vorher an einer echten Sitzung.
      Einwilligung und Auftragsverarbeitung klären; Tonspuren nach Freigabe
      automatisch löschen, Transkript nach Frist. Ein eigener Discord-Bot erst
      später und nur als Zusatz, er bräuchte einen dauerhaft laufenden Rechner.
      Rückfallebene bleibt der zuerst gedachte Weg: Aufnahme mit dem
      Discord-Bot Craig (eine Tonspur je Person), Upload nach SharePoint,
      Transkript beim Anbieter, Rückmeldung per Webhook statt langer Laufzeit.
      Das Beschlussregister, die Abstimmungen und das Ergebnisbild sind die
      Hälfte der Arbeit und stehen schon.

### 4. Aufräumen, wenn Luft ist

- [ ] **Englische Bezeichner, zweiter Durchgang: Werte in den Inhalten.**
      Mitgliedsarten (`aktiv`, `foerder`), Beitragsintervall, Beitragsmodell
      (`fest`), SEO-Typ, Dokumentkategorien (`satzung`, `vorstand`,
      `vereinsshirts` — die stehen sogar in den Speicher-Richtlinien),
      Schlüssel der Touren und Schritte, Anker im Markup, `pdf_texts.key`, die
      Namen der Seitenbausteine und ihrer Felder im Editor-Inhalt
      (`Textabschnitt`, `inhalt`, `ueberschrift`). Braucht Datenmigrationen
      über DileHis Inhalte, deshalb getrennt. Dazu die Richtlinien in `storage`
      mit deutschem Namen.
- [ ] **Dritter Durchgang: der Code selbst.** Rund 300 deutsche Namen im
      TypeScript (`modulAn`, `nurAktive`, `meldung().titel`, `baueMail()` mit
      `betreff`, `useBeitragsstufen`, `MenuBereich` …), Dateinamen wie
      `Einrichtung.tsx`, `ErsteSchritte.tsx`, `buehne.ts`, die Testnamen, die
      Schlüssel im Abzug von `backup-export` (`tabellen`, `zeilen`). Die neuen
      Seiten `Auslagen.tsx`, `Beschluesse.tsx`, `Inventar.tsx`,
      `Zuwendungen.tsx` kommen dazu. Rein mechanisch, die Typprüfung trägt.
- [ ] [`standalone.md`](standalone.md) nachziehen: Dort steht die
      Installationsroutine noch als „nicht begonnen" und `is_herold()` noch als
      offen. Beides stimmt nicht mehr.
- [ ] Die Actions melden, dass Node 20 ausläuft. Harmlos, die Tests laufen
      schon mit Node 24. Irgendwann `actions/checkout` und `actions/setup-node`
      von `v4` auf die nächste Hauptversion heben.
- [ ] `DING` als Stamm, `main` als Zweig der DileHi-Installation. Kein
      dauerhafter Fork: Was DileHi-eigen ist, gehört in die Datenbank, nicht in
      einen eigenen Zweig.

### Und was jetzt?

Startdaten und Einrichtungsassistent stehen. Damit ist der nächste Schritt der
Probelauf selbst, und zwar streng nach [`installation.md`](installation.md):

1. **DING in das leere Projekt `nyloyirwppbetrkkyncw` installieren.** Nichts
   abkürzen, nichts „weil ich weiss, wie es geht" überspringen. Was hakt, ist
   ein Fehler in der Anleitung.
2. **Den Assistenten dabei mitlaufen lassen.** Er sollte am Ende grün sein —
   und wo er etwas Falsches sagt, ist das ein Fehler in ihm.
3. **Mit fremden Augen umsehen:** Wo klingt es noch nach DileHi?

Danach die Probeseite hinter ein Passwort und der Vuozvolc-Nachbau. Das Modul
„Sitzungen" ist das grösste offene Stück und das interessanteste, aber es macht
DING nicht installierbarer. Es kommt danach.
