# DING aufsetzen

Für jemanden, der einen Verein führt und keine Software baut. Kein Docker,
keine Kommandozeile, kein Datenbankwissen.

Sechs Schritte, gut eine Stunde. Kein SQL-Editor, keine Kommandozeile. Was jeweils dahintersteckt, steht am Ende
des Schritts — überspringbar, aber lesbar, wenn etwas klemmt.

---

## 1. Datenbank anlegen

Auf [supabase.com](https://supabase.com) ein Konto erstellen, dann **New
project**. Region Frankfurt, Name frei wählbar.

**Das Datenbank-Passwort aufschreiben.** Es wird später einmal gebraucht und
ist danach nicht mehr einsehbar.

Zwei Dinge aus dem fertigen Projekt notieren, beide unter *Settings → API*:

| Wert | Sieht aus wie |
| --- | --- |
| Project URL | `https://abcdefgh.supabase.co` |
| anon public key | ein langer Text, beginnend mit `eyJ` |

**Das Projekt nicht mit GitHub verbinden.** Supabase bietet das an, und es
klingt nach genau dem Richtigen. Es ist aber derselbe Weg, den auch der
Ausrollen-Knopf aus Schritt 4 geht — zwei Stellen, die dieselbe Datenbank
umbauen, ohne voneinander zu wissen. Was dabei herauskommt, steht unten unter
*Wenn etwas klemmt*.

> Der `anon`-Schlüssel darf öffentlich sein — er steht später im ausgelieferten
> Programm und ist für jeden Besucher sichtbar. Was jemand damit tun darf,
> regeln die Zugriffsregeln in der Datenbank, nicht die Geheimhaltung des
> Schlüssels. Der `service_role`-Schlüssel daneben ist das Gegenteil: Er umgeht
> alle Regeln und gehört nirgendwo hin ausser in die Servereinstellungen.

## 2. Zugänge für den Ausrollen-Knopf

Im GitHub-Projekt unter **Settings → Secrets and variables → Actions** drei
Geheimnisse anlegen:

| Name | Woher |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase-Konto → Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | Der Teil vor `.supabase.co` aus der Project URL |
| `SUPABASE_DB_PASSWORD` | Das Passwort aus Schritt 1 |

Und daneben, unter **Variables** (nicht Secrets, sie ist öffentlich):

| Name | Wert |
| --- | --- |
| `SITE_URL` | Die Adresse der Website, mit `https://`, etwa `https://euer-verein.de` |

Damit stellt der Ausrollen-Knopf die Anmeldung ein: Links in Mails zeigen auf
diese Adresse, und niemand kann sich selbst ein Konto anlegen. Mitglieder
kommen über Einladungen aus der Verwaltung.

> Der Zugriffsschlüssel gehört zum Konto, nicht zum Projekt — mit ihm könnte
> jemand alle eure Supabase-Projekte verändern. Er gehört in die
> GitHub-Geheimnisse und in keine Datei.

## 3. Geheimnisse hinterlegen

Im Supabase-Projekt unter **Edge Functions → Secrets**:

| Name | Wofür | Pflicht |
| --- | --- | --- |
| `SETUP_SECRET` | Der erste Zugang in Schritt 6. Beliebiger langer Text | ja |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Mailversand | für Einladungen |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push-Benachrichtigungen | nein |
| `DIGEST_SECRET` | Die abendliche Zusammenfassung | nein |
| `BACKUP_TOKEN` | Automatische Sicherung | empfohlen |

Absenderadresse und Absendername stehen **nicht** hier, sondern im
Mitgliederbereich unter Verwaltung → Erscheinungsbild. Dort gibt es auch einen
Probeversand, mit dem sich die Angaben prüfen lassen, bevor die erste Einladung
rausgeht.

> `SETUP_SECRET` ist der Schlüssel zur leeren Installation. Wer ihn kennt und
> die Adresse hat, kann sich den ersten Zugang mit allen Rechten nehmen —
> solange es noch keinen gibt. Danach ist der Weg von selbst zu.

## 4. Alles ausrollen

Unter **Actions → Supabase ausrollen → Run workflow**, beides angehakt.

Das legt den gesamten Aufbau an — Tabellen, Zugriffsregeln, Funktionen, Rechte,
Rollen, Vorlagen, Menü, Ablagen — und stellt alle Edge Functions bereit.
Ein Knopf, rund zwei Minuten.

> Warum ein Ausgangsstand und nicht achtzig Migrationen: Die Migrationen sind
> die Geschichte dieser einen Installation, mit Umwegen und Korrekturen. Für
> eine neue Datenbank zählt nur, wo man herauskommt.
>
> Die Funktionen erledigen alles, was nicht im Browser passieren darf:
> Einladungen, Mails, Aufnahmeanträge, den ersten Zugang.

## 5. Website veröffentlichen

Bei [Netlify](https://netlify.com), [Vercel](https://vercel.com) oder
Cloudflare Pages das GitHub-Projekt verbinden. Einstellungen:

| Feld | Wert |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Umgebungsvariable | `VITE_SUPABASE_URL` = Project URL aus Schritt 1 |
| Umgebungsvariable | `VITE_SUPABASE_PUBLISHABLE_KEY` = anon key aus Schritt 1 |

Danach die eigene Domain eintragen. Zwei Dateien im Projekt tragen sie noch
fest und wollen einmal angefasst werden:

- `index.html` — `og:url`, `og:image`, `twitter:image`
- `public/robots.txt` — die `Sitemap:`-Zeile

## 6. Ersten Zugang anlegen

Die frische Website aufrufen und **/einrichtung** anhängen:

```
https://euer-verein.de/einrichtung
```

Name, E-Mail und das `SETUP_SECRET` aus Schritt 3 eintragen. Die Einladung
kommt per Mail; ist der Mailversand noch nicht eingerichtet, steht der Link
direkt auf der Seite.

Danach anmelden — der Rundgang durch den Mitgliederbereich beginnt von selbst,
und im Profil steht, was als Nächstes einzurichten ist.

> Die Seite verschwindet, sobald ein Konto eine Rolle hat. Sie kommt nicht
> wieder; weitere Mitglieder werden aus der Verwaltung eingeladen.

---

## Danach

Im Mitgliederbereich unter **Verwaltung → Allgemeine Einstellungen** steht als
Erstes die Kachel **Einrichtung**. Sie sieht nach, was schon steht und was
fehlt — Migrationen, erster Zugang, Vereinsdaten, Mailversand, Impressum und
Datenschutz, Sicherung — und sagt zu jedem Punkt, der nicht grün ist, den
nächsten Handgriff. Fehlt ein Geheimnis, steht dort sein Name zum Kopieren;
den Wert kennt nur ihr.

Von Hand einzurichten ist danach noch:

1. **Module** — was der Verein braucht. Alles Weitere richtet sich danach.
2. **Erscheinungsbild** — Name, Anschrift, Logo, Farben, Schriften.
3. **Rollen** — die Ämter des Vereins, und wer was darf.
4. **Aufnahmeantrag**, **Textvorlagen** — die Texte prüfen.
5. **Seiten** — die öffentliche Website zusammenstellen.

Womit eine neue Installation anfängt: im Kopfmenü nur die Startseite, im Fuß
Impressum und Datenschutz (beide sind angelegt und ziehen Name, Anschrift und
Vorstand aus dem Erscheinungsbild), keine Kategorien, Versand über SMTP. Das
Menü baut der Verein selbst, sobald seine Seiten stehen.

Die Reihenfolge ist keine Empfehlung, sondern eine Abhängigkeit: Abgeschaltete
Module verstecken Einstellungen, die man sonst vergeblich sucht.

## Wenn etwas klemmt

| Zeichen | Grund |
| --- | --- |
| `/einrichtung` leitet sofort zur Anmeldung | Es gibt schon ein Konto mit Rolle. Der Weg ist zu |
| „Nicht möglich" beim ersten Zugang | `SETUP_SECRET` fehlt oder stimmt nicht |
| „Die Einrichtung geht nur über https" | Für die Adresse ist noch kein Zertifikat eingerichtet. Beim Hoster nachholen |
| Link in der Mail führt zu `localhost:3000` | Die Variable `SITE_URL` fehlt, oder der Ausrollen-Knopf lief seitdem nicht |
| Keine Mail | SMTP-Angaben fehlen. Der Einladungslink steht auf der Seite |
| Website weiss und leer | `VITE_SUPABASE_URL` oder der Schlüssel fehlen beim Hoster |
| „Keine Rolle hat das Recht roles.manage" | Der Ausrollen-Knopf lief nicht durch. Sieh im Protokoll der Action nach |
| `password authentication failed` | Beim Einfügen des Passworts in das GitHub-Geheimnis ist ein Zeilenumbruch mitgekommen. Der Workflow sagt im Schritt davor, ob das so ist |
| `Remote migration versions not found in local migrations directory` | In der Datenbank steht schon etwas. Siehe den nächsten Abschnitt |

### Wenn im Projekt schon etwas steht

Der Ausgangsstand legt Tabellen an. Auf Tabellen, die es schon gibt, lässt er
sich nicht legen — dann bricht der Ausrollen-Knopf ab, bevor er etwas anfasst.

Meist kommt das daher, dass das Supabase-Projekt mit GitHub verbunden wurde.
Supabase spielt dann von sich aus alle Migrationen ein, die es im Projekt
findet, und hört auf, sobald eine nicht durchläuft. Zurück bleibt eine halb
aufgebaute Datenbank und ein Verzeichnis voller Versionen, die es so nicht mehr
gibt.

Der Ausrollen-Knopf sieht als Erstes nach und schreibt in die Zusammenfassung
des Durchlaufs, was er vorfindet: Tabellen, Einträge im Verzeichnis der
Migrationen, Konten, Ablagen. Danach richtet sich, was zu tun ist.

| Was dasteht | Was zu tun ist |
| --- | --- |
| Tabellen `0`, Einträge `> 0` | Der Schalter **Verzeichnis der Migrationen zurücksetzen** im Ausrollen-Knopf. Er räumt die Einträge weg — aber nur, wenn wirklich weder Tabellen noch Konten da sind |
| Tabellen `> 0`, Konten `0` | Erst leeren: [`docs/projekt-leeren.sql`](projekt-leeren.sql) im **SQL Editor**, dann wie oben |
| Konten `> 0` | Kein leeres Projekt. Nichts löschen — hier gibt es Menschen und Daten |

Und in Supabase unter **Integrations** die Verbindung zu GitHub trennen, falls
sie besteht. Sonst baut sie beim nächsten Push wieder ein, was gerade
weggeräumt wurde.
