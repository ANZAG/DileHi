# Der Probelauf: DING einmal aufsetzen wie ein fremder Verein

DING ist erst dann ein Produkt, wenn jemand es ohne uns aufsetzen kann.
Behaupten lässt sich das nicht — es muss einmal jemand tun. Dieser Zettel sagt,
wie wir das machen und was dabei herauskommen soll.

**Das Ziel ist nicht eine laufende Installation.** Die ist der Nebeneffekt. Das
Ziel ist die Liste der Stellen, an denen [`installation.md`](installation.md)
nicht reicht.

---

## Die Regeln

1. **Nichts abkürzen.** Kein „das weiss ich schon", kein Griff in den SQL-Editor,
   keine Abkürzung über die Kommandozeile. Was die Anleitung nicht sagt, wird
   nicht getan.
2. **Jeden Stolperstein sofort aufschreiben**, auch den kleinen: eine Beschriftung,
   die anders heisst als in der Anleitung; ein Knopf, der woanders sitzt; ein
   Wort, das man nachschlagen muss. Genau die kosten einen fremden Verein den
   Abend, nicht die grossen Fehler.
3. **Was hakt, ist ein Fehler in der Anleitung** — nicht im Kopf dessen, der sie
   liest. Auch dann, wenn wir beim Lesen genau wissen, was gemeint war.
4. **Die Zeit mitschreiben.** Die Anleitung verspricht „gut eine Stunde". Ob das
   stimmt, ist selbst ein Ergebnis.

## Was vorher dasteht

| | |
| --- | --- |
| Datenbank | Supabase-Projekt **DING**, Kennung `nyloyirwppbetrkkyncw`, Frankfurt, leer seit 11. September |
| Programmstand | Der Zweig `DING`, nachdem die Startdaten und der Einrichtungsassistent gemergt sind |
| Website | `ding.dilehi.de`, danach hinter einem Verzeichnisschutz bei gn2 |

Was Eric dafür bereithalten muss:

- [ ] **Das Datenbank-Passwort des Projekts DING.** Es wurde beim Anlegen am
      11. September vergeben und ist danach nicht mehr einsehbar. Liegt es
      nicht vor: in Supabase unter *Settings → Database* zurücksetzen. Das ist
      Schritt 1 der Anleitung und gehört zum Probelauf dazu.
- [ ] **Einen Zugriffsschlüssel** des Supabase-Kontos (*Account → Access Tokens*).
      Der vorhandene tut es auch — er gehört zum Konto, nicht zum Projekt.
- [ ] **Ein Geheimnis für `SETUP_SECRET`**, irgendein langer Text.
- [ ] **Kein SMTP.** Beim ersten Durchgang bewusst weglassen: Dann läuft genau
      der Fall, für den der Einladungslink gebaut ist, und wir sehen, ob ein
      Verein ohne eigenen Mailserver durchkommt. Im zweiten Durchgang gerne mit.

## Warum eine Kopie des Projekts

Ein fremder Verein hat ein eigenes GitHub-Projekt mit eigenen Geheimnissen. Wir
haben eines — und darin stehen die Zugänge von DileHi. Der Ausrollen-Knopf in
diesem Projekt zeigt auf DileHis Datenbank, nicht auf die leere.

Deshalb bekommt der Probelauf eine eigene Kopie. Das ist keine Umständlichkeit,
sondern der Weg selbst: Wer DING aufsetzt, fängt genau hier an.

So entsteht sie — ein neues, **privates** Repository bei GitHub anlegen (etwa
`DING-Probe`), dann:

```
git clone https://github.com/ANZAG/DileHi.git ding-probe
cd ding-probe
git checkout DING
git remote set-url origin https://github.com/<konto>/DING-Probe.git
git push -u origin DING:main
```

Der Verlauf von DileHi kommt dabei mit. Für den Probelauf ist das egal; für
eine Weitergabe an einen echten Verein wäre es das nicht — dann ein Repository
ohne Verlauf (`git checkout --orphan`).

