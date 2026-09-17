-- Vuozvolc auf ding.dilehi.de
--
-- ==========================================================================
--  NUR IM PROJEKT DING AUSFÜHREN (nyloyirwppbetrkkyncw), NIE IN DILEHI
-- ==========================================================================
--
-- Dieses Skript legt Inhalte an, keine Struktur. Es ist deshalb bewusst
-- KEINE Migration: Migrationen laufen in jeder Installation, auch in DileHis
-- Datenbank, und dort haben Vuozvolcs Seiten nichts zu suchen. Zur Sicherheit
-- bricht es unten von selbst ab, wenn es DileHis Datenbank vor sich hat.
--
-- Auszuführen im SQL-Editor des Supabase-Projekts DING.
--
-- --------------------------------------------------------------------------
--  Woher der Inhalt kommt
-- --------------------------------------------------------------------------
--
-- Aus dem HTML-Abzug von vuozvolc.de, den Eric am 17. September geliefert hat
-- (vierzehn Seiten als Word-Datei, dazu Naalbinding nachgereicht). Die Texte
-- sind **wortgetreu** übernommen — Absätze, Zwischenüberschriften, Listen,
-- Hervorhebungen, Literaturangaben und die Autorenzeilen inklusive. Die
-- Zeichenzahlen decken sich mit der Analyse in `vuozvolc-machbarkeit.md`:
-- Ernährung 8.351, Ausrüstungsleitfaden 3.100, Historie 4.593, Naalbinding
-- 3.138.
--
-- Zwei Dinge sind mit Absicht anders:
--
--   * **Die Namen der Mitglieder sind erfunden.** Die Fertigkeiten stehen
--     wortgetreu da — die gehören der Gruppe, nicht einer Person —, die
--     Vornamen nicht. Ein Name im Netz ist die Entscheidung dessen, der ihn
--     trägt, und für eine Vorführung braucht es ihn nicht. „Dein Name?" und
--     „unser Nachwuchs" sind keine Namen und stehen deshalb unverändert da.
--   * **Die Bilder fehlen.** Angelegt sind die Plätze, mit sprechenden
--     Schlüsseln aus den Dateinamen der Vorlage; die Dateien selbst gehören
--     Vuozvolc und werden nicht mitkopiert. Wo ein Bild war, ist ein leerer
--     Platz — der Aufbau der Seite bleibt sichtbar.
--
-- Impressum, Datenschutz und Cookie-Richtlinie sind NICHT übernommen. Die
-- baut DING selbst aus den Vereinsangaben; eine fremde Rechtsseite zu
-- kopieren wäre in jeder Hinsicht falsch.
--
-- Der Nachbau ist eine Vorführung für Vuozvolc, auf einer Seite hinter einem
-- Passwort. Er ist keine Veröffentlichung ihrer Inhalte.

begin;

-- Die Schranke: `hmrogjpuslpzrittljjr` ist DileHis Projekt, dort ist dieses
-- Skript ein Unfall. Geprüft wird am Vereinsnamen, weil die Datenbank ihre
-- eigene Projektkennung nicht kennt.
do $$
begin
  if exists (select 1 from public.app_settings
              where org_name is not null
                and org_name not in ('Mein Verein e. V.', '', 'Vuozvolc')) then
    raise exception 'Hier steht schon ein Verein drin (%). Dieses Skript gehört nur in das Projekt DING.',
      (select org_name from public.app_settings limit 1);
  end if;
end $$;

