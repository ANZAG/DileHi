# Die öffentliche Seite auf Englisch und Französisch

Die öffentliche Seite gibt es in drei Sprachen: **Deutsch** ist das Original,
**Englisch** und **Französisch** sind Übersetzungen davon. Der
Mitgliederbereich, die Anmeldung, der Aufnahmeantrag, die Anmeldung zu
Veranstaltungen und alle E-Mails bleiben deutsch.

Solange nichts übersetzt ist, ändert sich an einer Installation nichts: keine
Sprachwahl, keine neuen Adressen. Eine Sprache erscheint, sobald die erste
veröffentlichte Seite in ihr vorliegt.

## Für alle, die Seiten pflegen

### Wo die Sprachen stehen

| | Adresse |
| --- | --- |
| Deutsch | wie bisher: `/`, `/verein`, `/kontakt` |
| Englisch | `/en`, `/en/verein`, `/en/kontakt` |
| Französisch | `/fr`, `/fr/verein`, `/fr/kontakt` |

Die Namen der Seiten sind in allen Sprachen dieselben – `/en/verein`, nicht
`/en/about`. So lässt sich jede Seite ohne Nachschlagen in ihre anderen
Fassungen umrechnen, und die Sprachwahl im Kopf führt immer auf dieselbe Seite
in der anderen Sprache.

### Was ein Besucher sieht

- Oben rechts steht die Sprachwahl (DE · EN · FR). Was jemand dort anklickt,
  merkt sich sein Browser.
- Beim **ersten** Besuch einer deutschen Adresse entscheidet einmal die
  Sprache des Browsers: Wer Englisch oder Französisch vor Deutsch eingestellt
  hat, landet auf der Fassung in seiner Sprache. Das geschieht genau einmal
  und nie gegen eine eigene Wahl. Der Standort (IP-Adresse) spielt keine
  Rolle, und es ist kein fremder Dienst beteiligt.
- Suchmaschinen und andere Abrufer werden nie umgeleitet. Unter einer Adresse
  steht für sie immer dieselbe Sprache.
- Gibt es eine Seite in der gewählten Sprache nicht, erscheint sie **deutsch**,
  mit einem Hinweis darüber. Kopf, Menü und Fuss bleiben in der gewählten
  Sprache, und die Verweise auf der Seite führen weiter in diese Sprache.
- Verweise in den Mitgliederbereich und zu den Formularen führen immer auf die
  deutsche Seite.

### Eine Seite übersetzen

Verwaltung → **Seiten**. Unter jeder Seite steht der Stand ihrer beiden
Sprachfassungen:

| Stand | Bedeutet |
| --- | --- |
| **fehlt** | Es gibt keine Fassung; unter `/en/…` erscheint die deutsche Seite. |
| **maschinell, ungeprüft** | Von DeepL übersetzt, noch von niemandem durchgesehen. Ist online. |
| **ungeprüft** | Von Hand gesichert, aber nicht als geprüft vermerkt. Ist online. |
| **geprüft** | Jemand, der die Sprache kann, hat sie gelesen und für gut befunden. |
| **veraltet** | Das Deutsche wurde danach geändert. Die Fassung ist weiter online, stimmt aber womöglich nicht mehr. |

Ein Klick auf den Stand öffnet die Fassung im **selben Baukasten** wie das
Original. Dort:

1. **Maschinell übersetzen** lässt DeepL die ganze Seite aus dem aktuellen
   Deutschen übersetzen. Eine vorhandene Fassung wird dabei ersetzt (mit
   Rückfrage). Ohne hinterlegten DeepL-Schlüssel sagt der Knopf das; dann
   bleibt der Weg von Hand.
2. Von Hand: Gibt es noch keine Fassung, steht das Deutsche im Editor. Text
   für Text überschreiben – Aufbau und Bilder stimmen schon.
3. Über dem Baukasten stehen **Titel**, **Titel in der Trefferliste** und
   **Beschreibung für Suchmaschinen** der Fassung.
4. **Sichern** stellt die Fassung online. Einen Entwurf gibt es für
   Sprachfassungen nicht – was gesichert ist, sehen Besucher.
5. **Sichern und als geprüft vermerken**, wenn jemand sie gelesen hat, der die
   Sprache kann.
6. **Löschen** nimmt die Fassung wieder weg; unter ihrer Adresse erscheint
   dann wieder die deutsche Seite.

Wer am deutschen Original etwas ändert (Titel, Text, Suchmaschinenangaben),
macht die Fassungen **veraltet**. Das setzt die Datenbank selbst. Danach die
Fassung öffnen, anpassen und sichern – oder neu übersetzen lassen. Wer nur
einen Entwurf sichert, macht nichts veraltet; erst das Veröffentlichen.