## Der Durchgang

Ab hier gilt [`installation.md`](installation.md), Schritt für Schritt. Was wir
dabei besonders ansehen:

| Schritt | Worauf zu achten ist |
| --- | --- |
| 1. Datenbank anlegen | Das Projekt steht schon. Trotzdem lesen: Stimmt, was die Anleitung über Region, Passwort und die beiden Werte sagt? |
| 2. Zugänge für den Ausrollen-Knopf | Die drei Geheimnisse und `SITE_URL` in der **Kopie**, nicht hier. `SITE_URL` ist `https://ding.dilehi.de` |
| 3. Geheimnisse hinterlegen | Nur `SETUP_SECRET`. Sagt die Verwaltung später deutlich, dass der Rest fehlt? Das ist die Nagelprobe für den Einrichtungsassistenten |
| 4. Alles ausrollen | Läuft der Ausgangsstand samt aller Migrationen in einer leeren Datenbank durch? Die Bühne sagt ja — hier zählt Supabase mit seinen Rechten (Fehler 20 und 34 im Arbeitsstand) |
| 5. Website veröffentlichen | Die Anleitung nennt Netlify oder Vercel. Wir nehmen `ding.dilehi.de` über das `deploy.yml` der Kopie (`ZIEL: /ding.dilehi.de/`) — **das ist eine Abweichung**, und was sie verdeckt, gehört notiert. Seit dem 17. September wenigstens dieselbe Datei, die auch ein fremder Verein bekommt |
| 6. Ersten Zugang anlegen | Ohne Mailversand muss der Einladungslink auf der Seite stehen. Tut er das? |
| Danach | Die Kachel **Einrichtung** aufrufen: Sagt sie die Wahrheit? Jeder Punkt, der grün ist, obwohl etwas fehlt, ist ein Fehler im Assistenten |

## Was wir schon wissen

Drei Stellen, an denen die Kopie nicht stimmt, bevor jemand sie anfasst. Sie
gehören in den Probelauf und danach in die Anleitung:

- **Der Deploy-Job in `.github/workflows/deploy.yml` lädt per FTP nach
  dilehi.de.** In einer fremden Kopie ohne unsere FTP-Geheimnisse schlägt er
  fehl, sobald jemand auf `main` pusht. Ein Verein, der Netlify nimmt, braucht
  ihn gar nicht. Siehe „Der mitgelieferte Ausrollen-Knopf" in
  [`installation.md`](installation.md).
- **`index.html` und `public/robots.txt`** tragen die Adresse fest. Steht in der
  Anleitung, Schritt 5 — der Probelauf zeigt, ob der Satz reicht.
- **Die Rollen im Ausgangsstand heissen `officiatus_1`, `officiatus_2`,
  `herold`, `schatzmeister`.** Das ist DileHis Sprache. Umbenennen geht in der
  Verwaltung, aber ein fremder Verein sieht es als Erstes — notieren, ob es
  stört.

## Gefunden, bevor der Lauf begann

Die Kopie anzulegen war schon der erste Teil des Probelaufs — drei Stellen sind
dabei aufgefallen, ohne dass jemand eine Datenbank angefasst hätte:

1. **Der Job `deploy` in `.github/workflows/deploy.yml`** lädt per FTP nach
   dilehi.de. In der Kopie war er zunächst raus; übrig blieb die Prüfung als
   eigene Datei `pruefen.yml`. Für einen fremden Verein steht der Hinweis in
   [`installation.md`](installation.md), Schritt 5.

   *Nachtrag vom 17. September:* Die Kopie hat `deploy.yml` wieder — mit
   `ZIEL: /ding.dilehi.de/`, und damit baut sie `ding.dilehi.de` genau so, wie
   ein fremder Verein seine Seite bauen würde. `pruefen.yml` ist dafür weg: Sie
   lief Schritt für Schritt dasselbe wie der Job `seo-checks` in `deploy.yml`
   und bei denselben Anlässen, jeder Push prüfte also doppelt. Die Warnung
   „ACHTUNG, ZIEL PRÜFEN" steht jetzt im Kopf beider Dateien.
