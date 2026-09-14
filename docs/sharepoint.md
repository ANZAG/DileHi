# Dateiablage in SharePoint einrichten

Die Dateien der Quellensammlung können statt bei Supabase in SharePoint liegen.
Das lohnt sich für einen Verein mit Microsoft 365: viel Platz und keine Grenze
von 50 MB je Datei. Titel, Epoche, Ordner und wer was sehen darf, bleiben in
DING; nur die Datei selbst liegt in SharePoint.

**Die Anleitung steht auch in DING selbst**, unter Verwaltung →
Allgemeine Einstellungen → Erscheinungsbild → Dateiablage → „SharePoint einrichten – Schritt für
Schritt". Dort sind die Texte zum Einfügen schon mit euren Werten ausgefüllt.
Diese Seite ist dieselbe Anleitung zum Nachlesen.

Einmalig, etwa eine halbe Stunde. Du brauchst das Microsoft-365-Konto, mit dem
ihr Benutzer und Lizenzen verwaltet.

---

## 1. Eine Ablage in SharePoint anlegen

- Öffne **office.com**, melde dich an und wähle im Menü links **SharePoint**.
- Klicke oben links auf **+ Website erstellen** und dann auf **Teamwebsite**.
- Name: „Vereinsablage". Bei Datenschutz **Privat** wählen. Fertigstellen.
- Die neue Website öffnet sich. Kopiere die Adresse aus der Adresszeile bis
  einschliesslich „Vereinsablage", etwa
  `https://verein.sharepoint.com/sites/Vereinsablage`. Sie kommt in DING ins
  Feld **Adresse der SharePoint-Website**.

Den Ordner „Quellensammlung" legt DING selbst an.

## 2. DING einen eigenen Zugang geben

So wie jedes Mitglied ein Konto hat, bekommt auch DING eines. Bei Microsoft
heisst das „App-Registrierung".

- Öffne **entra.microsoft.com** und melde dich mit demselben Konto an.
- Links **Anwendungen** → **App-Registrierungen** → oben **Neue Registrierung**.
- Name: „DING Dateiablage". Alles andere so lassen und **Registrieren** klicken.
- Auf der Übersicht stehen die **Anwendungs-ID (Client)** und die
  **Verzeichnis-ID (Mandant)**. Beide brauchst du später.

## 3. Ein Passwort für DING erzeugen

- Links **Zertifikate & Geheimnisse** → **Neuer geheimer Clientschlüssel**.
- Beschreibung „DING", Ablauf **24 Monate**, dann **Hinzufügen**.
- In der Spalte **Wert** steht jetzt ein langes Passwort. Sofort kopieren und
  sicher ablegen – Microsoft zeigt es nur dieses eine Mal. Nicht verwechseln
  mit der „Geheimnis-ID" daneben.
- Den Ablauftag in den Kalender eintragen. Danach braucht es ein neues
  Passwort, sonst funktioniert die Ablage nicht mehr.

## 4. DING erlauben, eine Website zu benutzen

Das Recht heisst „Sites.Selected" und bedeutet: DING darf zunächst gar nichts.
Welche Website es benutzen darf, legst du in Schritt 5 fest – nur diese eine,
nicht euren übrigen SharePoint.

