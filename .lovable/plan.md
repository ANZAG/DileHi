# Prüfung: Baukasten-Seiten (…-neu) gegen die bisherigen Seiten

Verglichen wurden alle acht vorhandenen Baukasten-Seiten mit ihren Originalen im Browser: sichtbarer Text, Überschriften-Gliederung, Bilder samt Anzeigebreite, Seitenhöhe und die Angaben für Suchmaschinen.

## Ergebnis in Kurzform

Inhaltlich stimmen Startseite, Über uns, Für Veranstalter und die drei Epochenseiten Wort für Wort überein. Bilder, Reihenfolge und Bildbreiten sind identisch. Abweichungen gibt es bei den Suchmaschinen-Angaben, bei zwei Überschriften-Details, bei den Rechtstexten und bei der Kontaktseite.

## Gefundene Abweichungen

### 1. Seitentitel bei Suchmaschinen (wichtig)
Die neuen Seiten bilden den Titel immer als "Seitenname – Diu lebendec Histôrje". Damit gehen die ausformulierten Titel verloren:

| Seite | bisher | neu |
| --- | --- | --- |
| Startseite | Diu lebendec Histôrje – Wiesbadener Living History Verein | Startseite – Diu lebendec Histôrje |
| Spätmittelalter | Spätmittelalter - Grafschaft Nassau (1290-1310) | Spätmittelalter in Nassau – Diu lebendec Histôrje |
| Napoleonik | Napoleonik – Nassauer Grenadiere 1815 | Napoleonik in Nassau – Diu lebendec Histôrje |
| Erster Weltkrieg | Erster Weltkrieg - 1. Nassauisches Pionier-Bataillon Nr. 21 | Erster Weltkrieg – Diu lebendec Histôrje |

Die Kurzbeschreibungen sind dagegen überall identisch.

### 2. Strukturierte Daten fehlen (wichtig)
Startseite und alle drei Epochenseiten liefern bisher einen maschinenlesbaren Datenblock (Organisation bzw. Artikel) an Suchmaschinen. Auf den neuen Seiten fehlt er ersatzlos.

### 3. Über uns: eine Überschriftenebene verschoben
"Was ist eigentlich „Living History"?" ist im Original eine Unterüberschrift (H3) innerhalb von "Unser Anspruch", auf der neuen Seite eine Hauptüberschrift (H2).

### 4. Impressum: inhaltlich verändert
Nicht nur übertragen, sondern neu geschrieben: "§ 5 TMG" wurde zu "§ 5 DDG", "Registergericht:" entfällt, der Abschnitt "Verbraucherstreitbeilegung / Universalschlichtungsstelle" heißt jetzt nur "Verbraucherstreitbeilegung", und drei komplette Abschnitte kamen hinzu (Haftung für Inhalte, Haftung für Links, Urheberrecht). Die Seite ist dadurch rund 480 Pixel länger.

### 5. Datenschutz: komplett andere Fassung
Die neue Seite ist eine andere Erklärung, nicht dieselbe in Bausteinen: andere Gliederung (Präambel, Übersicht der Verarbeitungen, internationale Datentransfers …), gut ein Drittel mehr Text. Enthalten ist außerdem ein Abschnitt "Forum und interne Zusammenarbeit" — das Forum gibt es im Projekt nicht mehr.

### 6. Kontaktseite fehlt
Für /kontakt gibt es keine Baukasten-Fassung, obwohl der Menüpunkt existiert und ein passender Baustein (Kontaktformular) vorhanden ist.

### 7. Kleinigkeiten
- Seitenhöhen weichen um 20 bis 350 Pixel ab (Über uns +346, Für Veranstalter +38, Epochenseiten +86 bis +140, Startseite +20). Das sind Abstände zwischen den Abschnitten, im direkten Vergleich kaum sichtbar.
- Startseite: ein schließendes Anführungszeichen war im Original falsch gesetzt und ist in der neuen Fassung korrekt ("die lebendige Geschichte“).

## Vorschlag zum Vorgehen

1. Eigenes Feld für den Suchmaschinen-Titel je Seite, gefüllt mit den bisherigen Titeln; nur wenn es leer bleibt, greift das Muster "Seitenname – Verein".
2. Strukturierte Daten je Seite hinterlegen und ausgeben (Organisation für die Startseite, Artikel für die drei Epochenseiten), inhaltsgleich zu heute.
3. Über uns: die Living-History-Überschrift wieder als Unterüberschrift.
4. Impressum und Datenschutz: klären, ob die neuen Fassungen gewollt sind. Falls ja, bleiben sie und der Forum-Abschnitt fliegt raus; falls nein, werden die bisherigen Texte wörtlich übernommen.
5. Kontaktseite als Baukasten-Fassung anlegen (Überschrift, Einleitungstext, Kontaktformular).
6. Abstände Abschnitt für Abschnitt an das Original angleichen, beginnend bei Über uns.

## Technische Hinweise

- Titel und strukturierte Daten: `src/pages/SeiteAnzeigen.tsx` setzt heute pauschal `${page.title} – ${branding.org_short_name}` und übergibt kein `jsonLd` an `SEO.tsx`. Nötig sind zwei zusätzliche Spalten in `site_pages` (`seo_title`, `structured_data`) plus Felder im Editor.
- Der bestehende Prüfer `scripts/seiten-pruefen.mjs` vergleicht Fließtext, Überschriften, Reihenfolge und Bildbreiten und meldet für alle sechs geprüften Seiten "vollständig". Er kennt Impressum, Datenschutz und Kontakt nicht und prüft keine Suchmaschinen-Angaben — beides sollte er künftig abdecken.
- Die Umstellung der Routen von den React-Seiten auf die Baukasten-Seiten (Slugs ohne "-neu", Wegfall der alten Dateien) ist bewusst nicht Teil dieser Prüfung.
