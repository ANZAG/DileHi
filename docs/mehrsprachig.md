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

### Menü und Rahmen

Unter der Seitenliste: **Menü und Rahmen in anderen Sprachen** (braucht das
Recht „Seitenaufbau und Menü ändern"). Eine Tabelle mit den Namen der
Menüpunkte, dem Untertitel, der Beschreibung für Suchmaschinen und den
Spaltentiteln im Fuss. Ein leeres Feld heisst: Dort bleibt das Deutsche.
„Fehlendes maschinell übersetzen" übersetzt alles, was fehlt, veraltet ist
oder bisher nur von der Maschine stammt; was von Hand gesichert wurde und
noch stimmt, bleibt.

Die festen Worte der Seite – „Mitgliederbereich", das Kontaktformular, die
Fehlerseite, die Sprachwahl selbst – sind schon in allen drei Sprachen
eingebaut (`src/lib/texte.ts`) und brauchen keine Pflege.

### Wann es draussen ankommt

Im Browser sofort. Das fertige HTML je Seite (für Suchmaschinen und Abrufer
ohne JavaScript), die Angaben zu den Sprachfassungen (`hreflang`) darin und
die Serverregeln für `/en/…` und `/fr/…` entstehen beim **Bauen** – also nach
dem nächsten Ausrollen der Website. Nach dem ersten Schwung Übersetzungen
deshalb einmal neu ausrollen.

## Für alle, die eine Installation betreuen

### Einmalig

1. **Migration einspielen:** `supabase/migrations/20261124100000_mehrsprachig.sql`
   (kommt mit `supabase db push` bzw. dem Ausrollen-Knopf). Sie legt
   `site_page_translations` und `site_text_translations` an und die Funktion
   `site_languages()`. Solange sie fehlt, läuft die Seite wie bisher –
   einsprachig.
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
- **Weitere Sprache?** `ZUSATZSPRACHEN` in `sprachen.mjs`, die Prüfung
  `lang in ('en','fr')` in der Datenbank, `SPRACHEN` in `translate-page`,
  `sitemap` und `scripts/seiten-uebersetzen.mjs`, die Worte in `texte.ts`.

### Was noch deutsch bleibt

- Was Bausteine aus dem Mitgliederbereich holen und nicht im Editor steht:
  Termine, Darstellungen, Quellen, Besucherhinweise, Galerien – samt den
  wenigen festen Worten und Datumsangaben, die diese Bausteine selbst
  mitbringen.
- Die Alternativtexte der Bilder (Bilderverwaltung).
- Der Baustein „Pflichtangaben" (Anschrift, Vertretung, Register) und die
  Formulare Aufnahmeantrag und Veranstaltungsanmeldung.
- `llms.txt`.