2. **`probeseite.yml`** gehört zu `ding.dilehi.de` und lädt ebenfalls auf
   unseren Webspace. In einer fremden Installation hat sie nichts zu suchen —
   in der Kopie ist sie gelöscht. *Seit dem 17. September auch in `DileHi`:*
   Die Probeseite baut aus ihrem eigenen Repository, zwei Wege in dasselbe
   Verzeichnis braucht niemand.
3. **`__pycache__/nulcpython-314.pyc`** lag im Verzeichnis und wurde
   mitgeliefert. Ein Python-Rest, der nie dorthin gehörte; raus, und
   `.gitignore` kennt ihn jetzt.

Die ersten beiden sind derselbe Fehler in zwei Gewändern: **Was zu DileHis
Betrieb gehört, wird mit ausgeliefert.** Vor einer Weitergabe an einen echten
Verein gehört die Liste der Workflows einmal durchgesehen — `backup.yml` und
`digest.yml` bleiben, sie sind für jeden Verein; alles mit FTP oder
`dilehi.de` darin nicht.

## Schritt 4, erster Knopfdruck

**Der Ausrollen-Knopf begrüsst einen neuen Verein mit einer Fehlermeldung.**
Der erste Schritt „Datenbank ansehen" fragt die Datenbank nach ihrem Stand und
liest dabei `supabase_migrations.schema_migrations` — das Verzeichnis der
eingespielten Migrationen. Das legt der Supabase-CLI aber erst beim ersten
Einspielen an. In einem eben erstellten Projekt gibt es das Schema noch nicht,
und statt des Stands stand in der Zusammenfassung:

```
ERROR: 42P01: relation "supabase_migrations.schema_migrations" does not exist
```

Nicht schlimm — der Rest lief durch —, aber es ist das Erste, was jemand sieht,
der zum ersten Mal auf den Knopf drückt. Und es ist kein Randfall, sondern der
Normalfall: **Jede neue Installation trifft es.**

Behoben: zwei Abfragen statt einer, die zweite nur, wenn es das Verzeichnis
gibt. Der Schritt „Verzeichnis zurücksetzen" hatte denselben Fehler und steigt
jetzt mit einem Satz aus, statt zu scheitern. Und die Zusammenfassung zeigt
keinen JSON-Block mehr, sondern eine Tabelle: Tabellen, Konten, Ablagen,
Verzeichnis. Durchgespielt gegen drei Antworten (leeres Projekt, eingerichtetes
Projekt, Datenbank antwortet nicht).

Wieder Fehler 20 aus dem Arbeitsstand, in neuem Gewand: **Was auf der Bühne
nicht vorkommt, sieht man dort nicht.** Die Bühne legt `schema_migrations`
selbst an — ein frisches Supabase-Projekt hat es nicht.

Zweiter Lauf, jetzt mit Tabelle statt Fehlermeldung:

| | |
| --- | --- |
| Tabellen | 76 |
| Konten | 0 |
| Ablagen | 5 |
| Verzeichnis der Migrationen | 19 Einträge, von 00000000000000 bis 20260916110000 |

**Damit ist die grösste Unbekannte weg:** Der Ausgangsstand und alle achtzehn
Migrationen laufen in einem echten, leeren Supabase-Projekt durch — mit den
Rechten, die ein Projekt dort wirklich hat, nicht mit denen der Bühne.

Dabei noch etwas aufgefallen: **Die Zusammenfassung schwieg über das, was
nicht lief.** Der Schritt „Anmeldung einstellen" überspringt sich, wenn die
Variable `SITE_URL` fehlt — still. Gemerkt hätte man es erst, wenn der erste
Einladungslink auf `localhost:3000` zeigt; genau dieser Fall steht in der
Anleitung unter „Wenn etwas klemmt". Jetzt sagt die Zusammenfassung in beiden
Fällen, woran man ist.

