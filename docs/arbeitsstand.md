# Arbeitsstand DING

Stand: 11. September 2026, nachmittags. DileHi ist umgezogen, Lovable
wird abgeschaltet.

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
| Alte Datenbank | Lovable-Cloud, Kennung `sstplyhfebexeyqehsvv` — nicht mehr in Gebrauch, wird abgeschaltet |
| Probeseite | `ding.dilehi.de` — seit 11. September leer. Später die Testinstallation gegen das Projekt DING, gebaut von Hand über `probeseite.yml` |
| Vereinsseite | `www.dilehi.de` — baut aus `main`, spricht seit 11. September mit dem eigenen Projekt |
| Plan | DileHi ist umgezogen ([`umzug.md`](umzug.md)). Jetzt aufräumen, dann eine leere Installation ausprobieren |
| Tests | 28 Dateien, 266 Prüfungen, alle grün |

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

1. Wenn dilehi.de aufgeräumt und DING fertig ist: ein zweites
   Supabase-Projekt anlegen (der kostenlose Tarif erlaubt zwei) und DING dort
   streng nach [`installation.md`](installation.md) installieren. Das ist der
   Probelauf der Anleitung.
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

### Adressen nach draußen

Kalender-Abos, Einbindungen und Sitemap zeigen auf die eigene Seite
(`/kalender/…`, `/einbindung/…`, `/sitemap.xml`). Die `.htaccess` leitet an die
Edge Functions weiter; das Ziel setzt der Build aus `VITE_SUPABASE_URL` ein
(`vite.config.ts`, `src/lib/publicAddresses.ts`). Ein Umzug der Datenbank
ändert damit nur das Ziel, nicht die Adresse im Handy eines Mitglieds.

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
| [`standalone.md`](standalone.md) | was für andere Vereine fehlte (teilweise veraltet, siehe unten) |
| [`onboarding.md`](onboarding.md), [`module.md`](module.md) | Aufbau von Einführung und Modulen |
| [`name-ding.md`](name-ding.md) | warum DING |
| [`vuozvolc-machbarkeit.md`](vuozvolc-machbarkeit.md) | der Nachbau von vuozvolc.de als Probe für den Seitenbaukasten |
| [`datenschutz-checkliste.md`](datenschutz-checkliste.md) | was die Anwendung verarbeitet, und wo es in der Erklärung steht |
| [`../supabase/ausgangsstand/EXPORT.md`](../supabase/ausgangsstand/EXPORT.md) | die Abfrage für den Ausgangsstand |

---

## Was noch ansteht

### 1. Probeseite in Betrieb nehmen — erledigt

- [x] https für `ding.dilehi.de`, `SITE_URL` gesetzt, Supabase ausgerollt
      (alle drei Migrationen stehen), erster Zugang angelegt.
- [ ] Umsehen, als wäre man ein fremder Verein: Wo klingt es noch nach uns?
      Kommt nach dem Umzug, dann mit einer leeren Installation.

### 2. Entschieden am 11. September

- **Es zieht alles um**, Konten samt Passwort. Geht das Passwort nicht, dann
  alles ohne; dafür gibt es das Häkchen im Workflow.
- **Mailversand bleibt Microsoft Graph** für DileHi. Für eine neue
  Installation soll SMTP die Vorgabe sein (siehe 4).
- **Erst umziehen, dann aufräumen, dann eine leere Installation probieren.**
  Das Projekt `hmrog…` wird DileHis Datenbank und kann danach umbenannt
  werden.

### 3. Der Umzug

Schritt für Schritt in [`umzug.md`](umzug.md). **Am 11. September gelaufen:**
alle 62 Tabellen, 19 Konten (16 mit Passwort), 127 von 140 Dateien.

- [ ] **13 Dateien fehlen**, alle aus der Quellensammlung (Spätmittelalter,
      eine Erster Weltkrieg), 50 bis 466 MB, zusammen gut 2 GB. Der kostenlose
      Supabase-Tarif erlaubt höchstens 50 MB je Datei und 1 GB insgesamt;
      belegt sind schon 852 MB. Entweder Pro-Tarif und dann „Umzug aus
      Lovable" mit „nur Dateien", oder die Scans woanders ablegen und in der
      Quellensammlung verlinken (`sources.url`). **Bis das geklärt ist, Lovable
      nicht abschalten** – dort liegen sie noch.
- [ ] Weitere 10 Einträge der Quellensammlung zeigen auf Dateien, die schon
      in Lovable nicht in der Ablage lagen. Vermutlich Hochladen, die an der
      25-MB-Grenze gescheitert sind, während der Eintrag trotzdem angelegt
      wurde. Prüfen, ob die Quellensammlung das so zulässt.

**dilehi.de ist umgestellt** (11. September, nachmittags): Vereinsseite,
Probeseite, Kalender, Einbindung und Sitemap sprechen mit `hmrog…`. Die
`.env` ist raus, `deploy.yml` holt Adresse und Schlüssel aus dem Projekt,
`types.ts` kommt aus dem eigenen Projekt, Lovable-Reste sind entfernt, die
Anmeldung steht auf `https://www.dilehi.de`, die tägliche Sicherung ist
wieder grün.

