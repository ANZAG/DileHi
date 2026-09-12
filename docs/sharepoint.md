# Dateiablage in SharePoint einrichten

Die Dateien der Quellensammlung können statt in Supabase in SharePoint liegen.
Das lohnt sich für einen Verein mit Microsoft 365: viel Platz, keine Grenze von
50 MB je Datei. Titel, Epoche, Ordner und wer was sehen darf bleiben in DING;
nur die Datei liegt in SharePoint.

DING bekommt dafür eine **eigene App-Registrierung**, getrennt von der für den
Mailversand, mit dem Recht `Sites.Selected`. Damit sieht DING genau eine
SharePoint-Website – die, die du ihm in Schritt 3 freigibst – und sonst nichts
in eurem Microsoft 365.

Dauer: etwa eine halbe Stunde. Du brauchst ein Konto mit Admin-Rechten in
Microsoft 365.

---

## 1. Eine SharePoint-Website anlegen

1. `https://<euer-name>.sharepoint.com` öffnen (bei DileHi etwa
   `dilehi.sharepoint.com`).
2. **+ Website erstellen** → **Teamwebsite**.
3. Name: **Vereinsablage**. Datenschutzeinstellungen: **Privat**.
4. Die Adresse der Website notieren, etwa
   `https://dilehi.sharepoint.com/sites/Vereinsablage`.

Den Ordner „Quellensammlung" legt DING selbst an.

## 2. Die App registrieren

Im **Microsoft Entra Admin Center**: `https://entra.microsoft.com`

1. **Anwendungen → App-Registrierungen → Neue Registrierung**
   - Name: **DING Dateiablage**
   - Unterstützte Kontotypen: **Nur Konten in diesem Organisationsverzeichnis**
   - Umleitungs-URI: leer lassen
   - **Registrieren**
2. Auf der Übersichtsseite zwei Werte notieren:
   - **Anwendungs-ID (Client)** – das wird `SHAREPOINT_CLIENT_ID`
   - **Verzeichnis-ID (Mandant)** – das wird `SHAREPOINT_TENANT_ID`. Das ist
     eure Organisation, nicht die App: derselbe Wert wie `MS_TENANT_ID` beim
     Mailversand. Steht der schon in Supabase, kannst du dir diesen hier
     sparen – DING greift dann darauf zurück.
3. **Zertifikate & Geheimnisse → Neuer geheimer Clientschlüssel**
   - Beschreibung: DING, Ablauf: **24 Monate** → **Hinzufügen**
   - Die Spalte **Wert** sofort kopieren – er ist nur jetzt sichtbar. Das wird
     `SHAREPOINT_CLIENT_SECRET`. Nicht die „Geheimnis-ID" daneben.
   - Einen Kalendereintrag für den Ablauf setzen. Danach funktioniert die
     Ablage nicht mehr, bis ein neuer Schlüssel eingetragen ist.
4. **API-Berechtigungen → Berechtigung hinzufügen → Microsoft Graph →
   Anwendungsberechtigungen**
   - **Sites.Selected** ankreuzen → **Berechtigungen hinzufügen**
   - **Administratorzustimmung für … erteilen** → Ja. Der Status wird grün.

## 3. Der App die eine Website freigeben

`Sites.Selected` heisst: Die App darf zunächst gar nichts. Die Website gibt ihr
ein Admin einmal frei – im **Graph Explorer** im Browser.

1. `https://developer.microsoft.com/graph/graph-explorer` öffnen und oben
   rechts **mit dem Admin-Konto anmelden**.
2. Unter **Berechtigungen ändern** (Reiter unter dem Adressfeld)
   **Sites.FullControl.All** suchen und **Zustimmen**. Das gilt nur für dich
   im Graph Explorer, nicht für DING.
3. **Die Kennung der Website holen.** Methode **GET**, Adresse:

   ```
   https://graph.microsoft.com/v1.0/sites/dilehi.sharepoint.com:/sites/Vereinsablage
   ```

   (euren Namen und den Namen der Website einsetzen) → **Abfrage ausführen**.
   In der Antwort den Wert von `"id"` kopieren. Er sieht aus wie
   `dilehi.sharepoint.com,1a2b…,3c4d…`.
4. **Freigeben.** Methode **POST**, Adresse:

   ```
   https://graph.microsoft.com/v1.0/sites/<id aus Schritt 3>/permissions
   ```

   Unter **Anforderungstext**:

   ```json
   {
     "roles": ["write"],
     "grantedToIdentities": [
       { "application": { "id": "<Anwendungs-ID aus Schritt 2>", "displayName": "DING Dateiablage" } }
     ]
   }
   ```

   → **Abfrage ausführen**. Die Antwort beginnt mit **201 Created**.

## 4. Die Geheimnisse in Supabase

Supabase → Projekt → **Edge Functions → Secrets**:

| Name | Wert |
| --- | --- |
| `SHAREPOINT_CLIENT_ID` | Anwendungs-ID (Client) |
| `SHAREPOINT_CLIENT_SECRET` | der Wert des geheimen Clientschlüssels |
| `SHAREPOINT_TENANT_ID` | Verzeichnis-ID (Mandant) – nur nötig, wenn `MS_TENANT_ID` fehlt |

## 5. In DING umschalten

**Verwaltung → Dateiablage**

1. **SharePoint** wählen, die Adresse der Website eintragen.
2. **Verbindung prüfen.** Grün heisst: DING erreicht die Website und hat den
   Ordner „Quellensammlung" angelegt. Rot nennt den Grund – meist ein fehlendes
   Geheimnis oder die fehlende Freigabe aus Schritt 3.
3. **Speichern.** Ab jetzt gehen neue Dateien nach SharePoint.
4. **Nach SharePoint verschieben** trägt die Dateien hinüber, die schon im
   Supabase-Speicher liegen. Eine nach der anderen; bricht es ab, einfach neu
   starten.

Quellen, deren Datei nicht auffindbar war, stehen danach in der
Quellensammlung mit **„Die Datei fehlt"**. Wer die Quelle angelegt hat – oder
wer die Dateiablage verwaltet –, kann dort die Datei **nachreichen**. Bei
DileHi betrifft das die grossen Scans, die für Supabase zu gross waren.

---

## Wie es funktioniert

- **Hochladen** läuft im Browser direkt zu Microsoft, in Stücken von 10 MB.
  Die Edge Function `sharepoint-files` besorgt nur die Hochladeadresse und
  legt danach die Quelle an. Deshalb gilt die Grenze von Supabase nicht.
- **Herunterladen** über eine Adresse, die Microsoft für Minuten ausstellt.
  Wer die Quelle nicht sehen darf, bekommt keine.
- **Löschen** einer Quelle schiebt die Datei in den Papierkorb der
  SharePoint-Website. Dort lässt sie sich 93 Tage wiederherstellen.
- **Jede Datei wird geprüft**, ob sie im Ordner „Quellensammlung" liegt.
  Sonst liesse sich über eine erfundene Kennung jede Datei der Website
  abrufen.

Code: `supabase/functions/sharepoint-files`, `supabase/functions/_shared/sharepoint.ts`,
`src/lib/sharePointFiles.ts`, `src/components/admin/FileStorageAdmin.tsx`.
