# Was verarbeitet die Anwendung — und wo steht das in der Erklärung

Diese Liste ist der Ersatz für einen Aktualisierungsdienst. Es gibt kein
Werkzeug, das eine selbst gebaute Anwendung kennt: Ein Generator weiß, was das
WordPress-Plugin „Contact Form 7" tut, weil er es kennt — unser Forum, unsere
Push-Nachrichten und unsere Sicherung kennt er nicht.

**Regel: Wer eine Funktion einbaut, die personenbezogene Daten verarbeitet,
trägt sie hier ein und ergänzt den Abschnitt in der Erklärung.**

Die Erklärung selbst liegt als Seite im Editor (`datenschutz-neu`) und wird von
`scripts/rechtstexte.mjs` erzeugt. Änderungen gehören ins Skript, damit sie
nachvollziehbar bleiben — oder direkt in den Editor, wenn nur Text zu ändern
ist.

## Stand: 8. September 2026

| Funktion | Was wird verarbeitet | Abschnitt in der Erklärung |
|---|---|---|
| Website ausliefern | IP-Adresse, Logfiles | Bereitstellung des Onlineangebots |
| Anmeldung | E-Mail, Passwort-Prüfwert, Sitzung im lokalen Speicher | Registrierung, Anmeldung und Nutzerkonto |
| Mitgliederverwaltung | Name, Anschrift, Geburtsdatum, Ein-/Austritt, Rolle | Wahrnehmung von Aufgaben nach Satzung |
| Aufnahmeantrag | Antragsdaten, erzeugtes PDF | dito, „Mitgliederverwaltung" |
| **Beiträge / SEPA** | **IBAN, BIC, Mandatsdaten** | dito, „Beitragsverwaltung" |
| Veranstaltungen | Zu-/Absagen, Formularantworten, Bearbeitungs-Link | dito, „Veranstaltungen" |
| Abstimmungen | Teilnahme im Prüfprotokoll, Stimme getrennt | dito, „Abstimmungen" |
| Steckbriefe | Darstellung, Kenntnisse, freigegebene Bilder | dito, „Darstellungen" |
| Mitgliederkarte | Wohnort, freiwillig | dito, „Mitgliederkarte" + OpenStreetMap |
| Forum | Beiträge, Bilder, Umfragen, Lesestand, Verlauf | Forum und interne Zusammenarbeit |
| Erwähnungen | Kennung des genannten Mitglieds im Beitragstext | dito, „Erwähnungen" |
| Glocke im Browser | nichts verlässt den Verein | Benachrichtigungen |
| Tägliche Mail | E-Mail-Adresse, Betreff, Kurztext | dito |
| **Push aufs Gerät** | **Endpunkt beim Push-Dienst von Google/Mozilla/Apple** | dito, „Push-Nachrichten" |
| Kontaktformular | Name, E-Mail, Nachricht | Kontakt- und Anfrageverwaltung |
| Veranstalteranfrage | zusätzlich Organisation, Termin, Ort, Besucherzahl | dito |
| **E-Mail-Versand** | **über Microsoft 365 — Drittland USA** | dito, „E-Mail-Versand" |
| Versandweg umstellbar | Microsoft 365 **oder** SMTP | dito — Abschnitt gilt nur für Microsoft |
| **Datensicherung** | **alle Mitgliederdaten, verschlüsselt zu GitHub — USA** | Bereitstellung, „Datensicherung" |
| Schriftarten | keine Übermittlung — liegen auf eigenem Server | Eingebundene Funktionen |
| Bilder im Forum | nicht öffentlicher Speicher, befristete Adressen | Forum, „Bilder in Beiträgen" |

Fett: die Punkte, bei denen eine Änderung besonders auffällt — Bankdaten,
Drittlandübermittlung, Gerätekennungen.

## Was ausdrücklich NICHT stattfindet

Wenn sich das ändert, muss die Erklärung geändert werden, **bevor** die
Funktion live geht:

- keine Analyse- oder Statistikwerkzeuge
- keine Werbe- oder Tracking-Cookies, deshalb kein Cookie-Banner
- keine Social-Media-Plugins
- keine externen Schriftarten, Karten oder Skripte auf den **öffentlichen**
  Seiten (OpenStreetMap läuft nur im Mitgliederbereich)
- keine Newsletter an Nichtmitglieder
- keine automatisierte Entscheidungsfindung oder Profilbildung

## Was sich beim Umstellen ändert

Der E-Mail-Versand lässt sich in der Verwaltung zwischen Microsoft 365 und
einem gewöhnlichen Mailserver (SMTP) umschalten. Der Abschnitt „E-Mail-Versand"
in der Erklärung beschreibt Microsoft 365 samt Drittlandübermittlung in die
USA. **Wer auf SMTP umstellt, muss diesen Abschnitt ändern** — und zwar in beide
Richtungen:

- Bei einem Anbieter mit Servern in der EU entfällt die Drittlandübermittlung
  in diesem Punkt; der Satz über den Angemessenheitsbeschluss steht dann zu
  Unrecht da.
- Der neue Anbieter gehört mit Namen und Sitz genannt, und es braucht einen
  Auftragsverarbeitungsvertrag mit ihm.

Die Erklärung kann das nicht selbst wissen: Sie ist eine Seite im Editor, keine
Abfrage auf die Einstellungen.

## Offene Punkte

- **Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)**: Für Vereine mit
  weniger als 250 Beschäftigten gilt eine Ausnahme, die aber nicht greift, wenn
  regelmäßig verarbeitet wird — was hier der Fall ist. Diese Tabelle ist eine
  brauchbare Grundlage dafür, ersetzt das Verzeichnis aber nicht.
- **Auftragsverarbeitungsverträge**: für die Anwendungsplattform, den Webhoster
  und Microsoft. Vorhandensein prüfen und ablegen.
- **§ 5 TMG → § 5 DDG**: Das alte Impressum nannte noch das TMG. Es wurde im Mai
  2024 durch das Digitale-Dienste-Gesetz abgelöst; die neue Fassung nennt das
  DDG.
- **Löschkonzept**: Die Erklärung nennt Fristen. Ob die Anwendung sie auch
  durchsetzt, ist bisher nur teilweise umgesetzt — Logfiles ja, Sicherungen ja
  (90 Tage), Mitgliederdaten nach Austritt nur von Hand.

## Wer freigibt

Diese Texte sind ein **Entwurf**. Sie beschreiben vollständig, was die Anwendung
verarbeitet — das ist der Teil, den nur wir wissen können und den kein
Generator liefert. Die rechtliche Bewertung gehört zu einem Anwalt oder zu einem
kostenpflichtigen Generator mit Prüfung.
