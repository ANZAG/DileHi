# Umzug aus Lovable

Alles aus der alten Datenbank in der Lovable-Cloud kommt ins eigene
Supabase-Projekt: jede Tabelle, jedes Konto mit seinem Passwort, jede Datei aus
den Ablagen. Die Arbeit macht der Workflow **„Umzug aus Lovable"**. Vorher sind
an drei Stellen Dinge einzutragen, die nur du eintragen kannst.

**Was nicht mitkommt:**

- **Anmeldungen.** Alle melden sich einmal neu an, mit ihrem bisherigen
  Passwort.
- **Die Geheimnisse der Edge Functions.** Die liest niemand aus Lovable heraus,
  sie werden im neuen Projekt neu eingetragen (Schritt 3).
- **Kalender-Abos, die vor diesem Umzug eingerichtet wurden.** Sie zeigen
  direkt auf die alte Datenbank. Wer jetzt neu abonniert, bekommt eine Adresse
  auf dilehi.de, und die überlebt jeden künftigen Umzug.

---

## Vorbereitung

### 1. Ein Schlüssel für den Abzug

Der Workflow holt die Daten bei der Edge Function `backup-export` in Lovable ab.
Die gibt nur etwas heraus, wenn beide Seiten denselben Schlüssel kennen:
`BACKUP_TOKEN`.

GitHub → Settings → Secrets and variables → Actions. Steht `BACKUP_TOKEN` dort
schon, den Wert aus dem Passwortmanager nehmen. Sonst einen neuen anlegen:
lang, nur Buchstaben und Ziffern.

> Warum die tägliche Sicherung rot ist: `backup-export` gibt es in Lovable
> gar nicht, die Adresse antwortet mit 404 (nachgesehen am 11. September).
> Lovable stellt eine Funktion nur bereit, wenn man es im eigenen Chat darum
> bittet; was über GitHub hereinkommt, bleibt liegen. Ebenso fehlen dort
> `mail-test` und `sitemap`.

### 2. In Lovable

1. **Secret** `BACKUP_TOKEN` mit demselben Wert wie in GitHub.
2. **SQL-Editor:** den Inhalt von
   [`supabase/transfer/export-accounts.sql`](../supabase/transfer/export-accounts.sql)
   einfügen und ausführen. Am Ende steht eine Zeile mit zwei Zahlen: wie viele
   Konten es gibt und wie viele davon ein Passwort haben.
3. **`backup-export` bereitstellen.** Die Funktion liegt auf `main`, in
   Lovable läuft sie noch nicht. Im Chat bitten:
   „Bitte die Edge Function backup-export bereitstellen, so wie sie im
   Repository steht. Am Code nichts ändern."

Ob das geklappt hat, prüft der Workflow selbst im ersten Schritt.

### 3. Im neuen Supabase-Projekt

Edge Functions → Secrets. Dieselben Werte wie in Lovable:

| Name | Wofür |
| --- | --- |
| `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_SENDER_EMAIL` | Mailversand über Microsoft 365 |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push-Nachrichten. **Unbedingt dieselben Werte** – mit neuen Schlüsseln wäre jedes Push-Abo ungültig |
| `DIGEST_SECRET` | die Abendzusammenfassung |
| `BACKUP_TOKEN` | die tägliche Sicherung, sobald sie aus dem neuen Projekt kommt |

`ORG_NAME`, `CALENDAR_NAME_PUBLIC`, `CALENDAR_NAME_PERSONAL`, `CALENDAR_TIMEZONE`
und `CALENDAR_UID_DOMAIN` nur, wenn sie in Lovable stehen. `SETUP_SECRET` ist
schon da.

---

## Probelauf

GitHub → Actions → **Umzug aus Lovable** → Run workflow. Alle Häkchen so
lassen, wie sie stehen.

Der Probelauf holt den Abzug, spielt ihn ein, prüft alles und rollt am Ende
zurück. Im neuen Projekt ändert sich nichts. In der Zusammenfassung des Laufs
steht, was passiert wäre:

- **Passwörter: dabei.** Steht dort „nicht dabei", hat Schritt 2.2 nicht
  gegriffen.