- Links **API-Berechtigungen** → **Berechtigung hinzufügen** → **Microsoft Graph**.
- **Anwendungsberechtigungen** wählen (nicht „Delegierte").
- Ins Suchfeld „Sites.Selected" tippen, Häkchen setzen,
  **Berechtigungen hinzufügen**.
- Zurück in der Liste auf **Administratorzustimmung für … erteilen** und **Ja**.
  In der Spalte Status steht jetzt ein grüner Haken.

## 5. Die Website für DING freigeben

Der einzige Schritt, der nach Programmieren aussieht. In DING stehen die Texte
fertig ausgefüllt mit einem Knopf zum Kopieren.

- Öffne **developer.microsoft.com/graph/graph-explorer** und melde dich oben
  rechts mit demselben Konto an.
- Über dem grossen Textfeld: **Berechtigungen ändern** (englisch „Modify
  permissions"). „Sites.FullControl.All" suchen und **Zustimmen**. Das erlaubt
  nur dir hier im Graph Explorer, Freigaben zu setzen – DING bekommt dadurch
  nichts.
- Links steht **GET**, das bleibt so. Ins Adressfeld, mit euren Namen:

  ```
  https://graph.microsoft.com/v1.0/sites/verein.sharepoint.com:/sites/Vereinsablage
  ```

  Dann **Abfrage ausführen**.
- In der Antwort die Zeile mit `"id":` suchen und den Text in Anführungszeichen
  dahinter kopieren. Er fängt mit eurer SharePoint-Adresse an und enthält zwei
  Kommas.
- Jetzt **zuerst** GET auf **POST** umstellen und erst danach etwas einfügen –
  andersherum verschluckt der Graph Explorer den Text und meldet
  „Empty Payload". Ins Adressfeld:

  ```
  https://graph.microsoft.com/v1.0/sites/KENNUNG-DER-WEBSITE/permissions
  ```

- Darunter im Reiter **Anforderungstext** („Request body"):

  ```json
  {
    "roles": ["write"],
    "grantedToIdentities": [
      { "application": { "id": "ANWENDUNGS-ID", "displayName": "DING Dateiablage" } }
    ]
  }
  ```

  Dann **Abfrage ausführen**.

| Antwort | Bedeutung |
| --- | --- |
| **201 Created** | geschafft |
| 403 | In Schritt 4 fehlt die Zustimmung (der grüne Haken) |
| 401 | Bei „Berechtigungen ändern" fehlt die Zustimmung |
| 400 Empty Payload | erst POST wählen, dann den Text einfügen |

Klappt es im Graph Explorer gar nicht, geht dasselbe in PowerShell:

```powershell
Connect-MgGraph -Scopes "Sites.FullControl.All"
New-MgSitePermission -SiteId "KENNUNG-DER-WEBSITE" -Roles "write" `
  -GrantedToIdentities @(@{ Application = @{ Id = "ANWENDUNGS-ID"; DisplayName = "DING Dateiablage" } })
```

## 6. Die Zugangsdaten bei Supabase hinterlegen

Öffne **supabase.com**, wähle euer Projekt und links **Edge Functions** →
**Secrets**. Leg diese Einträge an:

| Name | Wert |
| --- | --- |
| `SHAREPOINT_CLIENT_ID` | die Anwendungs-ID aus Schritt 2 |
| `SHAREPOINT_CLIENT_SECRET` | das Passwort aus Schritt 3 |
| `MS_TENANT_ID` | die Verzeichnis-ID aus Schritt 2 – dieselbe wie beim Mailversand über Microsoft 365. Steht sie dort schon, ist nichts zu tun. |

## 7. Prüfen und umschalten

In DING unter **Verwaltung → Allgemeine Einstellungen → Erscheinungsbild → Dateiablage**:

1. **SharePoint** wählen und die Adresse der Website eintragen.
2. **Verbindung prüfen.** Grün heisst: DING erreicht die Website und hat den
   Ordner „Quellensammlung" angelegt. Rot sagt, was fehlt – meistens Schritt 5
   oder ein Tippfehler in Schritt 6.
3. **Speichern** (unten im Erscheinungsbild). Ab jetzt landen neue Dateien in SharePoint, und unter Mitgliederbereich erscheint der Eingangskorb.
4. Im **Eingangskorb** trägt **Nach SharePoint verschieben** die Dateien hinüber, die schon bei
   Supabase liegen. Bricht es ab, einfach neu starten.

Quellen, deren Datei nicht auffindbar war, stehen danach in der
Quellensammlung mit **„Die Datei fehlt"**. Die Datei lässt sich dort
nachreichen – oder über den Eingangskorb.

## 8. Der Eingangskorb – grosse Dateien ohne Browser

Sehr grosse Scans über die Website hochzuladen ist mühsam. Schneller geht es
über den Ordner:

1. In SharePoint auf der Website **Dokumente** öffnen → **Synchronisieren**.
   Der Ordner erscheint dann im Explorer.
2. Die Dateien in den Ordner **Posteingang** legen (DING legt ihn selbst an).
3. In DING unter **Verwaltung → Mitgliederbereich → Eingangskorb** auf **Neu einlesen**. Dort steht
   jede Datei, die in der Website liegt und zu keiner Quelle gehört – auch aus
   anders benannten Ordnern.
4. Bei jeder Datei auswählen, wohin sie gehört: an eine vorhandene Quelle oder
   als neue Quelle in einer Epoche. Dann einmal **Dateien zuordnen** für alle.
   Die Dateien wandern dabei nach `Quellensammlung/<Epoche>/`.

---

## Wie es funktioniert

- **Hochladen** läuft im Browser direkt zu Microsoft, in Stücken von 10 MB.
  Die Edge Function `sharepoint-files` besorgt nur die Hochladeadresse und
  legt danach die Quelle an. Deshalb gilt die Grenze von Supabase nicht.
- **Vorschau** über die Vorschau von SharePoint: Sie blättert seitenweise und
  kann PDF, Word, Excel und PowerPoint. Die Adresse gilt nur kurz.
- **Herunterladen** über eine Adresse, die Microsoft für Minuten ausstellt.
  Wer die Quelle nicht sehen darf, bekommt keine.
- **Löschen** einer Quelle schiebt die Datei in den Papierkorb der
  SharePoint-Website. Dort lässt sie sich 93 Tage wiederherstellen.
- **Jede Datei wird geprüft**, ob sie im Ordner „Quellensammlung" liegt.
  Sonst liesse sich über eine erfundene Kennung jede Datei der Website
  abrufen.

Code: `supabase/functions/sharepoint-files`, `supabase/functions/_shared/sharepoint.ts`,
`src/lib/sharePointFiles.ts`, `src/components/admin/FileStorageAdmin.tsx`,
`src/components/admin/DateiablageWahl.tsx`, `src/components/admin/SharePointAnleitung.tsx`, `src/components/admin/anleitung/Bausteine.tsx`.
