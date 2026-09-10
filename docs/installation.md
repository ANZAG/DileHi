# DING aufsetzen

Für jemanden, der einen Verein führt und keine Software baut. Kein Docker,
keine Kommandozeile, kein Datenbankwissen.

Sechs Schritte, gut zwei Stunden. Was jeweils dahintersteckt, steht am Ende
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

> Der `anon`-Schlüssel darf öffentlich sein — er steht später im ausgelieferten
> Programm und ist für jeden Besucher sichtbar. Was jemand damit tun darf,
> regeln die Zugriffsregeln in der Datenbank, nicht die Geheimhaltung des
> Schlüssels. Der `service_role`-Schlüssel daneben ist das Gegenteil: Er umgeht
> alle Regeln und gehört nirgendwo hin ausser in die Servereinstellungen.

## 2. Aufbau einspielen

Im Supabase-Projekt links auf **SQL Editor**, dann der Reihe nach den Inhalt
dieser vier Dateien einfügen und ausführen:

1. `supabase/ausgangsstand/01_schema.sql` — Tabellen, Regeln, Funktionen
2. `supabase/ausgangsstand/02_rechte.sql` — wer was darf
3. `supabase/ausgangsstand/03_startdaten.sql` — Rollen, Rechte, Vorlagen, Menü
4. `supabase/ausgangsstand/04_speicher.sql` — Ablage für Bilder und Dokumente

Die Reihenfolge zählt. Jede Datei einzeln ausführen und die Meldung abwarten.

> Warum vier Dateien und keine achtzig Migrationen: Die Migrationen sind die
> Geschichte dieser einen Installation, mit Umwegen und Korrekturen. Für eine
> neue Datenbank zählt nur, wo man herauskommt.

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

## 4. Funktionen bereitstellen

Im GitHub-Projekt unter **Settings → Secrets and variables → Actions** drei
Geheimnisse anlegen:

| Name | Woher |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase-Konto → Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | Der Teil vor `.supabase.co` aus der Project URL |
| `SUPABASE_DB_PASSWORD` | Das Passwort aus Schritt 1 |

Dann unter **Actions → Supabase ausrollen → Run workflow**. Migrationen
abwählen (der Aufbau steht ja schon), Funktionen anlassen.

> Ohne diesen Schritt gibt es keine Einladungen, keine Mails, keinen
> Aufnahmeantrag und keinen ersten Zugang — die Funktionen erledigen alles, was
> nicht im Browser passieren darf.

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

Im Mitgliederbereich unter **Verwaltung → System**:

1. **Module** — was der Verein braucht. Alles Weitere richtet sich danach.
2. **Erscheinungsbild** — Name, Anschrift, Logo, Farben, Schriften.
3. **Rollen** — die Ämter des Vereins, und wer was darf.
4. **Aufnahmeantrag**, **Textvorlagen** — die Texte prüfen.
5. **Seiten** — die öffentliche Website zusammenstellen.

Die Reihenfolge ist keine Empfehlung, sondern eine Abhängigkeit: Abgeschaltete
Module verstecken Einstellungen, die man sonst vergeblich sucht.

## Wenn etwas klemmt

| Zeichen | Grund |
| --- | --- |
| `/einrichtung` leitet sofort zur Anmeldung | Es gibt schon ein Konto mit Rolle. Der Weg ist zu |
| „Nicht möglich" beim ersten Zugang | `SETUP_SECRET` fehlt oder stimmt nicht |
| Keine Mail | SMTP-Angaben fehlen. Der Einladungslink steht auf der Seite |
| Website weiss und leer | `VITE_SUPABASE_URL` oder der Schlüssel fehlen beim Hoster |
| „Keine Rolle hat das Recht roles.manage" | Schritt 2, Datei 3 wurde nicht eingespielt |