Offen:

- [ ] **Lovable abschalten** (Eric): Verbindung zu GitHub trennen, Projekt
      stilllegen. Die 13 grossen Dateien liegen zusätzlich lokal bei Eric.
- [ ] **Datenschutzerklärung** auf der Seite: den Satz zur Plattform Lovable
      im Editor streichen (die Vorlage in `scripts/rechtstexte.mjs` ist schon
      angepasst).
- [ ] **Probeversand** unter Verwaltung → Erscheinungsbild: Geht Mail über
      Microsoft 365 aus dem neuen Projekt?
- [ ] **Mails von Supabase selbst** (Bestätigung einer neuen E-Mail-Adresse)
      laufen über Supabases eigenen Versand, zwei Mails pro Stunde. Unter
      Authentication → SMTP eigene Angaben eintragen.
- [ ] **Quellensammlung**: 761 der 852 MB im Speicher sind ihre Dateien.
      Kandidat für eine Ablage in SharePoint über Microsoft Graph, siehe
      Gespräch vom 11. September.

### 4. Danach

- [ ] **Startdaten für eine neue Installation:** im Kopfmenü nur die
      Startseite, im Fuß Impressum und Datenschutz, beide aus den Angaben
      unter Erscheinungsbild erzeugt statt ins Leere. Keine Epochen als
      Seitenkategorien. Versand ab Werk SMTP; ist SMTP nicht eingerichtet,
      sagt die Verwaltung das deutlich, und die Einladungslinks stehen zum
      Weitergeben da wie bei der Einrichtung. Als Migration mit Test – aber
      so, dass sie beim Wiederholen im Umzug DileHis Menü nicht anfasst.
- [x] Edge Functions werden über `invokeFunction()` aufgerufen (`src/lib/functionError.ts`): bricht bei jedem Fehler mit der Meldung der Funktion ab, auf Deutsch, auch wenn der Server nicht erreichbar ist. Ein Test hält fest, welche fünf Aufrufe aus gutem Grund direkt bleiben. Nebenbei: Austreten lassen und Wieder aufnehmen haben Fehler bisher verschluckt.
- [x] Edge Functions auf Typen prüfen lassen: `npm run functions:check`, im Workflow bei jedem Push. Fand beim ersten Lauf, dass der Aufnahmeantrag die Antworten auf die Zusatzfragen nie gespeichert hat (zod warf das Feld `extra` weg; 2 Anträge betroffen, nicht wiederherstellbar).
- [x] **Englische Bezeichner, erster Durchgang: der Aufbau der Datenbank.**
      Migration `20260911180000_english_identifiers.sql`, die Zuordnung alt →
      neu steht oben in der Datei: 2 Tabellen, 21 Spalten, 10 Funktionen samt
      Rückgaben, gut 60 Richtlinien, die Werte mit Prüfregel (`kind`, `area`),
      Modulschlüssel, Aufgabenschlüssel, JSON-Schlüssel in `defaults`. Code,
      Edge Functions und Tests ziehen mit.
- [ ] **Zweiter Durchgang: Werte in den Inhalten.** Mitgliedsarten (`aktiv`,
      `foerder`), Beitragsintervall, Beitragsmodell (`fest`), SEO-Typ,
      Dokumentkategorien (`satzung`, `vorstand`, `vereinsshirts` – die stehen
      sogar in den Speicher-Richtlinien), Schlüssel der Touren und Schritte,
      Anker im Markup, `pdf_texts.key`, die Namen der Seitenbausteine und ihrer
      Felder im Editor-Inhalt (`Textabschnitt`, `inhalt`, `ueberschrift`). Braucht
      Datenmigrationen über DileHis Inhalte, deshalb getrennt. Dazu die
      Richtlinien in `storage` mit deutschem Namen.
- [ ] **Dritter Durchgang: der Code selbst.** Rund 300 deutsche Namen im
      TypeScript (`modulAn`, `nurAktive`, `meldung().titel`, `baueMail()`
      mit `betreff`, `useBeitragsstufen`, `MenuBereich` …), Dateinamen wie
      `Einrichtung.tsx`, `ErsteSchritte.tsx`, `buehne.ts`, die Testnamen,
      die Schlüssel im Abzug von `backup-export` (`tabellen`, `zeilen`).
      Rein mechanisch, die Typprüfung trägt dabei.
- [ ] **Vuozvolc-Nachbau:** Die drei Bausteine und die Schrift Antic Didone
      sind da, die Seiten selbst noch nicht.
- [ ] [`standalone.md`](standalone.md) nachziehen: Dort steht die
      Installationsroutine noch als „nicht begonnen", und `is_herold()` noch
      als offen.
- [ ] Die Actions melden, dass Node 20 ausläuft. Harmlos, sie laufen schon mit
      Node 24. Irgendwann `actions/checkout` und `actions/setup-node` auf die
      nächste Hauptversion heben.
- [ ] `DING` als Stamm, `main` als Zweig der DileHi-Installation. Kein
      dauerhafter Fork: Was DileHi-eigen ist, gehört in die Datenbank, nicht
      in einen eigenen Zweig.