- **tabelle:** Zeilen je Tabelle. Die Zahlen sollten zu dem passen, was du aus
  der Verwaltung kennst.
- **spalte_entfaellt**, **fehlt_hier**, **mitgeleert:** Im Idealfall steht
  nichts davon da. Wenn doch, mir zeigen, bevor es ernst wird.

Scheitert der Lauf, steht der Grund oben in der Zusammenfassung. Im Ziel hat
sich dann nichts geändert.

## Der Umzug

1. **Einen ruhigen Zeitpunkt wählen** und kurz Bescheid geben: Was nach dem
   Abzug noch auf dilehi.de eingetragen wird, landet in der alten Datenbank
   und kommt nicht mehr mit.
2. **Denselben Workflow mit „Wirklich übernehmen".** Das Konto aus der
   Einrichtung verschwindet dabei; an seine Stelle treten die Konten aus
   Lovable, deins eingeschlossen.
3. **Auf ding.dilehi.de anmelden**, mit deinem bisherigen Passwort. Kurz
   nachsehen: Termine, Forum, Bilder, Dokumente.
4. **Mir Bescheid geben.** Dann stelle ich dilehi.de um: `.env` raus, der Build
   holt die Adresse aus dem neuen Projekt, `backup.yml` und `digest.yml`
   bekommen die neue Adresse.
5. **GitHub → Variables:** `SITE_URL` auf `https://www.dilehi.de` (so steht die Website auch in den Vereinsangaben), danach
   einmal **Supabase ausrollen**. Das stellt die Anmeldung auf die
   Vereinsseite um.
6. **Den Mitgliedern schreiben:** einmal neu anmelden, das Passwort bleibt.
   Wer den Kalender abonniert hat, richtet das Abo einmal neu ein
   (Veranstaltungen → Kalender abonnieren).

Solange dilehi.de nicht umgestellt ist, lässt sich der Umzug beliebig oft
wiederholen, beim zweiten Mal mit dem Häkchen „trotzdem alles ersetzen".

## Danach: Lovable stilllegen

Kein Grund zur Eile. Die alte Datenbank bleibt, bis sie jemand abschaltet,
und ist bis dahin der Rückweg.

1. Im Lovable-SQL-Editor: `DROP FUNCTION public.transfer_accounts();`
2. In Lovable die Verbindung zu GitHub trennen. Danach pusht Lovable nicht
   mehr nach `main`.
3. Das Projekt in Lovable abschalten.

---

## Wie es funktioniert

| Datei | Aufgabe |
| --- | --- |
| [`supabase/transfer/export-accounts.sql`](../supabase/transfer/export-accounts.sql) | legt in der alten Datenbank `transfer_accounts()` an, die `auth.users` und `auth.identities` herausgibt |
| [`supabase/functions/backup-export`](../supabase/functions/backup-export/index.ts) | liefert mit `accounts: true` die Konten mit, sonst wie bisher |
| [`supabase/transfer/import.sql`](../supabase/transfer/import.sql) | spielt den Abzug ein: leeren, ohne Trigger einspielen, Verweise nachprüfen |
| [`scripts/transfer-files.mjs`](../scripts/transfer-files.mjs) | trägt die Dateien aus den Ablagen hinüber |
| [`.github/workflows/umzug.yml`](../.github/workflows/umzug.yml) | der Knopf |
| [`src/test/transfer.test.ts`](../src/test/transfer.test.ts) | spielt den ganzen Umzug auf der Bühne durch |

Nach dem Einspielen laufen die Migrationen nach dem Ausgangsstand noch einmal
über die alten Daten. Die alte Datenbank steht auf dem Ausgangsstand; erst so
bekommt sie, was seitdem dazukam: Die Rolle „vorstand" verschwindet, die
Bereichstouren kommen. Das setzt voraus, dass diese Migrationen wiederholbar
sind. Bis zum Umzug ist das Pflicht für jede neue Migration.

Die Passwörter liegen in Supabase als bcrypt-Hash. Das neue Projekt prüft
gegen denselben Hash, deshalb gilt das alte Passwort weiter. Der Abzug mit den
Hashes existiert nur während des Laufs auf dem GitHub-Rechner. Er wird nicht
ausgegeben und nicht abgelegt.