## Schritt 3, und der Fund, den kein Test findet

**`SETUP_SECRET` lag bei GitHub statt bei Supabase.** Beides heisst „Secrets",
beides steht in der Anleitung, zwei Schritte auseinander — und niemand sagt
etwas, wenn man es am falschen Ort ablegt: Der Ausrollen-Knopf braucht es
nicht, und die Edge Function findet es nicht. Der erste Zugang wäre mit
„Nicht möglich" gescheitert, und die Suche hätte beim Geheimnis selbst
angefangen, nicht beim Ort.

Das ist der Fund, für den ein Probelauf da ist: Kein Test findet ihn, keine
Prüfung schlägt an, die Anleitung ist nicht falsch — sie ist nur nicht
deutlich genug. Jetzt tragen die beiden Schritte den Ort im Titel („bei
GitHub", „bei Supabase"), und ein Kasten in Schritt 2 sagt, dass zwei Orte
denselben Namen tragen.

Nebenbei die erste Bestätigung für den Einrichtungsassistenten: **Er hätte es
gesagt.** `SETUP_SECRET` fehlt in Supabase → der Schritt „Erster Zugang" führt
den Namen unter den fehlenden Geheimnissen auf. Zu sehen ist das aber erst,
wenn die Website steht — also nach Schritt 5.

## Schritt 5, und was der erste Blick zeigte

Die Website stand, der erste Zugang hat funktioniert — und dann stand Eric vor
einem leeren Mitgliederbereich. Genau der Fund, für den ein Probelauf da ist:
Die Technik lief, aber niemand sagte, was jetzt zu tun ist.

Daraus wurde der geführte Einrichtungsprozess (sieben Schritte, siehe
[`arbeitsstand.md`](arbeitsstand.md)). Und beim Umsehen mit fremden Augen kam
der Rest: Rollennamen aus unserer Ordnung („Officiatus", „Herold"), DileHis
Name im Reiter, unser Wappen als Favicon, ein leeres Forum, eine leere
Startseite, Dokumentablagen mit „Vereinsshirts", und überall „Verein" —
obwohl eine Interessengemeinschaft keiner ist.

**Merksatz für den zweiten Durchgang:** Was in der Datenbank steht, sieht man
beim Ausrollen. Was im Programm steht, sieht man erst, wenn man die Seite
aufmacht und so tut, als gehöre sie einem anderen.

## Der Fund vom 17. September: gebaut, aber nicht ausgerollt

Eric sah die Änderungen nicht — den geführten Durchlauf sogar noch nie. Drei
Gründe, keiner davon im Programm:

1. **Die Probeseite wurde aus dem falschen Zweig gebaut.** „Probeseite →
   ausrollen" nimmt den Zweig, auf dem man den Knopf drückt. Gedrückt wurde er
   auf `DING` — und dort endet der Stand beim Merge des ersten Pull Requests.
   Alles danach lag auf dem Arbeitszweig. **Merksatz:** Der Knopf baut nicht
   „das Neueste", sondern den Zweig, den man auswählt.
2. **Die Datenbank war voraus, das Programm hinterher.** „Supabase ausrollen"
   lief im Probeprojekt mit dem neuesten Stand, die Website nicht. Beides
   gehört zusammen; künftig nacheinander und in dieser Reihenfolge:
   erst ausrollen, dann bauen.
3. **Der eigene Deploy der Probeinstallation zielte auf die echte Seite.**
   Die Kopie des Repos brachte `deploy.yml` mit, und dort stand `/dilehi.de/`
   als Ziel. Gescheitert ist er nur, weil die FTP-Geheimnisse dort fehlen —
   sonst hätte die Probeinstallation die Vereinsseite überschrieben. Beim
   Kopieren eines Repos gehören die Ziele als Erstes geprüft.

