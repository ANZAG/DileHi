
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

## Technische Umsetzung
- **Frontend:** React mit Tailwind CSS, responsive für Desktop und Mobilgeräte
- **Backend:** Lovable Cloud (Supabase) für Authentifizierung, Datenbank und Dateispeicher
- **Kein laufender Wartungsaufwand** für den öffentlichen Teil – Inhalte sind statisch eingebettet und können bei Bedarf aktualisiert werden