Was nicht mitübersetzt wird, auch nicht von der Maschine: Namen von Personen
und Einrichtungen, Lizenzangaben, Adressen von Verweisen, Bildauswahl und
alles, was das Aussehen bestimmt. Eigenes HTML mit Programm oder Stilangaben
darin bleibt ebenfalls, wie es ist.

### Kurze Texte, die zu keiner Seite gehören

Manches steht auf den öffentlichen Seiten, ohne im Baukasten einer Seite zu
stehen: Es wird an anderer Stelle der Verwaltung gepflegt und von einem
Baustein nur eingeblendet. Für all das gibt es **eine Tabelle**: links das
Deutsche, daneben je ein Feld für Englisch und Französisch.

| Was | Deutsch gepflegt unter | Übersetzt unter |
| --- | --- | --- |
| Menüpunkte | Verwaltung → Menü | Seiten → „Menü und Rahmen in anderen Sprachen" |
| Untertitel, Beschreibung für Suchmaschinen, Spaltentitel im Fuss | Verwaltung → Erscheinungsbild | ebenda |
| Beschreibung der Bilder in den Seiten (Alternativtext) | im Baukasten am Bild | ebenda |
| Beschreibung der Galeriebilder | Verwaltung → Galerie | direkt unter der Galerie („Bildbeschreibungen in anderen Sprachen") – und unter Seiten |
| Aufzählung „Was Besucher bei uns erleben können" | Verwaltung → Besucher-Highlights | direkt darunter – und unter Seiten |
| Quellen einer Darstellung | Verwaltung → Quellen | direkt unter der Quellenliste („Quellen in anderen Sprachen") – und unter Seiten |

So bleiben beide Seiten in Übereinstimmung:

- Die Tabelle steht **dort, wo das Deutsche gepflegt wird**. Wer eine Quelle
  ergänzt, klappt darunter „Quellen in anderen Sprachen" auf und sieht die
  neue Zeile mit leeren Feldern.
- Wer einen deutschen Text **ändert**, macht seine Übersetzungen **veraltet**
  – das steht dann unter dem Feld. Anpassen und sichern, und der Vermerk ist
  weg. Wer einen Eintrag löscht, löscht seine Übersetzungen mit.
- Unter Seiten zeigt jede Gruppe, wie viele Felder noch leer oder veraltet
  sind.
- Ein **leeres Feld** heisst: Dort bleibt das Deutsche stehen.
- Übersetzen darf, wer auch das Deutsche pflegen darf: Wer nur die Quellen
  betreut, sieht und ändert nur die Quellen. Mit dem Recht „Seitenaufbau und
  Menü ändern" alles.

**Fehlendes maschinell übersetzen** füllt, was leer oder veraltet ist. Was
schon dasteht – von Hand oder von der Maschine –, bleibt.

#### Quellen: was übersetzt wird und was nicht

Eine Quellenangabe ist ein einziges Feld, in dem zweierlei stehen kann:

- **Literatur- und Fundstellenangaben** – „Kühnel, Harry: Alltag im
  Spätmittelalter, Graz 1984", „Codex Manesse (Universitätsbibliothek
  Heidelberg, Cod. Pal. germ. 848)". Sie bleiben in jeder Sprache, wie sie
  sind: Wer das Buch sucht, braucht Verfasser und Titel so, wie es erschienen
  ist. Die Maschine fasst sie nicht an; in der Tabelle steht der Vermerk
  „Literaturangabe". Das Feld leer zu lassen ist hier das Richtige.
- **Beschreibende Einträge** – „Funde aus dem Rhein-Main-Gebiet (u. a.
  Landesmuseum Wiesbaden)". Die werden übersetzt, von Hand oder maschinell.
  Namen von Museen und Orten dabei bitte durchsehen: Eine Maschine macht aus
  dem „Landesmuseum Wiesbaden" gern ein „Wiesbaden State Museum".

Woran die Anwendung eine Literaturangabe erkennt: „Nachname, Vorname:" am
Anfang, ein mit Sternchen kursiv gesetzter Werktitel, Signaturen und
Kürzel („Cod.", „Bd.", „S. 12", ISBN, eine Web-Adresse) oder Ort und Jahr am
Ende. Im Zweifel gilt ein Eintrag als Literaturangabe. Wer ihn trotzdem
übersetzen will, trägt die Übersetzung von Hand ein – das geht immer.

#### Bildnachweise

Die Zeilen des Bausteins „Bildnachweise" stehen in der Seite und werden mit
ihr übersetzt: was zu sehen ist und die Quelle. Die **Lizenz** nicht – „CC
BY-SA 4.0" heisst überall so. Nur die üblichen deutschen Angaben kennt die
Anwendung in allen drei Sprachen und zeigt sie von selbst übersetzt:
gemeinfrei (public domain, domaine public), eigenes Werk, eigene Aufnahme,
alle Rechte vorbehalten, mit freundlicher Genehmigung, Privatbesitz, privat,
lizenzfrei. Wer etwas anderes braucht, trägt es in der Sprachfassung der
Seite von Hand ins Feld „Lizenz" ein.

#### Feste Worte

Was die Anwendung selbst schreibt, ist in allen drei Sprachen eingebaut
(`src/lib/texte.ts`) und braucht keine Pflege: „Mitgliederbereich", das
Kontaktformular, die Fehlerseite, die Sprachwahl – und die Überschriften und
Sätze der Bausteine: „Unsere Quellen" samt Einleitung und Schlusssatz,
„Bildnachweise", „Was Besucher bei uns erleben können", die Beschriftungen
der Pflichtangaben im Impressum („Angaben gemäß § 5 DDG", „Vertreten durch",
„Registergericht" …) und die Schreibweise von Datumsangaben.

Bei den **Pflichtangaben** werden nur die Beschriftungen übersetzt. Name,
Anschrift, Vertretung, Registergericht und -nummer stehen in jeder Sprache
so da, wie sie unter Erscheinungsbild eingetragen sind. „Angaben gemäß § 5
DDG" heisst auf Englisch „Information pursuant to Section 5 DDG (German
Digital Services Act)", auf Französisch « Informations conformément à
l’article 5 de la DDG (loi allemande sur les services numériques) » – mit
dem Namen des Gesetzes, damit klar bleibt, dass deutsches Recht gemeint ist.

### Wann es draussen ankommt

Im Browser sofort. Das fertige HTML je Seite (für Suchmaschinen und Abrufer
ohne JavaScript), die Angaben zu den Sprachfassungen (`hreflang`) darin und
die Serverregeln für `/en/…` und `/fr/…` entstehen beim **Bauen** – also nach
dem nächsten Ausrollen der Website. Nach dem ersten Schwung Übersetzungen
deshalb einmal neu ausrollen.

## Für alle, die eine Installation betreuen

### Einmalig

1. **Migrationen einspielen** (kommen mit `supabase db push` bzw. dem
   Ausrollen-Knopf):
   - `20261124100000_mehrsprachig.sql` legt `site_page_translations` und
     `site_text_translations` an und die Funktion `site_languages()`. Solange
     sie fehlt, läuft die Seite wie bisher – einsprachig.
   - `20261125100000_mehrsprachig_weitere_texte.sql` lässt in
     `site_text_translations` auch Quellen, Besucherhinweise und
     Bildbeschreibungen zu. Solange sie fehlt, lassen sich diese nicht
     sichern; alles andere läuft.
2. **Funktionen ausrollen:** neu ist `translate-page`, geändert `sitemap`.
3. **Freiwillig: DeepL-Schlüssel.** Bei Supabase unter Edge Functions →
   Secrets als `DEEPL_API_KEY` hinterlegen. Ein kostenloser Schlüssel
   („DeepL API Free", endet auf `:fx`) genügt für den Anfang; die Funktion
   erkennt an der Endung, welche Adresse von DeepL gilt. Ohne Schlüssel
   funktioniert alles ausser dem Knopf „Maschinell übersetzen".
4. Website neu ausrollen.

Zu DeepL gehen dabei nur Texte, die ohnehin öffentlich sind oder es werden
sollen: die Texte der Seite, die gerade übersetzt wird, Menüpunkte und
Rahmentexte. Keine Mitgliederdaten. Wer den Dienst nennt, tut das in der
Datenschutzerklärung dort, wo auch der Hoster steht.

### Der erste Schwung: alle Seiten auf einmal

Statt jede Seite einzeln zu übersetzen, lassen sich alle Texte in eine Datei
geben und übersetzt zurücklesen. Das Skript läuft nur von Hand, nie beim
Bauen.

```sh
# 1. Alle Texte der veröffentlichten Seiten in eine Datei
VITE_SUPABASE_URL=https://<projekt>.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=<öffentlicher Schlüssel> \
  node scripts/seiten-uebersetzen.mjs export texte.json

# 2. In texte.json die Felder "en" und "fr" ausfüllen – von Hand, mit DeepL,
#    von einem Übersetzungsbüro. "de" bleibt, wie es ist. In Texten der Art
#    "html" die Tags stehen lassen.

# 3. Erst ansehen, was geschähe …
VITE_SUPABASE_URL=… VITE_SUPABASE_PUBLISHABLE_KEY=… \
  node scripts/seiten-uebersetzen.mjs import texte.json --probe

# 4. … dann einlesen. Dafür braucht es den Dienstschlüssel (service_role) –
#    nur für diesen einen Aufruf in der Umgebung, in keiner Datei.
VITE_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  node scripts/seiten-uebersetzen.mjs import texte.json
```

Unter `rahmen` stehen in der Datei auch die kurzen Texte: Menüpunkte,
Untertitel und Fuss, Bildbeschreibungen, Besucherhinweise, Quellen.
Literaturangaben tragen dort den Vermerk `"literaturangabe": true` und
bleiben am besten leer.

Die eingelesenen Fassungen gelten als „maschinell, ungeprüft" (mit
`--von-hand` als „ungeprüft") und stehen danach in der Seitenverwaltung zur
Durchsicht. Was sich seit dem Export am Deutschen geändert hat, bleibt deutsch
und wird gemeldet. Ein leeres Feld bleibt deutsch.

### Wie es gebaut ist

| Was | Wo |
| --- | --- |
| Sprachen, Adressen, Erkennung der Browsersprache | `src/lib/sprachen.mjs` |
| Feste Worte in drei Sprachen | `src/lib/texte.ts` |
| Sprache der Adresse, gemerkte Wahl, angebotene Sprachen | `src/hooks/useSprache.ts` |
| Sprachwahl, Weiche beim Ankommen | `src/components/Sprachwahl.tsx`, `SprachWeiche.tsx` |
| Seite in ihrer Sprache, Rückfall auf Deutsch | `src/pages/SeiteAnzeigen.tsx`, `src/daten/sprachen.ts` |
| Was an einer Seite Text ist | `supabase/functions/_shared/seitentexte.mjs` |
| Die kurzen Texte ausserhalb der Seiten, Regel für Literaturangaben | `supabase/functions/_shared/rahmentexte.mjs` |
| Tabelle der kurzen Texte in der Verwaltung | `src/components/admin/RahmentexteAdmin.tsx` |
| Übersetzen mit DeepL | `supabase/functions/translate-page`, `_shared/deepl.ts` |
| Vorab-HTML, `hreflang`, Serverregeln | `scripts/vorabSeiten.mjs`, `scripts/vorabzug.mjs` |
| Sitemap mit Sprachfassungen | `supabase/functions/sitemap` |

Regeln, auf die man sich verlassen kann:

- **Rückfall je Seite.** Ohne Fassung zeigt `/en/seite` das Deutsche: als
  deutsch ausgezeichnet (`lang="de"`), mit der deutschen Adresse als
  Canonical und ohne `hreflang`. Der Server liefert dafür das deutsche
  Vorab-HTML aus.
- **`hreflang` nur für echte Fassungen.** Jede Fassung nennt alle – sich
  selbst eingeschlossen – und das Deutsche als `x-default`.
- **Eine Sprache gibt es, sobald eine veröffentlichte Seite in ihr vorliegt**
  (`site_languages()`). Danach richten sich Sprachwahl, Weiche, Kontaktseite
  je Sprache und die Serverregeln.
- **Neues Textfeld in einem Baustein?** Es muss in `seitentexte.mjs`
  eingeordnet werden – übersetzen, als Eigenname stehen lassen oder als
  Zieladresse behandeln. Ein Test (`seitentexte.test.ts`) meldet es sonst.
- **Neues festes Wort?** In `texte.ts` in allen drei Sprachen; der Typ und ein
  Test (`sprachen.test.ts`) achten darauf.
- **Weiterer kurzer Text aus einer eigenen Tabelle?** Eine neue Art in
  `site_text_translations` (Check, `site_text_translation_editable`, Trigger
  mit `site_text_translations_follow`), in `rahmentexte.mjs` eintragen, beim
  Anzeigen `useRahmentexte()` fragen. Ein Test vergleicht die Arten in beiden.
- **Weitere Sprache?** `ZUSATZSPRACHEN` in `sprachen.mjs`, die Prüfung
  `lang in ('en','fr')` in der Datenbank, `SPRACHEN` in `translate-page`,
  `sitemap` und `scripts/seiten-uebersetzen.mjs`, die Worte in `texte.ts`.

### Was noch deutsch bleibt

- Die **Termine** im Baustein „Nächste Veranstaltungen": Titel und Ort kommen
  aus dem Kalender des Mitgliederbereichs. Das Datum steht in der Schreibweise
  der Sprache.
- Die **Darstellungen** (Personen und ihre Beschreibungen) aus dem
  Mitgliederbereich.
- Die Angaben selbst im Baustein „Pflichtangaben" – siehe oben, das ist
  Absicht.
- Namen von Personen und Einrichtungen, Lizenzkennungen, Literaturangaben –
  ebenfalls Absicht.
- Die Formulare Aufnahmeantrag und Veranstaltungsanmeldung, der
  Mitgliederbereich, alle E-Mails.
- `llms.txt`.

Auf einer Seite, die es in der gewählten Sprache nicht gibt, steht der Text
deutsch, die festen Worte der Bausteine aber in der gewählten Sprache – wie
Kopf und Fuss.
