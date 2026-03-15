# Website für Diu lebendec Histôrje e.V.

## Überblick
Eine moderne Portfolio-Website mit historischen Akzenten für euren Living-History-Verein aus Wiesbaden. Die Seite kombiniert ein zeitloses, wartungsarmes öffentliches Portfolio mit einem geschützten internen Mitgliederbereich.

**Design:** Modernes, cleanes Layout mit warmen, erdigen Farbtönen und dezenten historischen Akzenten (z.B. subtile Texturen, Serifenschriften für Überschriften). Die bisherige goldgelbe Farbwelt wird als Akzent aufgegriffen.

**Sprache:** Komplett auf Deutsch.

---

## Öffentlicher Bereich (Portfolio)

### Startseite
- Hero-Bereich mit großem Bild und dem Vereinsnamen „Diu lebendec Histôrje e.V. – Geschichte erleben"
- Kurze Vorstellung des Vereins und seines Anspruchs
- Übersicht der drei dargestellten Epochen als Karten mit Bild und Kurzbeschreibung

### Epochen-Seiten
Jeweils eine eigene Unterseite für jede Darstellungsepoche:
1. **1290–1310 – Nassauer Land** (Hochmittelalter, Region Wiesbaden)
2. **1916/17 – 1. Nassauisches Pionier-Bataillon Nr. 21** (Erster Weltkrieg)
3. **1815 – 1. Kompanie, 1. Linien-Regiment Grenadiere** (mit Hinweis „im Aufbau")

Jede Seite enthält Platzhalter für Texte, Bilder und Quellenangaben – so könnt ihr die Inhalte nach und nach befüllen.

### Galerie
- Bildergalerie mit Lightbox-Ansicht
- Filterbar nach Epoche

### Der Verein
- Vereinsgeschichte und Selbstverständnis
- Kontaktinformationen und Link zur Facebook-Seite
- Impressum / Datenschutz (Platzhalter für eure Rechtstexte)

---

## Interner Mitgliederbereich (Login erforderlich)

### Authentifizierung
- Login per E-Mail und Passwort für eure ~15 Mitglieder
- Mitglieder werden vom Vorstand angelegt/eingeladen (kein öffentliches Registrierungsformular)

### Quellensammlung
- Interner Bereich zum Sammeln und Teilen von Quellen (Links, Texte, hochgeladene Dateien/PDFs)
- Kategorisierbar nach Epoche
- Durchsuchbar

### Vereins-Pinnwand / Ankündigungen
- Einladungen zur Mitgliederversammlung (MV) mit Datum und Uhrzeit
- Möglichkeit, Protokolle als Datei anzuhängen
- Chronologische Übersicht aller Ankündigungen

### Abstimmungstool (MV)
- Erstellen von Abstimmungen: Ja/Nein/Enthaltung (für Anträge und Entlastungen) sowie Kandidatenwahlen mit mehreren Optionen
- **Geheime Abstimmung**: Stimmen werden anonym gespeichert – nur das Ergebnis ist sichtbar, nicht wer wie abgestimmt hat
- Abstimmungen können vom Vorstand gestartet und beendet werden
- Ergebnisprotokoll zum Exportieren/Archivieren
- Nur eingeloggte Mitglieder können abstimmen, jedes Mitglied nur einmal pro Abstimmung

---

## Internes Forum – Konzept

### Übersicht
Ein internes Echtzeit-Forum für Vereinsmitglieder, das sich auf dem Handy wie eine native App anfühlt. Benachrichtigungen über drei Kanäle: In-App (Glocke), E-Mail und Web Push (PWA).

### Datenbankstruktur

**Neue Tabellen:**

- `forum_categories` – Kategorien (Allgemein, Mittelalter, 1815, Orga etc.) mit Name, Beschreibung, Slug, Icon, Sortierung
- `forum_threads` – Threads mit Kategorie-Zuordnung, Pinning, Locking, Post-Count, last_post_at
- `forum_posts` – Beiträge mit Markdown-Content, Zitat-Referenz (reply_to_id), Bearbeitet-Flag
- `forum_reactions` – Emoji-Reaktionen auf Posts (unique pro User+Post+Emoji)
- `forum_read_status` – Lese-Status pro User+Thread für Ungelesen-Tracking
- `forum_attachments` – Datei-Anhänge an Posts (Storage-Bucket)
- `notifications` – In-App-Benachrichtigungen (Typ: mention, reply, new_thread)
- `notification_preferences` – Pro-User Einstellungen für E-Mail/Push
- `push_subscriptions` – Web Push Subscription-Objekte

**RLS:** Alle Tabellen `is_member()` für SELECT. Posts bearbeiten/löschen: eigene oder `forum.moderate`. Notifications: nur eigene.

**Realtime:** Aktiviert für `forum_posts`, `forum_threads`, `notifications`.

### Routing

```
/intern/forum                    → Kategorien-Übersicht
/intern/forum/:categorySlug      → Thread-Liste
/intern/forum/thread/:threadId   → Thread mit Posts
/intern/forum/neu/:categorySlug  → Neuer Thread
```

### UI-Konzept

- **Kategorien:** Karten-Grid mit Icon, Name, Beschreibung, Ungelesen-Badge
- **Thread-Liste:** Gepinnte oben, Sortierung nach letztem Post, FAB für neuen Thread (Mobile)
- **Thread-Ansicht:** Eröffnungsbeitrag hervorgehoben, Antworten chronologisch, fixierter Antwort-Editor unten (Messenger-Feeling), Echtzeit-Updates
- **Benachrichtigungsglocke:** Im Header, Badge mit Ungelesen-Zahl, Dropdown-Liste
- **Mobile:** Pull-to-Refresh, Bottom-Nav, PWA-installierbar

### Benachrichtigungen

1. **In-App (Glocke):** Realtime auf `notifications`-Tabelle, sofort sichtbar
2. **E-Mail:** Edge Function bei @-Erwähnung/Antwort, Corporate-Design-Template
3. **Web Push:** VAPID-Keys, Service Worker, funktioniert auf Android + iOS (PWA)
4. **Einstellungen:** User können pro Kanal aktivieren/deaktivieren

### Umsetzungsphasen

| Phase | Features |
|-------|----------|
| 1 | DB-Schema, Kategorien, Threads, Posts, Markdown, Echtzeit |
| 2 | Reaktionen, Zitate, Ungelesen-Tracking, Suche |
| 3 | In-App-Benachrichtigungen, @-Erwähnungen |
| 4 | E-Mail-Benachrichtigungen, Einstellungen |
| 5 | Web Push, PWA-Optimierung, Mobile-Feinschliff |
| 6 | Moderation, Datei-Anhänge |

### DSGVO
- Datenschutzerklärung um Forum erweitern
- Push-Subscriptions bei Account-Deaktivierung löschen
- E-Mail-Benachrichtigungen: Opt-in mit Abmeldemöglichkeit

---

## Technische Umsetzung
- **Frontend:** React mit Tailwind CSS, responsive für Desktop und Mobilgeräte
- **Backend:** Lovable Cloud (Supabase) für Authentifizierung, Datenbank und Dateispeicher
- **Kein laufender Wartungsaufwand** für den öffentlichen Teil – Inhalte sind statisch eingebettet und können bei Bedarf aktualisiert werden