Dazu ein echter Fehler im Programm: Die Migration hakte den Durchlauf für jede
Installation ab, in der ein Vereinsname stand und eine Rolle vergeben war —
also auch für eine frische. Er war beendet, bevor ihn jemand gesehen hat, und
der Knopf dorthin hing an derselben Bedingung. Behoben: Zurückgesetzt wird,
wo niemand je einen Schritt angeklickt hat und höchstens ein Profil existiert;
und der Knopf „Durchlauf noch einmal" steht immer da.

## Der zweite Blick, 17. September: drei Meldungen, vier Fehler

Eric hat gezielt nachgesehen. Jede der drei Meldungen war richtig, und hinter
einer steckte mehr, als sie sagte.

**„Wo stelle ich ein, ob ich Verein, e. V. oder IG bin?"** Nirgends. Die Frage
stand nur im ersten Schritt des geführten Durchlaufs — und der ging bei ihm
nie auf. Damit war die Einstellung, an der die ganze Installation hängt, für
ihn unerreichbar. Jetzt steht sie unter Erscheinungsbild ganz oben, und der
Durchlauf zeigt dieselbe Maske. **Merksatz:** Eine Einstellung, die es nur in
einem Ablauf gibt, gibt es nicht — Abläufe bricht man ab.

Beim Einbauen fiel der nächste auf: Die Maske lädt ihre Zeile mit `select("*")`
und schrieb den ganzen Entwurf zurück, also auch Spalten, die sie gar nicht
zeigt. Ein Klick auf „Speichern" hätte die Organisationsform und den Stand des
Durchlaufs auf den Stand beim Öffnen der Seite zurückgedreht. **Eine Maske
speichert, was sie zeigt.**

**„Die Kategorieknöpfe aktualisieren sich erst beim Neuladen."** Zwei
Zwischenspeicher übereinander: der Merker im Baukasten (60 Sekunden) und die
Abfrage in `useKategorien` (fünf Minuten). Die Verwaltung leerte den ersten und
frischte ihre eigene Liste auf — von der zweiten wusste sie nichts, weil deren
Schlüssel nur in der Datei daneben stand. **Ein Schlüssel, der an zwei Stellen
abgeschrieben wird, ist so lange richtig, bis jemand einen davon ändert.**

**„Das Favicon ist immer noch unseres."** Am 16. September war nur `index.html`
neutral gemacht und ein SVG dazugelegt worden; der Arbeitsstand behauptete
trotzdem, das Zeichen sei neutral. Im Verzeichnis lagen weiter unsere
`favicon.ico` — die jeder Browser von sich aus holt, ganz ohne `index.html` —,
`apple-touch-icon.png`, die drei Symbole des Manifests, unser Vereinsname *im*
Manifest und eine `llms.txt`, die Sprachmodellen unsere Vereinsgeschichte
erzählte. **Was im Markup steht, sieht man beim Lesen; was im Verzeichnis
liegt, sieht man erst, wenn man nachsieht.**

## Der dritte Blick: die Kleinigkeiten, die es nicht sind

**„Braucht eine IG Arten von Mitgliedschaften? Beitragseinzug im Profil ist
weiter vorhanden."** Beides stimmte. Das Profil kannte die Module nicht: Bei
einer Interessengemeinschaft ist „Beiträge" ab Werk aus, im Profil stand
trotzdem ein Feld „Beitragseinzug, jährlich oder halbjährlich". **Ein Feld, das
nach etwas fragt, das es nicht gibt, ist schlimmer als keines: Wer es ausfüllt,
glaubt, es passiere etwas damit.** Jetzt entscheidet
`src/lib/profilabschnitte.ts`, was dort steht — und die Art der Mitgliedschaft
erscheint nur, wo es mehr als eine gibt.