-- --------------------------------------------------------------------------
--  1. Die Gestaltung
-- --------------------------------------------------------------------------
--
-- Aus der Analyse und dem Stylesheet der Vorlage: Fliesstext Open Sans in
-- Grau (#666), Überschriften Antic Didone in Dunkelgrau (#333), Flächen in
-- warmem Creme (#faf2e9). Die Auszeichnungsfarbe (#c48662) steht im
-- Stylesheet von vuozvolc.de an den Oberzeilen — sie ist also nicht geraten.
update public.app_settings set
  org_name        = 'Vuozvolc',
  org_short_name  = 'Vuozvolc',
  org_tagline     = 'Leben im Hochmittelalter',
  font_headings   = 'Antic Didone',
  font_body       = 'Open Sans',
  color_dark      = '#333333',
  color_surface   = '#faf2e9',
  color_primary   = '#c48662';

-- --------------------------------------------------------------------------
--  2. Die Bildplätze
-- --------------------------------------------------------------------------
--
-- Ein Platz ohne Datei ist ein beschrifteter Haken, an den ein Bild gehängt
-- wird. Ohne ihn stünde die Bildauswahl im Editor leer da.
insert into public.site_images (slot, label, page, alt_text)
select v.slot, v.label, v.page, ''
  from (values
    ('vuozvolc-startseite-vuozvolc', 'Bild', 'Willkommen beim Vuozvolc'),
    ('vuozvolc-startseite-dsc7563', 'vuozvolc', 'Willkommen beim Vuozvolc'),
    ('vuozvolc-mitglied-basti-2', 'Berthold', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-bos1', 'Boppo', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-d0d86a96-eeb3-4db3-ba16-b6c9827a4b', 'Cunrat', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-eric', 'Egbert', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-gern', 'Gero', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-a-dsc05338-scaled', 'Hartmann', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-ingemardfdfdfdfd', 'Ingram', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-jo1', 'Jost', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-mari1', 'Markwart', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-pick-1', 'Meinhard', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-meinrad', 'Merbod', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-michineu', 'Mechthild', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-sdfqwef', 'Otfried', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-ola1', 'Ortwin', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-tho', 'Thiemo', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-2du', 'Dein Name ?', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-alisa', 'Adelheit', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-jas', 'Jutta', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-le', 'Liutgart', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-elaneues', 'Mathilde', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-sandra1', 'Sibilla', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-sus1', 'Sunnhild', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-sandra2', 'Sibilla', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-vroni2', 'Verena', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-marie', 'Margarethe', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-du1', 'Dein Name?', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-kindervv', 'unser Nachwuchs', 'Aktive Mitglieder'),
    ('vuozvolc-mitglied-baerbel', 'Bertrada', 'Aktive Mitglieder'),
    ('vuozvolc-ernaehrung-7r309187', 'Bild', 'WOHER WISSEN WIR, WAS MAN GEGESSEN HAT?'),
    ('vuozvolc-ernaehrung-22222222', 'Bild', 'WOHER WISSEN WIR, WAS MAN GEGESSEN HAT?'),
    ('vuozvolc-maennerkleidung-blh', 'Leibhemd', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-798', 'Leibhemd', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-88888', 'bruche', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-bbb', 'Beinlinge', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-cottemann', 'Beinlinge', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-c1m', 'Cotte', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-ekjwerkj', 'Cotte', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-45455', 'Cotte', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-bh1', 'Bundhaube', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-bd', 'Bundhaube', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-nmb2', 'Naalbindingmütze', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-fghkgkj', 'Naalbindingmütze', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-stro', 'Strohhut', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-shr', 'Strohhut', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-gg', 'Gugel', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-asdtg', 'Gugel', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-s7', 'Gugel', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-gk5', 'Gugel', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-adgtgj', 'Gugel', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-cc', 'Cappa', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-maennerkleidung-cedower', 'Cappa', 'Männerkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-nbskfb', 'Maciejowski-Bibel', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-nbsk', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-struempfe', 'Genähte Strümpfe aus pflanzengefärbtem Wollstoff', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-unterkleid1', 'Leibhemd', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-u1', 'Abbildung aus der Biblé Moraliseé', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-ela2', 'Kleid', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-cottefraumainzer', 'Mainzer Evangeliar', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-werqwrqrwerwer', 'Kleid', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-dfwer', 'Schlupfärmelkleid', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-schlupfi0001', 'Schlupfärmelkleid', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-dertwer', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-erwerwer', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-capparebecca', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-cao2', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-d', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-tz', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-wkt', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-wktb', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-44444', 'Wimpel', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-erer', 'Wimpel', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-jhz', 'Haarnetz', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-kh', 'Haarnetz', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-gkjff', 'Haarsack / Haube aus der Maciejowski-Bibel', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-kjsfsajfjlskdf', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-fg', 'Schleier und Gebende aus feinem gebleichtem Leinen', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-tr', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-sdss', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-frauenkleidung-bimos', 'Bild', 'Frauenkleidung im 13. Jahrhundert'),
    ('vuozvolc-naalbinding-99999', 'Bild', 'NAALBINDING / NADELBINDEN'),
    ('vuozvolc-naalbinding-9589', 'Bild', 'NAALBINDING / NADELBINDEN'),
    ('vuozvolc-naalbinding-787878', 'Bild', 'NAALBINDING / NADELBINDEN'),
    ('vuozvolc-still-und-schwangerschaftskleidung-xc', 'Bild', 'STILL UND SCHWANGERSCHAFTSKLEIDUNG – EIN PRAXISBERICHT'),
    ('vuozvolc-still-und-schwangerschaftskleidung-schwanger1-1', 'Bild', 'STILL UND SCHWANGERSCHAFTSKLEIDUNG – EIN PRAXISBERICHT'),
    ('vuozvolc-still-und-schwangerschaftskleidung-x1-jpg-resize-163-2c176-ssl-1', 'Liber at Honorem Augusti', 'STILL UND SCHWANGERSCHAFTSKLEIDUNG – EIN PRAXISBERICHT'),
    ('vuozvolc-still-und-schwangerschaftskleidung-we1', 'Bild', 'STILL UND SCHWANGERSCHAFTSKLEIDUNG – EIN PRAXISBERICHT'),
    ('vuozvolc-still-und-schwangerschaftskleidung-fe1-jpg-resize-170-2c181-ssl-1', 'Maciejowski-Bibel', 'STILL UND SCHWANGERSCHAFTSKLEIDUNG – EIN PRAXISBERICHT'),
    ('vuozvolc-still-und-schwangerschaftskleidung-sfasfasf-1', 'Bild', 'STILL UND SCHWANGERSCHAFTSKLEIDUNG – EIN PRAXISBERICHT'),
    ('vuozvolc-still-und-schwangerschaftskleidung-st-1', 'Bild', 'STILL UND SCHWANGERSCHAFTSKLEIDUNG – EIN PRAXISBERICHT'),
    ('vuozvolc-still-und-schwangerschaftskleidung-lin-1', 'Bild', 'STILL UND SCHWANGERSCHAFTSKLEIDUNG – EIN PRAXISBERICHT')
  ) as v(slot, label, page)
 where not exists (select 1 from public.site_images s where s.slot = v.slot);

-- --------------------------------------------------------------------------
--  3. Die Seiten
-- --------------------------------------------------------------------------

update public.site_pages
   set content = $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-1",
        "oberzeile": "promptus",
        "ueberschrift": "Willkommen beim Vuozvolc",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-2",
        "bildSchluessel": "vuozvolc-startseite-vuozvolc",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-3",
        "inhalt": "<p>Der Name <strong>V</strong><strong>uozvolc</strong>&nbsp;leitet sich aus dem Mittelhochdeutschen ab und bedeutet im militärischen Kontext „Infanterie“.<br>Diesen Namen wollen wir auf zwei Ebenen mit Leben füllen.<br>Die Gruppe <strong>Vuozvolc</strong> hat es sich zum Ziel gemacht, die Mitte der städtischen Bevölkerung in der zweiten Hälfte des 13. Jahrhunderts im Großraum Mainz/Köln/Trier in zivil darzustellen.</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-4",
        "bildSchluessel": "vuozvolc-startseite-dsc7563",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Ueberschrift",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "ueberschrift-5",
        "oberzeile": "über uns",
        "text": "Was wir sind",
        "groesse": "mittel",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-6",
        "inhalt": "<p>In Friedenszeiten gingen städtische Bürgerinnen und Bürger in der Regel einem „ehrbaren“ Handwerk oder Handel nach, welches wir bei <strong>Living History</strong>– und Museumsveranstaltungen, neben der Darstellung städtischer Infanterie gerne zeigen. Dabei arbeiten wir quellenorientiert und legen großen Wert darauf, dass die Kleidung, Alltagsgegenstände, mögliche Handwerksdarstellungen oder Waffen und Rüstungsteile dem zeitlichen Bezug entsprechen und durch zeitgenössische Quellen belegt sind.</p> <p>Um unser darstellerisches Niveau stets zu verbessern, arbeiten wir immer weiter an unserer Darstellung. Alle Mitglieder sind unserem eigenen&nbsp;Ausrüstungsleitfaden&nbsp;verpflichtet.</p> <p>Parallel zur oben genannten Darstellung ist vuozvolc auch im sogenannten „Reenactmentfechten“ aktiv.<br>Greifen wir hier zu den Waffen, sind wir ein ernst zu nehmender Partner und Gegner, der nach dem Regelwerk&nbsp;<strong>Codex Belli</strong>&nbsp;fair und sicher kämpft. Hier treten wir als organisierte Kämpfergruppe auf, die aus Nahkämpfern, Schützen sowie einem begleitenden Tross besteht.<br>Selbstverständlich gehört hierzu neben dem taktischen Können auch, dass wir als kämpfende Einheit einen stimmigen Eindruck hinsichtlich der Waffen, Rüstung und Ausrüstungsgegenstände bieten. Wir nehmen an Schlacht- oder Kampfveranstaltungen teil und organisieren unter unserem Banner eigene Kampftrainings für und mit befreundeten Gruppen.</p> <p>Wir sind eine Gruppe privater Menschen, die sich über ein Hobby definieren und kein&nbsp;eingetragener Verein im Sinne der&nbsp; DSGVO.</p> <p>&nbsp;</p> <h3><strong>– Vuozvolc –</strong></h3>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, is_published = true, published_at = now()
 where slug = 'startseite';

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('aktive-mitglieder', 'Aktive Mitglieder', $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-7",
        "oberzeile": "socius",
        "ueberschrift": "Aktive Mitglieder",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Karten",
      "props": {
        "breite": "breit",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "karten-8",
        "karten": [
          {
            "titel": "Berthold",
            "text": "Waffen, Knecht & Küche",
            "bildSchluessel": "vuozvolc-mitglied-basti-2",
            "ziel": ""
          },
          {
            "titel": "Boppo",
            "text": "Waffen & Rüstzeug",
            "bildSchluessel": "vuozvolc-mitglied-bos1",
            "ziel": ""
          },
          {
            "titel": "Cunrat",
            "text": "Feuerknecht",
            "bildSchluessel": "vuozvolc-mitglied-d0d86a96-eeb3-4db3-ba16-b6c9827a4b",
            "ziel": ""
          },
          {
            "titel": "Egbert",
            "text": "„Mädchen für alles“",
            "bildSchluessel": "vuozvolc-mitglied-eric",
            "ziel": ""
          },
          {
            "titel": "Gero",
            "text": "Waffen & Rüstung",
            "bildSchluessel": "vuozvolc-mitglied-gern",
            "ziel": ""
          },
          {
            "titel": "Hartmann",
            "text": "Scriptor",
            "bildSchluessel": "vuozvolc-mitglied-a-dsc05338-scaled",
            "ziel": ""
          },
          {
            "titel": "Ingram",
            "text": "Waffen & Rüstung",
            "bildSchluessel": "vuozvolc-mitglied-ingemardfdfdfdfd",
            "ziel": ""
          },
          {
            "titel": "Jost",
            "text": "Knecht",
            "bildSchluessel": "vuozvolc-mitglied-jo1",
            "ziel": ""
          },
          {
            "titel": "Markwart",
            "text": "Waffen & Rüstzeug",
            "bildSchluessel": "vuozvolc-mitglied-mari1",
            "ziel": ""
          },
          {
            "titel": "Meinhard",
            "text": "Wundarzt",
            "bildSchluessel": "vuozvolc-mitglied-pick-1",
            "ziel": ""
          },
          {
            "titel": "Merbod",
            "text": "Kochen & Rüstzeug",
            "bildSchluessel": "vuozvolc-mitglied-meinrad",
            "ziel": ""
          },
          {
            "titel": "Mechthild",
            "text": "Nähen & Sticken",
            "bildSchluessel": "vuozvolc-mitglied-michineu",
            "ziel": ""
          },
          {
            "titel": "Otfried",
            "text": "Kochen & Räuchern",
            "bildSchluessel": "vuozvolc-mitglied-sdfqwef",
            "ziel": ""
          },
          {
            "titel": "Ortwin",
            "text": "Rüstzeug",
            "bildSchluessel": "vuozvolc-mitglied-ola1",
            "ziel": ""
          },
          {
            "titel": "Thiemo",
            "text": "Minne & Dichtung",
            "bildSchluessel": "vuozvolc-mitglied-tho",
            "ziel": ""
          },
          {
            "titel": "Dein Name ?",
            "text": "Deine Fähigkeiten?",
            "bildSchluessel": "vuozvolc-mitglied-2du",
            "ziel": ""
          },
          {
            "titel": "Adelheit",
            "text": "Handarbeit & Kochen",
            "bildSchluessel": "vuozvolc-mitglied-alisa",
            "ziel": ""
          },
          {
            "titel": "Jutta",
            "text": "Scriptor & Spiele",
            "bildSchluessel": "vuozvolc-mitglied-jas",
            "ziel": ""
          },
          {
            "titel": "Liutgart",
            "text": "Handarbeiten",
            "bildSchluessel": "vuozvolc-mitglied-le",
            "ziel": ""
          },
          {
            "titel": "Mathilde",
            "text": "Färben & Nähen",
            "bildSchluessel": "vuozvolc-mitglied-elaneues",
            "ziel": ""
          },
          {
            "titel": "Sibilla",
            "text": "Weben & Handarbeiten",
            "bildSchluessel": "vuozvolc-mitglied-sandra1",
            "ziel": ""
          },
          {
            "titel": "Sunnhild",
            "text": "Handarbeiten",
            "bildSchluessel": "vuozvolc-mitglied-sus1",
            "ziel": ""
          },
          {
            "titel": "Sibilla",
            "text": "Nähen & Sticken",
            "bildSchluessel": "vuozvolc-mitglied-sandra2",
            "ziel": ""
          },
          {
            "titel": "Verena",
            "text": "Spinnen & Handarbeiten",
            "bildSchluessel": "vuozvolc-mitglied-vroni2",
            "ziel": ""
          },
          {
            "titel": "Margarethe",
            "text": "Färben & Handarbeiten",
            "bildSchluessel": "vuozvolc-mitglied-marie",
            "ziel": ""
          },
          {
            "titel": "Dein Name?",
            "text": "Deine Fähigkeiten?",
            "bildSchluessel": "vuozvolc-mitglied-du1",
            "ziel": ""
          },
          {
            "titel": "unser Nachwuchs",
            "text": "Unfug & Spiele",
            "bildSchluessel": "vuozvolc-mitglied-kindervv",
            "ziel": ""
          },
          {
            "titel": "Bertrada",
            "text": "Für immer in unseren Herzen",
            "bildSchluessel": "vuozvolc-mitglied-baerbel",
            "ziel": ""
          }
        ],
        "spalten": "drei"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title, content = excluded.content,
       is_published = true, published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('ernaehrung', 'Die Ernährung im 13./14. Jahrhundert', $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-9",
        "oberzeile": "Popup Picknics",
        "ueberschrift": "WOHER WISSEN WIR, WAS MAN GEGESSEN HAT?",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-10",
        "bildSchluessel": "vuozvolc-ernaehrung-7r309187",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-11",
        "inhalt": "<p><strong>Die Quellen:</strong><br>Wie auch mit allen anderen rekonstruierten Ausrüstungsgegenständen haben wir bei der Ernährung schriftliche, bildliche und archäologische Quellen. Während Abbildungen uns Aufschluss über Tischsitten und Arten der Anrichtung geben, sind archäobotanische Quellen besonders hilfreich, etwas über die Ernährung und damit der Lebenswelt im Mittelalter herauszufinden. Neben verkohlten Pflanzenresten sind es vor allem Kerne, Fruchtreste und Pollen aus Feuchtböden wie Brunnen oder Latrinen, die sich sehr genau datieren lassen. Dazu kommen Knochenreste, die von der Vielfalt der verzehrten Tierarten zeugen. Schriftliche Quellen wie Speisefolgen, Rezeptbücher, Pflanzenlisten, teilweise auch Verordnungen und Zeitzeugenberichte sind ebenso wertvoll, wenn sie reflektiert erforscht werden.</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    },
    {
      "type": "Ueberschrift",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "ueberschrift-12",
        "oberzeile": "",
        "text": "Gemüse",
        "groesse": "mittel",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-13",
        "inhalt": "<p>Die Bergung von Gemüsepflanzen ist selbst in Feuchtböden kaum möglich. Knollengemüse haben sich zum Teil erhalten, wie z.B Sellerie in Köln und Neuss im Spätmittelalter oder Pastinaken in Göttingen, Neuss und auf Burg Eschelbronn. Schriftliche Erwähnungen besonders vieler Gemüsepflanzen finden sich sehr früh z.B. im „Capitulare de villis – Karls des Großen“, dem „Klostergartenentwurf St. Galen“ (9.Jh.) oder in den Werken der Hildegard von Bingen (12. Jh.). Auf dieser Basis lassen sich im Hochmittelalter Gemüsesorten belegen wie z.B.: Rüben, Knoblauch, Kohl, Mangold, Ackerbohnen, Meerrettich, Porree, Spinat, Liebstöckel, Brennessel. (1)</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    },
    {
      "type": "Ueberschrift",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "ueberschrift-14",
        "oberzeile": "",
        "text": "Hülsenfrüchte",
        "groesse": "mittel",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-15",
        "inhalt": "<p>Auch Hülsenfrüchte spielen eine wichtige Rolle, weil sie getrocknet sehr lange haltbar sind und durch ihren Eiweißgehalt die getreidereiche Ernährung sinnvoll ergänzen. Linse, Erbse, Feld- und Ackerbohne sind mit den ersten Ackerbauern nach Europa gekommen und seitdem beständig nachweisbar. (2)</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    },
    {
      "type": "Ueberschrift",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "ueberschrift-16",
        "oberzeile": "",
        "text": "Getreide und Brot",
        "groesse": "mittel",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-17",
        "inhalt": "<p>Das Getreide ist unbestritten das wichtigste Grundnahrungsmittel. Mit dem guten Klima und den relativ stabilen politischen Verhältnissen wächst im Hochmittelalter die Bevölkerung stetig und der Getreideanbau erreicht einen Höhepunkt, wie zahlreiche Pollendiagramme anschaulich zeigen. Während im 13. Jh. neben Hafer, Hirse und Gerste, vor allem Weizen, Roggen und Dinkel die wichtigsten Getreidesorten sind, ist im Spätmittelalter eher der Roggen dominierend. Die wichtigsten Grundlagen, das Bäckerhandwerk zu erforschen, ist einerseits das Getreide und andererseits das Treibmittel. Außerdem gilt es die zeitgenössischen Formen des Backwerks festzustellen. Während einige Getreidesorten vor allem gekocht als Brei verzehrt wurden, wie z.B. Hafer, Gerste oder Hirse, sind andere besser als Rohstoff für Brote geeignet. Brot aus Hafer oder Gerste herzustellen ist allerdings auch durch Textquellen belegt:</p> <p>Gesammelte Aufsätze zur Brot- und Gebäckkunde und –geschichte 1940 – 1999 S. 590:&nbsp;</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-18",
        "inhalt": "<p>„…Dem Haferbrot muss also besonderer Nährwert zugesprochen worden sein. Durch die Frontes rerum Berensium (II 642) ist Haferbrot im Jahre 1266 auch im Kloster Interlaken belegt. „<br>Bevor das Brot mit Sauerteig getrieben wurde, hat man aus Getreidebrei dünne Fladen gebacken, die vermutlich den mittelamerikanischen Weizentortillias, dem türkischen Dürüm oder auch den französischen Crêpes geähnelt haben. Diese Form des Brotes blieb neben dem Sauerteigbrot erhalten. Hinweise darauf finden wir unter der Bezeichnung „fochanza“.<br>Gesammelte Aufsätze zur Brot- und Gebäckkunde und –geschichte 1940 – 1999 S. 590:</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-19",
        "bildSchluessel": "vuozvolc-ernaehrung-22222222",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-20",
        "inhalt": "<p>Es wurde erstmals im 11. Jh.von den Cot. Vat. 1701 und Clm. 14689 genannt. Der Name ist vom Lateinischen (focus= Herd, Pfanne, Feuer; span. Forgaza, frz. Fousse, ags. Foca) übernommen worden. Dieses Brot wurde ursprünglich aus Weizen in der Herdasche gebacken und im Spätmittelalter auch Aschebrot genannt. Teilweise entwickelte es sich aber zum Feinbrot, denn es wird in der mittelhochdeutschen Literatur „wiz alsam der sne“ gepriesen. Dabei durfte es sich um das „semalvochenza“ – Brot (also aus Weizen) gehandelt haben.<br>Im 12. und 13. Jahrhundert gibt es erste schriftliche und bildliche Quellen für aufgetriebenes Brot. Es ist sehr wahrscheinlich, dass diese Entwicklung mit dem herausbilden des Bäckerhandwerks in den wachsenden Städten einhergeht. Das Brot wurde in großen Mengen hergestellt und die Professionalisierung bewirkte eine Qualitätssteigerung der Produkte, so wie in vielen anderen Gewerken auch.Mitte 13. Jahrhundert.</p> <p>Bertholt von Regensburg. Predigten, Band 1, S. 16ff:<br>Trotz Lug und Trug, wir können Kaufleute nicht entbehren […] Denn es ist heutzutage Lug und Trug so allgemein verbreitet, dass sich niemand mehr dessen schämen will. So ist derjenige ein Betrüger bei seinem Handel, der Wasser für Wein verkauft und Luft für Brot anbietet, weil er es mit Hefe so auftreibt, dass es innen hohl wird. Und wenn der Käufer meint, er habe richtiges Brot, so ist es hohl und nur leere Rinde.[…]</p> <p>Bertold von Regensburg (gest. 1272) der Franziskanermönch predigte in Regensburg, Landshut, Speyer, Colmar, Zürich, Konstanz und Augsburg, ferner in Österreich, Böhmen und Ungarn.</p> <p>Gesammelte Aufsätze zur Brot- und Gebäckkunde und –geschichte 1940 – 1999 S. 591:</p> <p>Bruder Berthold von Regensburg vermerkte im 13. Jahrhundert (I, 301, 2 ff):“ daz daz brot (beim Abendmahl) in aller werlte deheiner andern slahte sin sol danne von weizen oder von weizen gesehlte, und sol derbe (ungesäuert) gebakken sin, ane gerwen, unde sinewel“. Demnach durfte also für das Abendmahl nur ungesäuertes Brot aus Weizen oder einer Weizenart (Dinkel) verwendet werden.</p> <p>Man verzichtete bewusst auf das Sauerteigbrot, eine Tradition die zur Abendmahlfeier bis heute beibehalten wurde. Im Laufe des 14. Jhd. werden die Brote großer und höher, die Formen vielfältiger. Auch tauchen hier zum ersten Mal Brötchen auf.</p> <p>Gesammelte Aufsätze zur Brot- und Gebäckkunde und –geschichte 1940 – 1999 S. 604:<br>…Das Alltagsbrot im 13. Jh. bestand aus flachen oder 4-5cm hohen Rundbroten oder solcher in kleinerer, halbkugeliger Form. Voll ausgebildete Rund- oder Langbrote traten erst im 15. Jh. auf…</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    },
    {
      "type": "Ueberschrift",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "ueberschrift-21",
        "oberzeile": "",
        "text": "Entwicklung des Fleischkonsums",
        "groesse": "mittel",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-22",
        "inhalt": "<p>In allgemeinen Werken zum mittelalterlichen Alltag wird oft ein recht hoher Fleischkonsum von 100kg pro Kopf und Jahr angenommen. Man muss diese Zahl etwas weiter in Zeitabschnitten und soziale Stellung der Menschen differenzieren.<br>Im Hochmittelalter kann man insgesamt, vor allem bei der Landbevölkerung einen sehr geringen Fleischkonsum anehmen. Der Getreideanbau spielt die übergeordnete Rolle. Rinder werden eher lange als Arbeitstiere gebraucht. Im Herbst wird Vieh geschlachtet um den restlichen Bestand durch den Winter zu bringen. Nur nach der Schlachtung kann frisches Fleisch zubereitet werden, danach steht logischerweise nur noch Pökelfleisch, Wurst und Schinken zur Verfügung. (3)<br>Nach der Agrarkrise in der ersten Hälfte des 14. Jhd. sinkt die Bevölkerung zwischen 1340 und 1440 von 53,9 auf 37 Mio. angenommene Einwohner in Europa durch Hunger und Pest. Zahlreiche Dörfer fallen in dieser Zeit wüst. Die Viehwirtschaft tritt allerdings deutlich in den Vordergrund und es entsteht ein florierender, europaweiter Viehhandel, um vor allem die aufblühenden Städte mit Fleisch zu versorgen. Hier kann der Prokopfverbrauch auch deutlich über dem heutigen liegen. (4)<br>Bei den obersten Ständen spielt Fleisch eine besonders wichtige Rolle, wie Berichte von Festtagsspeisen deutlich zeigen. Der Konsum wird aus Genuss und Prestige auf die Spitze getrieben.&nbsp;</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    },
    {
      "type": "Ueberschrift",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "ueberschrift-23",
        "oberzeile": "",
        "text": "Fisch",
        "groesse": "mittel",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-24",
        "inhalt": "<p>Um zu sehen in welchem Umfang mit Fisch, vor allem Stockfisch und Hering gehandelt wurde, kann man z.B. an den Zolleinnahmen der Stadt Lübeck erkennen. Zwischen 1398 und 1400 wurden 69.975,5 und 81.172,5 Tonnen Hering eingeschifft und umgeschlagen. Die Einfuhr des Stockfisches machte 90% des Handelsvolumens zwischen Bergen und Lübeck aus.(5)</p> <p>Neben dem Großhandel mit Salzwasserfisch ergänzt natürlich auch der örtliche Süßwasserfisch die Speisekarte. Sogar Fischteiche werden schon seit dem Frühmittelalter angelegt um die Versorgung zu sichern.</p> <p>Der hohe Fischkonsum lässt sich unter anderem mit den zahlreichen kirchlichen Fastentagen erklären. Während der eingehandelte Hering gepökelt und der Stockfisch getrocknet war, konnte im Binnenland auch der frisch gefangene Fisch gegrillt, gebraten oder gebacken werden. Die vielfältigen Zubereitungsarten werden in den frühen Kochbüchern des Spätmittelalters aufgeführt, wie beispielsweise im „buoch von guoter spise“</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title, content = excluded.content,
       is_published = true, published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('maennerkleidung', 'Männerkleidung im 13. Jahrhundert', $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-25",
        "oberzeile": "Hominum indumenta in 13th century",
        "ueberschrift": "Männerkleidung im 13. Jahrhundert",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-26",
        "bildSchluessel": "vuozvolc-maennerkleidung-blh",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-27",
        "bildSchluessel": "vuozvolc-maennerkleidung-798",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-28",
        "bildSchluessel": "vuozvolc-maennerkleidung-88888",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-29",
        "bildSchluessel": "vuozvolc-maennerkleidung-bbb",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-30",
        "bildSchluessel": "vuozvolc-maennerkleidung-cottemann",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-31",
        "bildSchluessel": "vuozvolc-maennerkleidung-c1m",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-32",
        "bildSchluessel": "vuozvolc-maennerkleidung-ekjwerkj",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-33",
        "bildSchluessel": "vuozvolc-maennerkleidung-45455",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-34",
        "bildSchluessel": "vuozvolc-maennerkleidung-bh1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-35",
        "bildSchluessel": "vuozvolc-maennerkleidung-bd",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-36",
        "bildSchluessel": "vuozvolc-maennerkleidung-nmb2",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-37",
        "bildSchluessel": "vuozvolc-maennerkleidung-fghkgkj",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-38",
        "bildSchluessel": "vuozvolc-maennerkleidung-stro",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-39",
        "bildSchluessel": "vuozvolc-maennerkleidung-shr",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-40",
        "bildSchluessel": "vuozvolc-maennerkleidung-gg",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-41",
        "bildSchluessel": "vuozvolc-maennerkleidung-asdtg",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-42",
        "bildSchluessel": "vuozvolc-maennerkleidung-s7",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-43",
        "bildSchluessel": "vuozvolc-maennerkleidung-gk5",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-44",
        "bildSchluessel": "vuozvolc-maennerkleidung-adgtgj",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-45",
        "bildSchluessel": "vuozvolc-maennerkleidung-cc",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-46",
        "bildSchluessel": "vuozvolc-maennerkleidung-cedower",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-47",
        "inhalt": "<p><strong>WAS TRUG DER MANN&nbsp;IM 13. JAHRHUNDERT?</strong></p> <p>Eine kurze&nbsp; Zusammenfassung:</p> <p>Wenn man sich zeitgenössische Abbildungen anschaut, verhält es sich bei der Männerkleidung ähnlich wie bei der Damenkleidung. Auf den ersten Blick sehen sie alle recht gleich aus.</p> <p>Jedoch gibt es zu den regionalen Unterschieden der Tracht auch verschiedene Qualitäten der Verarbeitung, der Stoffqualität, der Farben und der Schnitte. Der auffälligste Unterschied liegt in der gerne auch mal knöchellangen Kleidung der höhergestellen Herren, während die einfache Bevölkerung eher knielange Kittel trugen. Zudem waren die Farben, Stoffe und Schnittformen in den niederen Ständen einfacher gehalten.</p> <p>Da unsere Gruppe das städtische Umfeld gewählt hat, werden wir in den Artikeln zur Kleidung nur den einfachen, bis „gut bürgerlichen“ Stand beschreiben. Regional orientieren wir uns meist am Kölner Raum. Leider gibt es nicht für alles einen regionalen Fund oder eine passende Abbildung. Hier greifen wir dann auf entferntere, jedoch verwandte Regionen zurück.</p> <p>Hier möchten wir anhand von ein paar Beispielen Kleidung aus der Mitte bis Ende des 13. Jahrhunderts vorstellen. Alle hier von uns vorgestellten Kleidungsstücke, wurden von unseren Mitgliedern hergestellt. Sie sind handgenäht und die farbigen Wollstoffe wurden mit Pflanzenfarben gefärbt.</p> <p>Die&nbsp;<strong>Unterwäsche&nbsp;</strong>der Männer bestand aus einem Leibhemd und einer Bruche ( Unterhose) aus ungefärbtem Leinen, sowie&nbsp;Beinlingen aus Wolle.</p> Andreas trägt auf diesem Foto ein&nbsp;<strong>Leibhemd&nbsp;</strong>und eine&nbsp;<strong>Bruche</strong>&nbsp;aus ungebleichtem Leinen. Diese Abbildung zeigt einen Mann im Leibhemd, und ist aus einer Buchmalerei um 1265 aus Österreich. Eine passende Abbildung als Beispiel für eine Bruche sieht man hier aus der Handschrift „Heisterbacher Bibel“&nbsp;die aus der Zeit um 1240 stammt, und wahrscheinlich im Kölner Raum entstanden ist. <p>Die&nbsp;<strong>Beinlinge,&nbsp;</strong>die hier links zu sehen sind, wurden aus einem gewebten und&nbsp; pflanzengefärbtem Wollstoff genäht. Die Beinlinge werden mit einem Band an einem Gürtel über der Bruche , oder&nbsp;an der Bruche befestigt.&nbsp;<br>Die Abbildung rechts, auf der man rote Beinlinge erkennen kann, stammt aus dem „Mainzer Evangeliar“ entstanden um 1250.</p> <p>Die&nbsp;<strong>Oberbekleidung&nbsp;</strong>der Männer bestand aus Wolle, und beim Adel und den reichen Patriziern&nbsp;auch aus Seide (Brokat, Seidensamit u.a). Die nicht ganz so wohlhabenden Menschen trugen einfache (heimische) Farben oder ungefärbte Wolle (z.B. die braune oder graue Wolle der dunklen Schafe). Wer sich etwas mehr leisten konnte, zeigte das auch durch teurere Stoffe und Farben. Z.B. Doppelfärbungen (beispielsweise kräftiges Grün durch gelb/blau Färbungen) oder&nbsp; kostbarer Importfarbstoffe</p> Michael trägt hier einen&nbsp;<strong>Kittel&nbsp;</strong>aus pflanzengefärbter Wolle. Er&nbsp;ist einfach geschnitten und hat seitlich zwei eingesetzte Keile (Geren). Die Abbildung hier stammt von einer Deckenmalerei um 1280, aus der Kirche „Maria Lyskirchen“ in Köln. Diese hier ist aus der „Heisterbacher Bibel“ <p><strong>Kopfbedeckungen&nbsp;</strong>bei Männern<br>Männer trugen wie Frauen auch oft Kopfbedeckungen als Schutz vor Asche, Schmutz und Läusen, sowie als Kälteschutz. <br>Das konnte beispielsweise eine Bundhaube aus Leinen sein, oder auch eine<br>nadelgebundene Wollmütze.</p> Hier trägt Franz auf dem linken Foto <br>eine&nbsp;<strong>Bundhaube&nbsp;</strong>aus ungebleichtem Leinen,<br>die Abbildung rechts stammt wieder aus Köln, Deckenmalerei Kirche Maria Lyskirchen. Eine weitere Möglichkeit einer Kopfbedeckung ist <br>eine&nbsp;<strong>nadelgebundene</strong>&nbsp;<strong>Wollmütze</strong>. <br>Johannes trägt hier auf dem linken Bild eine<br>Naalbindingmütze aus naturbrauner Wolle. <br>Einen kleinen Artikel zum Thema <br>Naalbinding findet ihr&nbsp;<strong>hier&nbsp;</strong>bei uns.<br>Die Figur rechts trägt eine Mütze, die als nadelgebunden interpretiert wird. Sie stammt vom Elisabethschrein in Marburg um 1235 AD. Eine Möglichkeit des&nbsp;<strong>Sonnenschutzes</strong><br>ist&nbsp; ein Hut aus geflochtenen Binsen. <br>Hier zu sehen bei Johannes auf dem linken Foto, <br>rechts die Abbildung zeigt einen Hut aus der Maciejowski-Bibel. <p>Der Wetterschutz (<strong>Überbekleidung</strong>) der einfachen Bevölkerung, bestand aus einem weiteren Kittel,<br>einer Cappa und ggf. einer Gugel.<br>Die Cappa kann man in ovaler oder rechteckiger Form erkennen. Praktisch an einer Cappa ist, dass<br>– egal in welcher Variante – die Bewegungsfreiheit der Arme erhalten bleibt.<br>Ebenfalls dem Wetterschutz diente die Gugel. Diese konnte einzeln oder zusammen mit einer Cappa getragen werden.<br>Die Gugel sieht man in kurzer und eckiger Form, oder auch von einer Länge die bis über die Schultern<br>reichte und zusätzlich zum Hals auch die Schultern wärmte.</p> Die&nbsp;<strong>Gugel&nbsp;</strong>die Franz auf dem linken<br>Foto trägt, <br>hat eine längere Form und ist aus gefütterter Wolle, <br>wie auf der Abbildung rechts aus der Maciejowski-Bibel <br>ebenfalls zu erkennen ist. Die kürzere Gugelform sieht man hier einmal bei Sascha in aufgesetzer Form auf der linken Seite, mittig bei Michael einmal abgesetzt wie auch auf der Abbildung der Maciejowski-Bibel im rechten Bild zu sehen.<br> Die&nbsp;<strong>Cappa&nbsp;</strong>rechts auf der Abbildung ist aus dem Mainzer Evangeliar, Bossel trägt auf dem Foto links eine rechteckige Cappa aus pflanzengefärbtem Wollstoff. <p>Copyright © 2024 Vuozvolc<br>Autoren: Manuela Helzer, Hannah Bender 2012</p> <p>&nbsp;</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title, content = excluded.content,
       is_published = true, published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('frauenkleidung', 'Frauenkleidung im 13. Jahrhundert', $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-48",
        "oberzeile": "Mulierum indumentis in Saeculum 13",
        "ueberschrift": "Frauenkleidung im 13. Jahrhundert",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-49",
        "bildSchluessel": "vuozvolc-frauenkleidung-nbskfb",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-50",
        "bildSchluessel": "vuozvolc-frauenkleidung-nbsk",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-51",
        "bildSchluessel": "vuozvolc-frauenkleidung-struempfe",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-52",
        "bildSchluessel": "vuozvolc-frauenkleidung-unterkleid1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-53",
        "bildSchluessel": "vuozvolc-frauenkleidung-u1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-54",
        "bildSchluessel": "vuozvolc-frauenkleidung-ela2",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-55",
        "bildSchluessel": "vuozvolc-frauenkleidung-cottefraumainzer",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-56",
        "bildSchluessel": "vuozvolc-frauenkleidung-werqwrqrwerwer",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-57",
        "bildSchluessel": "vuozvolc-frauenkleidung-dfwer",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-58",
        "bildSchluessel": "vuozvolc-frauenkleidung-schlupfi0001",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-59",
        "bildSchluessel": "vuozvolc-frauenkleidung-dertwer",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-60",
        "bildSchluessel": "vuozvolc-frauenkleidung-erwerwer",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-61",
        "bildSchluessel": "vuozvolc-frauenkleidung-capparebecca",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-62",
        "bildSchluessel": "vuozvolc-frauenkleidung-cao2",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-63",
        "bildSchluessel": "vuozvolc-frauenkleidung-d",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-64",
        "bildSchluessel": "vuozvolc-frauenkleidung-tz",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-65",
        "bildSchluessel": "vuozvolc-frauenkleidung-wkt",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-66",
        "bildSchluessel": "vuozvolc-frauenkleidung-wktb",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-67",
        "bildSchluessel": "vuozvolc-frauenkleidung-44444",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-68",
        "bildSchluessel": "vuozvolc-frauenkleidung-erer",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-69",
        "bildSchluessel": "vuozvolc-frauenkleidung-jhz",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-70",
        "bildSchluessel": "vuozvolc-frauenkleidung-kh",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-71",
        "bildSchluessel": "vuozvolc-frauenkleidung-gkjff",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-72",
        "bildSchluessel": "vuozvolc-frauenkleidung-kjsfsajfjlskdf",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-73",
        "bildSchluessel": "vuozvolc-frauenkleidung-fg",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-74",
        "bildSchluessel": "vuozvolc-frauenkleidung-tr",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-75",
        "bildSchluessel": "vuozvolc-frauenkleidung-sdss",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-76",
        "bildSchluessel": "vuozvolc-frauenkleidung-bimos",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-77",
        "inhalt": "<p>Eine kurze&nbsp; Zusammenfassung:</p> <p>Wenn man sich zeitgenössische Abbildungen anschaut, sehen viele Kleider der Damen auf den ersten Blick recht gleich aus. Jedoch gibt es regionale Unterschiede und auch verschiedene Qualitäten der Verarbeitung, der Stoffqualität, der Farben und der Schnitte. Zum Beispiel ist bei der Kleidung der höher gestellten Damen mehr Saumweite und eine Überlänge zu erkennen, die Farben sind kräftiger und kostbarer. Die Damen der einfachen Bevölkerung&nbsp;tragen schlichtere Farben und einfache Schnitte ohne überflüssigen Stoffverbrauch.</p> <p>Da&nbsp;unsere Gruppe das städtische Umfeld &nbsp;gewählt hat, werden wir auch hier in den Artikeln zur Kleidung nur den einfachen, bis „gut bürgerlichen“ Stand beschreiben. Regional orientieren wir uns meist am Kölner Raum. Leider gibt es nicht für alles einen regionalen Fund oder eine passende Abbildung. Hier greifen wir dann auf entferntere, jedoch verwandte Regionen zurück.</p> <p>Nachfolgend möchten wir anhand einiger Beispiele Kleidung aus der Mitte bis Ende des 13. Jahrhunderts vorstellen. Alle hier von uns vorgestellten Kleidungsstücke wurden von unseren Mitgliedern hergestellt. Sie sind handgenäht und die farbigen Wollstoffe wurden mit Pflanzenfarben gefärbt.</p> <p>Die&nbsp;<strong>Unterwäsche</strong>&nbsp;der Frauen bestand aus einem Unterkleid aus Leinen und Strümpfen aus Wolle. Diese waren genäht oder nadelgebunden. Weitere Unterwäsche ist uns zu dieser Zeit nicht bekannt.</p> <p>Eine der seltenen Abbildungen von&nbsp;<strong>Strümpfen&nbsp;</strong>aus dem 13. Jhdt. ist aus der Maciejowski-Bibel (1250 AD;<br>Frankreich ). Hier könnte es sich um nadelgebundene Strümpfe handeln – wie das Muster gedeutet werden mag. Weitere Abbildungen genähter Strümpfe gibt es noch aus dem 14. oder 15. Jhdt. Textilfunde genähter Strümpfe gibt es leider nur im hohen klerikalen Bereich.</p> Maciejowski-Bibel Nadelgebundene Kniestrümpfe<br>aus naturbrauner Wolle Genähte Strümpfe aus pflanzengefärbtem<br>Wollstoff <p>Die&nbsp;<strong>Oberbekleidung&nbsp;</strong>der Frauen bestand aus gewebter Schafwolle und&nbsp;beim Adel und den reichen Patriziern auch aus Seide (Brokat, Seidensamit u.a). Die einfache Bevölkerung&nbsp; trug einfache und&nbsp; günstige Farben oder ungefärbte Wolle (z.B. die braune oder graue Wolle der dunklen Schafe). Wer sich etwas mehr leisten konnte, zeigte das auch gerne durch kostspieligere Farben; z.B. Doppelfärbungen (kräftiges Grün durch gelb/blau-Färbungen) oder&nbsp; kostbarer Importfarbstoffe.</p> <p>Das&nbsp;<strong>Leibhemd&nbsp;</strong>von Manuela auf dem Foto links unten ist aus ungebleichtem Bauernleinen.<br>Die Abbildung unten&nbsp;stammt aus der Biblé Moralisee (1220/1230; Frankreich).<br>Einen Schnittvorschlag für ein Kleid dieser Art findet Ihr hier&nbsp;( Kleid der hl. Elisabeth)</p> Leibhemd aus<br>ungebleichtem Leinen Abbildung aus der Biblé Moraliseé <p>Hier sieht man auf dem linken Bild Manuela in einem einfachen&nbsp;<strong>Kleid / Cotte&nbsp;</strong>aus brauner Wolle. Der Schnitt ist wie bei dem oben bereits geschriebenen Link ähnlich dem des erhaltenen Kleides der hl. Elisabeth. Die Abbildung in der Mitte zeigt eine Frau aus einer&nbsp;dem Mainzer Evangeliar um 1250 AD.<br>Rebecca trägt auf dem Foto rechts eine ebenso einfach geschnittene Wollcotte mit seitlich zwei eingesetzten Keilen.&nbsp;</p> Kleid aus pflanzengefärbter Schurwolle Dame mit Kleid – Mainzer Evangeliar Kleid aus pflanzengefärbter Schurwolle <p>Eine weitere Variation eines Oberkleides ist im 13. JHD das sogenannte&nbsp;<strong>Schlupfärmelkleid</strong>. Auf dem Foto links trägt Kathrin ein solches Kleid, bei dem die Ärmel variabel an oder ausgezogen getragen werden können. Sie hat hier ihre Ärmel hinter dem Rücken verknotet.<br>Abbildungen hierzu kennen wir z.B. aus dem Goslarer Evangeliar um 1240, sowie aus Frankreich aus der Maciejowski-Bibel und der Bible Moralisée. Hier rechts nun eine Abbildung aus dem Goslarer Evangeliar.</p> Schlupfärmelkleid aus pflanzengefärter Wolle Schlupfärmelkleid – Goslarer Evangeliar <p>Rechts auf den Bildern erkennt man an Rebecca einmal die angezogene und auf dem linken Foto auch die ausgezogene Variante. Zum arbeiten kann man die Ärmel einfach hinter dem Rücken verknoten.</p> <p>Als Wetterschutz (<strong>Überbekleidung</strong>) trug die einfache Frau ein weiteres Kleid als Überkleid, oder auch eine&nbsp;<strong>Cappa</strong>. Die Cappa gab es in ovaler oder rechteckiger Form. Praktisch an der Cappa ist , dass – egal in welcher Variante – die Bewegungsfreiheit der Arme erhalten bleibt.&nbsp;Rebecca trägt auf dem linken Foto eine ovale&nbsp;Cappa aus pflanzengefärbter Wolle. Die Abbildung&nbsp;rechts daneben&nbsp;ist aus dem Mainzer Evangeliar.</p> Cappa in ovaler Form, pflanzengefärbte Schurwolle Cappa in ovaler Form – Mainzer Evangeliar <p>Die&nbsp;<strong>Kopfbedeckungen&nbsp;</strong>im 13. Jahrhundert sind sehr vielfältig. Ohne ein Kopftuch, einen Schleider, ein Gebende o.ä. sieht man nur junge Frauen, oft adeliger Herkunft. Hier werden dann die Haare grundsätzlich lang getragen – oft geflochten, oder mit einem Stirnreifen bedeckt. Auf den vielfältigen Abbildungen sind die Kopfbedeckungen meistens einfarbig hell dargestellt. Aus Textbelegen kennt man jedoch auch Hinweise auf farbigen Kopfputz. Materialien sind hier Leinen, Seide und leichtes Wolltuch.</p> <p>Hier zeigen wir euch einige Kopfbedeckungen als Beispiel:</p> Kopftuch aus ungebleichtem Leinen Kopftuch aus der Biblé Moralisee Wickelkopftuch aus Leinen Wickelkopftuch aus der&nbsp;Maciejowski-Bibel Wimpel aus leichtem Wolltuch Wimpel aus der Biblé Moralisee Haarnetz aus feinem Leinengarn in Filettechnik mit Leinengebende Haarnetz mit Gebende,<br>Elisabethschrein Marburg nach 1235 Haarsack / Haube<br>aus ungebleichtem<br>Leinen Haarsack / Haube aus der Maciejowski-Bibel Schleier und Gebende aus feinem gebleichtem Leinen Schleier mit Gebende,<br>Mainzer Evangeliar um 1250 Schleier aus feinem gebleichtem Leinen Schleier aus der Biblé Moralisee <p>Autorinnen: Manuela Helzer, Hannah Bender, 2024<br>Copyright © 2016 Vuozvolc</p> <p>&nbsp;</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title, content = excluded.content,
       is_published = true, published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('naalbinding', 'Naalbinding / Nadelbinden', $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-78",
        "oberzeile": "NAAL OBLIGATIO",
        "ueberschrift": "NAALBINDING / NADELBINDEN",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-79",
        "bildSchluessel": "vuozvolc-naalbinding-99999",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-80",
        "bildSchluessel": "vuozvolc-naalbinding-9589",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-81",
        "bildSchluessel": "vuozvolc-naalbinding-787878",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-82",
        "inhalt": "<p>Naalbinding (oder Nadelbinden) gibt es schon viel länger als Häkeln oder Stricken. Nach archäologischen Funden in Nordeuropa und Ägypten gilt es als erwiesen, dass Naalbinding bereits in der Bronzezeit ausgeübt wurde. Aber auch heute ist das Interesse an dieser Handarbeit stetig wachsend, nicht zuletzt durch eine starke Living-History und Re-enactment Bewegung.</p> <p>Auch in den skandinavischen Ländern erfreut sich das Nadelbinden einer ungebrochenen Beliebtheit. Wie es die, traditionell zur schwedischen Tracht gehörenden, nadelgebundenen und aufwendig bestickten Schmuckhandschuhe zeigen.</p> <p>Naalbinding ist dem heutigen Stricken oder Häkeln nur entfernt ähnlich. Der Wollfaden wird mit der Nadel (gefunden wurden Holz-, Horn- oder Knochennadeln), nach bestimmten Stichen durch rückwärtige Schlingen geführt. Dabei kann man nach der Freihandmethode oder der Daumenfessel-Methode arbeiten.<br>Optisch gesehen ist das Nadelbinden so eher dem Nähen ähnlich, wobei keine fertigen Textilteile miteinander verbunden werden, sondern durch den Vorgang Schlinge an Schlinge zu setzen ein neues textiles Gewebe entsteht.<br>Durch die einzelnen Schlingen, entstehen entgegen dem Maschengewebe beim Häkeln oder Stricken eine Reihe einzelner Verknotungen. Das macht ein, in der Nadelbinde-Technik gearbeitetes Textilstück deutlich haltbarer und stabiler.</p> <p>In Deutschland extistierte das Nadelbinden noch etwa 300 Jahre neben dem Stricken weiter – also etwa bis 1550 n. Ch. Gearbeitet wird überwiegend in einem spiralförmigen Aufbau von Schlingenketten, die gleichzeitig mit ihrem Entstehen durch einen Verbindungsstich miteinander verbunden werden.<br>Gearbeitet wird mit einem endlichen Faden, also nicht direkt von einem Knäuel herunter wie man es von Stricken oder Häkeln her kennt. Dadurch wird die Arbeit deutlich langwieriger und man erzielt nicht ganz so schnelle sichtbare Erfolge.<br>Der Hauptteil der deutschen Nadelbinder greift deshalb auf sehr dicke Wolle zurück um sich die Arbeit zu erleichtern.<br>Ist man aber, gerade im Living-History-Bereich, daran interessiert möglichst geschichtsnah zu arbeiten sollte man bestrebt sein verzwirnte, recht dünne Wolle zu verwenden, da dies der gegebenen Fundlage entspricht.</p> <p>Es gibt historische Funde von Handschuhen, Socken, Mützen, Milchsieben aus Tierhaar, die in dieser Art gearbeitet sind. Es gibt aber auch Funde von jacken- und hemdähnlichen Textilien in Nadelbindetechnik, die höchstwahrscheinlich in Hin- und Her-Reihen gearbeitet sind.</p> <p>Nachgewiesen sind kleine Textilen wie die wikingerzeitliche Socke von York oder die Handschuhe aus Riga. Als Material ist in erster Linie Wolle nachgewiesen, aber auch Pferdehaar wie bei einem Milchsieb aus Lappland oder Leinen wie bei schweizer Pontifikalstrümpfen.<br>Neben groben Alltagsstücken gibt es einen besonderen Fund. Zum Mantel aus dem um 1000 datierten Männergrab von Mammen gehört ein Bindeband mit filigranen Einsätzen aus Goldlahnfäden in der komplizierten Nadelbindevariante.</p> <p><em>Weiterführende Literatur:<br>Ulrike Claßen-Büttner Nadelbinden- Was ist denn das?<br>ISBN: 9783848201242</em></p> <p>Autorin des Artikels: ©Rebecca Weber 2024</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title, content = excluded.content,
       is_published = true, published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('still-und-schwangerschaftskleidung', 'Still- und Schwangerschaftskleidung', $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-83",
        "oberzeile": "MATERNITAS VESTIMENTUM",
        "ueberschrift": "STILL UND SCHWANGERSCHAFTSKLEIDUNG – EIN PRAXISBERICHT",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-84",
        "bildSchluessel": "vuozvolc-still-und-schwangerschaftskleidung-xc",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-85",
        "bildSchluessel": "vuozvolc-still-und-schwangerschaftskleidung-schwanger1-1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-86",
        "bildSchluessel": "vuozvolc-still-und-schwangerschaftskleidung-x1-jpg-resize-163-2c176-ssl-1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-87",
        "bildSchluessel": "vuozvolc-still-und-schwangerschaftskleidung-we1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-88",
        "bildSchluessel": "vuozvolc-still-und-schwangerschaftskleidung-fe1-jpg-resize-170-2c181-ssl-1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-89",
        "bildSchluessel": "vuozvolc-still-und-schwangerschaftskleidung-sfasfasf-1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-90",
        "bildSchluessel": "vuozvolc-still-und-schwangerschaftskleidung-st-1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Einzelbild",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "einzelbild-91",
        "bildSchluessel": "vuozvolc-still-und-schwangerschaftskleidung-lin-1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-92",
        "inhalt": "<p>Als ich wusste, dass wir ein Sommerkind bekommen, grübelte ich darüber, was ich mit dem dicken Schwangerschaftsbauch auf unseren Veranstaltungen tragen könnte. Es war mir schnell klar, dass ein neues Kleid her musste, mit dem ich durch die Schwangerschaft kommen würde, egal mit welchem Bauchumfang.</p> <p>Als Grundschnitt für meine einfachen Kleider, nehme ich meist diesen&nbsp;hier&nbsp;(Kleid der Eisabeth von Thüringen).</p> <p>Jedoch wollte ich diesmal beachten, dass „vorneherum“ mehr Volumen vorhanden sein würde als hinten. Also habe ich den Schnitt so erstellt, dass die Vorderseite ein Stückchen länger war als die Rückseite. Insgesamt habe ich das Kleid auch etwas länger gelassen als bei der ersten Anprobe (im ca 4. Monat) da durch den, erwartungsgemäß wachsenden Bauch, das Ganze noch ein Stück hochrutschen würde.<br>Um noch ein wenig mehr Platz auf der Vorderseite zu haben, wurden zusätzlich zu den Seitengeren auch vorne und hinten Geren eingesetzt. Vorne genau dort, wo der Bauch beginnen würde, also ein kleines Stück unter der Brust.&nbsp;Also ähnlich wie&nbsp;hier&nbsp;jedoch etwas höher angesetzt.</p> <p>Mit diesem Schnitt bin ich dann auch gut durch die Schwangerschaft gekommen. Links&nbsp;ein&nbsp;Bild, als&nbsp;ich im 6. Monat schwanger war.</p> <p>Da ich jedoch auch in der Schwangerschaft die Finger nicht vom Färbetopf lassen konnte, habe ich versucht mein altes Arbeitskleid anzuziehen.<br>Es war zwar etwas kürzer, aber passte durchaus über den Bauch und war somit ebenfalls schwangerschaftsgeeignet.</p> <p>Es ist relativ weit geschnitten, hat aber nur zwei Geren an der Seite, die direkt unter den Armen eingesetzt wurden.</p> <p>Eigentlich war es als bequemes Arbeitskleid gedacht, oder auch, um als Kälteschutz über ein anderes Kleid getragen zu werden.</p> <p>Aus dieser Erfahrung heraus ergab sich die Frage danach, ob es im<br>13. Jahrhundert überhaupt spezielle Schwangerschaftskleidung gab.<br>Ich könnte mir vorstellen, dass es nicht so war.<br>Der historische Schnitt einer Cotte lässt, mit entsprechender Weite, auch einen sehr voluminösen Babybauch zu. Ein „besonderer Schnitt“&nbsp; ist für einen dicken Bauch nicht wirklich nötig.</p> <p>Für die Stillzeit habe ich mir die Kleiderfrage dann jedoch etwas problematischer vorgestellt.<br>Da für eine Darstellung im 13. Jahrhundert ein geschnürtes Oberkleid nicht in Frage kommt, musste eine andere Lösung her. Wie sollte es nur funktionieren, wenn man das Oberteil weder hinunter ziehen, noch aufmachen kann?<br>Funde zur Stillkleidung sind mir keine bekannt, Abbildungen hierzu leider recht spärlich und lassen nicht wirklich erkennen wie die Kleider geschnitten wurden.</p> <p>Als Beispiel hier eine Abbildung aus dem&nbsp; Liber at Honorem Augusti ( 12. Jhdt. )<br></p> <p><em>Liber at Honorem Augusti</em></p> <p>Es scheint, als hätte die Dame mittig einen Querschlitz im Kleid. Da mir solche Schlitze im geschlossenen Zustand jedoch noch auf keiner anderen Abbildung aufgefallen sind, war mir das eine Bild für meine eigene Darstellung zu wage.<br>Eine Abbildung aus dem 13. Jhdt. *, auf dem man ebenfalls eine stillende Frau sieht, erschien mir sinnvoller. Jedoch scheint dies „nur“ das Unterkleid zu sein.<br><br><em>Psalter, Östereich<br>cod. 1898; fol. 179v<br>1295-1300</em></p> <p>Anhand dieser&nbsp; Abbildung habe ich dann mein altes Unterkleid mittig ca. 30 cm geschlitzt.&nbsp; Damit es unter der Kleidung nicht hin und her rutscht, habe ich zwei Bändchen an die oberen Enden genäht und damit zugeknotet.</p> <p>Mein Oberkleid wollte ich nun nicht so weit schlitzen, auch wenn mir der Gedanke bei einer Abbildung aus derMaciejowski-Bibel&nbsp;kam.</p> <p>Die hier dargestellte Amme hat doch einen deutlichen Schlitz am Ausschnitt…..jedoch war auch dies alleine mir zu wage.<br>Eine weitere Theorie ist das Schlupfärmelkleid. Es ist in der Achsel ja offen, damit man bei Bedarf die Ärmel an bzw. aus ziehen kann. Hier muss keine zusätzliche Öffnung geschaffen werden. Bei einem recht weiten Ausschnitt, kann man somit den Schlitz des Unterkleides zum stillen erreichen. &nbsp;Ich stellte es mir jedoch etwas kompliziert vor, das ganze nur von der Seite anzugehen.</p> <p>Also habe ich die Entscheidung heraus gezögert bis es so weit war, und bin dann ganz pragmatisch bei der Variante des „Schwangerschaftskleides“ geblieben. Da das Kleid weit genug war meinen Baby-Bauch zu umfassen, ist auch jetzt genug Spielraum, es zum Stillen bei Seite zu schieben. Das Ganze hat auch nach kurzer Zeit, mit ein wenig Übung, ganz gut, einfach und schnell&nbsp; funktioniert. Sogar mit einem ungeduldigen, hungrigen Baby&nbsp;&nbsp;&nbsp;</p> <p>Hier Bilder vom hochgezogenen Oberkleid und dem geöffneten Unterkleid beim stillen auf einer Veranstaltung:</p> <p>So war ich nie wirklich „bloßgestellt“ da ich ja noch das Unterkleid trug, und das Oberkleid den Teil des geöffneten Unterkleides bedeckte den ich bedecken wollte.</p> <p>Das Fazit meiner Suche nach Belegen und der letztendlich umgesetzten Lösung ist, dass für die Darstellung im 13. Jhdt. weder ein besonderes Schwangerschaftskleid, noch ein besonderes Stillkleid benötigt wird. Lediglich das Unterkleid hatte ich geschlitzt.</p> <p>Nun wo ich abgestillt habe, habe ich den Schlitz wieder zugenäht und es ist wieder mein normales einfaches Unterkleid. Ich bin der Meinung, wir sind heut zutage zu sehr geprägt von modernen Bequemlichkeiten, und können uns schwer vorstellen, keine besondere Kleidung für besondere Anlässe zu besitzen.</p> <p>Es ist so einfach und so praktisch. Vielleicht haben es die Frauen, die sicherlich öfter in besonderen Umständen waren als wir heutzutage, genauso gehandhabt? Ich weiß es nicht, aber ich kann diese Lösung als praktisch erprobt und bestanden empfehlen.</p> <p><em>Artikel von: ©Manuela Helzer 2013</em></p> <p><em>Quellenangaben der Abbildungen: *Imareal Online, Kunstwerk: Buchmalerei ; Illustrationszyklus Psalter ; Miniatur ; Ostmitteleuropa Dokumentation: 1265 ; 1275 ; Wien ; Österreich ; Wien ; Österreichische Nationalbibliothek ; cod. 1898 ; fol. 179r ; Liber ad honorem Augusti, ; Maciejowski-Bibel</em></p> <p><em>Copyright © 2024 Vuozvolc</em></p> <p>&nbsp;</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title, content = excluded.content,
       is_published = true, published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('ausruestungsleitfaden', 'Ausrüstungsleitfaden', $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-93",
        "oberzeile": "",
        "ueberschrift": "Ausrüstungsleitfaden",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-94",
        "inhalt": "<h2>Die Gruppe Vuozvolc&nbsp;stellt städtische Infanterie aus dem Raum Mainz/Trier/Köln der zweiten Hälfte des 13. Jahrhunderts dar.</h2> <p>Dies bedeutet, dass jedes Mitglied über eine gewisse <strong>Mindestausrüstung&nbsp;</strong>verfügen bzw. diese aufbauen muss, die sich unbedingt an oben genanntem Ziel orientiert.<br> Das beinhaltet: zivile Kleidung, Lagerausrüstung und für die Kämpfer eine militärische Ausstattung.</p> <p>Vom Grundsatz her muss für Unterkleidung Leinen, für Oberbekleidung&nbsp;Wolle in natürlicher Farboptik verwendet werden. Komplett handgenähte sowie pflanzen gefärbte Kleidung ist optimal, mindestens sind aber alle sichtbaren Nähte von Hand zu nähen.</p> <p>Weiter ist grundsätzlich jeder selbst für die Belegbarkeit seiner/ihrer Kleidung und Ausrüstung verantwortlich. Allgemein wird vorausgesetzt, daß die Darstellung sich im handwerklich/bürgerlichen Bereich bewegt. Adelige genauso wie Bettler passen nicht ins Konzept.</p> <p>Die&nbsp;<strong>zivile Kleidung für Männer&nbsp;</strong>setzt sich aus folgenden Dingen zusammen:<br> Bruche, Leibhemd und Bundhaube aus Leinen. Beinlinge und Cotte aus Wolle,&nbsp;wendegenähte Schuhe,&nbsp;Gürtel,<br> – optional: Woll-/Filz-/Strohhut, Cappa aus Wolle.</p> <p>Die<strong>&nbsp;Frauenbekleidung&nbsp;</strong>besteht aus:<br> Unterkleid und Kopftuch aus Leinen. Cotte und Strümpfe aus Wolle, Gürtel, wendegenähte Schuhe, optional Cappa aus Wolle, Strohhut.</p> <p>Weiterhin benötigt&nbsp;<strong>jedes Mitglied&nbsp;</strong>ein Mindestmaß an sonstiger Ausrüstung:<br> Essgeschirr bestehend aus Holzschale (gedrechselt oder Daube), Holzlöffel und Essmesser, Trinkbecher und Krug aus zeitlich passender Keramik, Sitzgelegenheit ( Hocker, Bank ).<br> Ggf. Laterne/Talglampe, Strohsack,&nbsp; Zelt.<br> Weitere Lagerausrüstung wie Sonnensegel, Wassereimer, Axt, Säge, Küchenausrüstung etc. ist gerne gesehen, damit nicht einer alles transportieren muss.</p> <p>Die&nbsp;<strong>kämpfende Truppe</strong>&nbsp;gliedert sich in Schützen, Nahkämpfer und Kampfunterstützung:</p> <p><strong>Schützen&nbsp;</strong>sollen über folgende Ausrüstung verfügen:<br> Helm, Armbrust alternativ Bogen mit 10 scharfen Pfeilen.<br> Optional sind: Gambeson/Aketon, Polsterhaube, Ringelpanzer, Kettenhaube, Platenrock, Beiwaffe (Falchion, Schwert, Kurzschwert, Dolchmesser), Schild.</p> <p><strong>Nahkämpfer&nbsp;</strong>verfügen über:<br> Helm, Spieß und Beiwaffe (Falchion, Schwert, Kurzschwert, Dolchmesser o.ä.).<br> Optional sind: Aketon / Gambeson, Polsterhaube, Diechlinge, Ringelpanzer, Kettenhaube, Platenrock, Infanterieschild.<br> Unter&nbsp;<strong>Kampfunterstützung&nbsp;</strong>verstehen wir unbewaffnete Schild-, Wasser- oder Munitionsträger, die sich ebenfalls auf dem Gefechtsfeld bewegen. Diese müssen mindestens über einen Helm verfügen.</p> <p>Für das Freifechten empfehlen sich weitere Protektoren, die&nbsp;unter der Kleidung getragen werden sollten (Ellenbogen/Knie…). Waffen und Rüstung müssen für das Freifechten den Regeln des Codex Belli entsprechen. Für die reine Darstellung bestimmte Gegenstände sind hier natürlich ausgenommen (z.B. scharfe Pfeile, Dolchmesser, Speerspitzen …). Weiter sollen Schützen über 30 Stück Polsterpfeile verfügen.</p> <p>Ein ausführlicherer Ausrüstungsleitfaden mit Abbildungen und Schnittmustern steht Mitgliedern und Anwärtern zur Verfügung.</p> <p>Fragen hierzu bitte an:<br> orga(at)vuozvolc.de</p> <p>Stand: 2024</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title, content = excluded.content,
       is_published = true, published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('historie', 'Historie der Gruppe', $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-95",
        "oberzeile": "historia",
        "ueberschrift": "Historie",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-96",
        "inhalt": "<h3>2007:&nbsp;</h3> <ul> <li>Gründung der Gruppe „Het Vlaamse Gevaar – die Flamen“ im März 2007 für die Schlacht bei Lucka</li> <li>Erstes internes Trainingslager in Kordel</li> <li>Schlacht bei Lucka (Thüringen), organisiert durch die „Freidigen“</li> <li>Training „Glauberg“, Hessen&nbsp;</li> </ul> <h3>2008:&nbsp;</h3> <ul> <li>Trainingslager Birkenfeld, Hunsrück</li> <li>Belagerung der Brandenburg, Thüringen</li> <li>Mittelalterfest „Grünewälder Strief“, Bad Berleburg, NRW</li> <li>Training „Hausberg“, Hessen&nbsp;</li> </ul> <h3>2009:&nbsp;</h3> <ul> <li>Neuausrichtung der Gruppe: „die Flamen“ werden VUOZVOLC</li> <li>Trainingslager mit anderen Gruppen, Burg Herzberg, Hessen</li> <li>Mittelalterfest „Grünewälder Strief“, Bad Berleburg, NRW</li> <li>Burgbelebung der Ronneburg mit „Leben und Handwerk“</li> <li>Training „Hausberg“, Hessen&nbsp;</li> </ul> <h3>2010:&nbsp;</h3> <ul> <li>Vuozvolc – Trainingslager</li> <li>Burgbelebung Bachritterburg Kanzach mit Leben und Handwerk</li> <li>Mittelalterfest „Grünewälder Strief“, Bad Berleburg, NRW</li> <li>Färbeworkshop / Basteltreffen, Westerwald&nbsp;</li> </ul> <h3>2011:&nbsp;</h3> <ul> <li>15.01.2011 – Training / Basteltreffen, Neunkirchen-Seelscheid, NRW</li> <li>12.02.2011 – Training / Basteltreffen, Dortmund, NRW</li> <li>05.03.2011 – Training, Biebesheim, Hessen</li> <li>02.04.2011 – Training / Basteltreffen, Burglahr, RLP</li> <li>07. – 10.04.2011 – Burgbelebung/ Handwerksvorführungen Bachritterburg Kanzach, BW</li> <li>02. – 05.06.2011 – Brandenburg, Thüringen</li> <li>16. -18. September, Mittelalterfest „Grünewälder Strief“, Bad Berleburg, NRW</li> <li>07. – 09. Oktober – Trainingslager, Burg Manderscheid, RLP&nbsp;</li> </ul> <h3>2012:&nbsp;</h3> <ul> <li>11.03.2012 – Basteltreffen, Neunkirchen-Seelscheid, NRW</li> <li>18.03.2012 – Basteltreffen, Neunkirchen-Seelscheid, NRW</li> <li>11. – 13.05.12 – Belebung Mittelalterhaus Nienover, Treffen der Bouvines Teilnehmer</li> <li>07. – 10.06.2012 – Brandenburgfest, Thüringen</li> <li>06. – 08.07.2012 – „Einblicke ins Mittelalter“ Burg Herzberg, Hessen</li> <li>25. – 26.08.2012 – Tag der offenen Tür, LVR Overath, NRW</li> <li>07. – 09.09.2012 – Museumsfest Wilnsdorf, NRW</li> <li>12. – 14.10.2012 – Trainingslager Burg Manderscheid, RLP&nbsp;</li> </ul> <h3>2014&nbsp;</h3> <ul> <li>30. 05.2014 – 01.06.2014 – Mittelaltermarkt Worms, RLP</li> <li>21.06. 2014 – 22.06.2014 – Belebung Mittelalterhaus Nienover, NDS</li> <li>02.08.2014 – 03.08.2014 – LH Veranstaltung Burg Hohenecken, HE</li> <li>09.08.2014 – 10.08.2014 – „Das Rittertum im 13. Jahrhundert“ Mittelalterfest , Bielefeld, NRW</li> <li>16.08.2014 – 17.08 2014 – Militärmanöver Geschichtspark Bärnau, BY</li> <li>03.10.2014 – 05.10.2014 – Museumsfelst Wilnsdorf</li> <li>Herbst 2014 – Trainingslager Burg Manderscheid, RLP&nbsp;</li> </ul> <h3>2015&nbsp;</h3> <ul> <li>15.05.2015 – 17.05.2015 – Mittelaltermarkt Worms, RLP</li> <li>25.07.2015 – 26.07.2015 – Belebung Mittelalterhaus Nienover, NDS</li> <li>15.08.2015 – 16.08.2015 – Militärmanöver Geschichtspark Bärnau, BY</li> <li>26.09.2015 – 27.09.2015 – Burgmannentage Vechta, NDS&nbsp;</li> </ul> <h3>2016&nbsp;</h3> <ul> <li>16.04.2016 – 17.04.2016 – Trainingslager Burg Manderscheid, RLP</li> <li>27.05.2016 – 29.05.2016 – Mittelaltermarkt Worms, RLP</li> <li>02.07.2016 – 03.07.2016 – Belebung Mittelalterhaus Nienover, NDS</li> <li>19.08.2016- 21.08.2016 – Militärmanöver Geschichtspark Bärnau, BY</li> <li>17.09.2016 – 18.09.2016 – Museumsfest Wilnsdorf, NRW</li> <li>11.11.2016 – 13.11.2016 – Wintertraining Namborn, SL&nbsp;</li> </ul> <h3>2017&nbsp;</h3> <ul> <li>11.03.2017 – Basteltreffen</li> <li>26.05.2017 – 28.05.2017 – Mittelaltermarkt Worms</li> <li>15.06.2017 – 18.06.2017 – Belebung Mittelalterhaus Nienover</li> <li>23.06.2017 – 25.06.2017 – internes Trainingslager Burg Brandenburg</li> <li>04.08.2017 – 06.08.2017 – Belebung und 10Jahres Feier Bachritterburg Kanzach</li> <li>22.09.2017 – 26.09.2017 – Belebung um die Motte, Burgmannentage Vechta</li> <li>20.10.2017 – 22.10.2017 – internes Trainingslager Burg Manderscheid&nbsp;</li> </ul> <h3>2018</h3> <ul> <li>01.06 – 03.06.2018 – Brandenburg</li> <li>23.-24.06. 2018 Harriehausen. Harringahusen Mediaval</li> <li>27.-29.07.2018 – Belebung Mittelalterhaus Nienover</li> <li>17.11.2018 –&nbsp; Jahrestreffen intern in Gummersbach&nbsp;</li> </ul> <h3>2019</h3> <ul> <li>19.-23.06.19 – Brandenburg</li> <li>30.05.-02.26.19 Mittelalterspectaculum Worms</li> </ul> <h3>2020</h3> <ul> <li>22.08.2020 Jahrestreffen Windeck</li> </ul> <h3>2021</h3> <p>15. – 16.05.2021 Mittelalterspectaculum Worms<br>23. – 25.07.2021 Belebung Mittelalterhaus Nienover&nbsp;</p> <h3>2022</h3> <p>27.-29.05.2022 Mittelalterspectaculum Worms<br>01.-03.07.2022 Belebung Burg Reichenstein Puderbach<br>09.-10.07.2022 Belebung Kloster Heisterbach<br>Belebung der Turmhügelburg Lütjenburg</p> <h3>2023</h3> <p>18.-21.05.2023 Mittelalterspectaculum Worms<br>17.+18.06.2023 Museumsfest Wilnsdorf<br>28.-30.07.2023 Belebung Turmhügelburg Lütjenburg<br>15.-17.09.2023 Stupor Mundi Veranstaltung Burg Ronneburg</p> <h3>2024</h3> <p>26.-28.04.2024 Burgbelebung Burg Reichenstein Puderbach<br>10.-12.05.2024 Mittelalterspectaculum Worms<br>02.-04.08.2024 Belebung Kloster Heisterbach<br>30.08.2024 Idstein 1250-Jahr—Feier<br>13.-15.09.2024 Stupor Mundi Belebung Burg Ronneburg</p> <h3>2025</h3> <p>11. Mai 2025 Burgbelebung Burg Reichenstein Puderbach<br>27.06. – 29.06.2025 Museumsfest Wilnsdorf<br>11.07. – 13.07.2025 Belebung Kloster Heisterbach.<br>25.07 – 27.07.2025 Belebung Mittelalterhaus Nienover<br>28.08. – 31.08.2025 Stupor Mundi Belebung Burg Ronneburg (ausgefallen)</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title, content = excluded.content,
       is_published = true, published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('termine', 'Termine', $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-97",
        "oberzeile": "institutiones",
        "ueberschrift": "Termine",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-98",
        "inhalt": "<h3>2026</h3> <p>15. -17.05.2026 Mittelalterspectaculum Worms<br>12. – 14.06.2026 interne Burgbelebung Burg Reichenstein Puderbach<br>25.07. – 26.07.2026 Belebung Kloster Heisterbach.<br>31.07- 01.08.2026 Belebung Mittelalterhaus Nienover<br>noch in Planung Stupor Mundi Anfang September</p> <h3>2025</h3> <p>11. Mai 2025 Burgbelebung Burg Reichenstein Puderbach<br>27.06. – 29.06.2025 Museumsfest Wilnsdorf<br>11.07. – 13.07.2025 Belebung Kloster Heisterbach.<br>25.07 – 27.07.2025 Belebung Mittelalterhaus Nienover<br>28.08. – 31.08.2025 Stupor Mundi Belebung Burg Ronneburg</p> <p></p> <p></p> <h3>2024</h3> <p>26.-28.04.2024 Burgbelebung Burg Reichenstein Puderbach<br>10.-12.05.2024 Mittelalterspectaculum Worms<br>02.-04.08.2024 Belebung Kloster Heisterbach<br>30.08.2024 Idstein 1250-Jahr—Feier<br>13.-15.09.2024 Stupor Mundi Belebung Burg Ronneburg</p> <h3>2023</h3> <p>18.-21.05.2023 – Mittelalterspectaculum Worms<br>17. +18.06.2023 – Museumsfest Wilsndorf&nbsp;&nbsp;<br>28. – 30.07.2023 – Belebung Turmhügelburg Lütjenburg&nbsp;&nbsp;<br>15. – 17.09.2023 – Stupor Mundi Veranstaltung Ronneburg&nbsp;&nbsp;</p> <p>ältere Termine siehe – Historie der Gruppe</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title, content = excluded.content,
       is_published = true, published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('kontakt', 'Kontakt', $json$
{
  "root": {},
  "content": [
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-99",
        "oberzeile": "contactus",
        "ueberschrift": "Kontakt",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "textabschnitt-100",
        "inhalt": "Hier könnt Ihr Kontakt mit uns aufnehmen. <p>&nbsp;</p> <p>&nbsp;</p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title, content = excluded.content,
       is_published = true, published_at = now();

-- --------------------------------------------------------------------------
--  4. Das Menü
-- --------------------------------------------------------------------------
--
-- Wie bei Vuozvolc: die sechs Artikel unter einem Punkt „Info". Das Forum
-- liegt bei ihnen auf einer fremden Adresse und bleibt deshalb ein Verweis
-- nach draussen.
--
-- „Info" zeigt selbst auf den ersten Artikel. Das ist keine Schönheit,
-- sondern eine Regel der Datenbank: `site_menu_target_check` verlangt von
-- JEDEM Eintrag genau ein Ziel. Einen blossen Aufklapp-Punkt ohne Ziel gibt
-- es hier nicht, und die Oberfläche bietet ihn auch nicht an.
delete from public.site_menu where area = 'header';

with eltern as (
  insert into public.site_menu (label, href, page_id, area, sort_order, is_visible, opens_new)
  values
    ('VUOZVOLC',         '/',                            null, 'header', 10, true, false),
    ('AKTIVE MITGLIEDER','/aktive-mitglieder',           null, 'header', 20, true, false),
    ('Info',             '/ernaehrung',                  null, 'header', 30, true, false),
    ('Forum',            'https://forum-vuozvolc.de/forum/', null, 'header', 40, true, true),
    ('Termine',          '/termine',                     null, 'header', 50, true, false)
  returning id, label
)
insert into public.site_menu (label, href, page_id, parent_id, area, sort_order, is_visible)
select v.label, v.href, null, (select id from eltern where label = 'Info'),
       'header', v.ord, true
  from (values
    ('DIE ERNÄHRUNG IM 13./14. JAHRHUNDERT',                 '/ernaehrung',                          10),
    ('MÄNNERKLEIDUNG IM 13. JAHRHUNDERT',                    '/maennerkleidung',                     20),
    ('FRAUENKLEIDUNG IM 13. JAHRHUNDERT',                    '/frauenkleidung',                      30),
    ('NAALBINDING / NADELBINDEN',                            '/naalbinding',                         40),
    ('STILL UND SCHWANGERSCHAFTSKLEIDUNG',                   '/still-und-schwangerschaftskleidung',  50),
    ('AUSRÜSTUNGSLEITFADEN',                                 '/ausruestungsleitfaden',               60),
    ('HISTORIE DER GRUPPE',                                  '/historie',                            70)
  ) as v(label, href, ord);

commit;