**„Die Untertitel in den Registerkarten passen nicht immer."** Die Kachel
„Dokumente" versprach „Satzung, Ordnungen und Tätigkeitsberichte" — drei Dinge,
die eine IG nicht hat, und seit die Ablagen frei einstellbar sind, stimmte der
Satz für niemanden mehr. Dasselbe bei „MV-Einladungen" und beim Schalter
„Vorstand" in der Rollenverwaltung. **Merksatz:** Ein Untertitel, der Beispiele
nennt, altert mit den Beispielen.

Dabei noch gefunden: Die Hilfetexte in den Popovers sprachen weiter vom
Vorstand im Sinne der Satzung, während der Schalter daneben schon
„Ansprechpartner" hiess. Sie dürfen jetzt Platzhalter tragen — ein Text für
jede Form, und wer seinen eigenen geschrieben hat, behält ihn.

## Die Frage nach der Satzung

**„Die Satzung wird über die Dokumentenverwaltung gelöst — dann sollte der
Ordner bei Vereinen obligatorisch sein, oder?"**

Fast. Der Verweis im Aufnahmeantrag suchte das neueste Dokument in der Ablage
`satzung` — als festes Wort in zwei Datenbankfunktionen. Solange die Ablagen
selbst fest verdrahtet waren, ging das; seit jeder Verein sie anlegen,
umbenennen und löschen kann, nicht mehr. Wer die (leere) Ablage löschte,
verlor den Verweis lautlos; wer seine Ablage „Grundlagen" nannte, konnte gar
nicht darauf zeigen.

Obligatorisch ist die Ablage jetzt **nicht wegen der Rechtsform, sondern
solange etwas auf sie zeigt**: Sie steht in den Einstellungen, und ein
Fremdschlüssel verhindert das Löschen, solange der Antrag sie braucht. Ein
Verein ohne Aufnahmeantrag braucht sie so wenig wie eine
Interessengemeinschaft. **Merksatz:** Ein Pflichtfeld, das aus der Rechtsform
abgeleitet wird, ist eine Vermutung; eines, das aus einer Verwendung folgt,
ist eine Tatsache.

Beim Einbauen fiel derselbe Fehler noch einmal auf wie am Vormittag: Das
Erscheinungsbild schrieb beim Speichern auch `statutes_link` und
`statutes_document_id` zurück — Felder, die es zeigt seit dem Umzug des
Satzungsverweises gar nicht mehr.

## Was auf dem Webspace landet, liest ein Mensch im FTP-Programm

Die `.htaccess` auf dilehi.de sah im FTP-Programm nach Zeichensalat aus:
„nach drauÃŸen", „Ã¼ber". Die Datei selbst ist in Ordnung — sie ist UTF-8, und
Apache liest Kommentarzeilen ohnehin nicht. Das Programm davor rät die
Kodierung und rät falsch.

Trotzdem geändert: Die vier Dateien, die auf dem Webspace liegen und dort
gelesen werden (`.htaccess`, `robots.txt`, `_redirects`, `_headers`), stehen
jetzt in reinem ASCII. **Was aussieht wie kaputt, wird behandelt wie kaputt** —
und der Nächste, der dort nachsieht, sucht den Fehler an der falschen Stelle.
Eine Prüfung hält es fest.

## Was danach passiert

1. Die Liste der Stolpersteine kommt in [`installation.md`](installation.md),
   nicht in ein Protokoll, das niemand liest.
2. Was der Einrichtungsassistent falsch gesagt hat, wird an ihm behoben.
3. Erst wenn ein zweiter Durchgang glatt läuft, ist die Anleitung fertig.
4. Danach die Seite hinter den Verzeichnisschutz und als Vorführsystem nutzen
   (siehe [`arbeitsstand.md`](arbeitsstand.md), Abschnitt „Die leere
   Installation").

**Stand im Probeprojekt (17. September):** Die Migrationen sind ausgerollt,
die Website noch nicht. Sie muss aus dem Zweig gebaut werden, der den Stand
wirklich trägt.
