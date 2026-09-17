-- Vuozvolc auf ding.dilehi.de: das Gerüst der Seiten
--
-- ==========================================================================
--  NUR IM PROJEKT DING AUSFÜHREN (nyloyirwppbetrkkyncw), NIE IN DILEHI
-- ==========================================================================
--
-- Dieses Skript legt Inhalte an, keine Struktur. Es ist deshalb bewusst
-- KEINE Migration: Migrationen laufen in jeder Installation, auch in DileHis
-- Datenbank, und dort haben Vuozvolcs Seiten nichts zu suchen. Wer es doch
-- dort ausführt, hat hinterher elf fremde Seiten im Menü.
--
-- Zur Sicherheit bricht es unten von selbst ab, wenn es DileHis Datenbank
-- vor sich hat.
--
-- Auszuführen im SQL-Editor des Supabase-Projekts DING.
--
-- --------------------------------------------------------------------------
--  Was das hier ist, und was es nicht ist
-- --------------------------------------------------------------------------
--
-- Es ist das GERÜST: elf Seiten, in der Anordnung, die die Analyse in
-- `vuozvolc-machbarkeit.md` Seite für Seite festgehalten hat — mit den
-- lateinischen Oberzeilen, den Zwischenüberschriften, den Bildplätzen, dem
-- Zeitstrahl über 19 Jahrgänge, der Terminliste mit Rückschau und dem
-- Kontaktformular. Dazu die Gestaltung: Antic Didone über Open Sans, das
-- warme Creme der Flächen.
--
-- Es ist NICHT der Text. Jeder Absatz trägt einen Platzhalter, den man im
-- Seiteneditor sieht und ersetzt. Der Grund steht offen im Arbeitsstand:
-- vuozvolc.de ist aus dieser Umgebung nicht erreichbar, und erfundene
-- Fliesstexte wären schlimmer als sichtbar leere. Was hier steht, ist
-- nachprüfbar aus der Analyse abgeleitet; was dort nie stand, steht auch
-- hier nicht.
--
-- Damit ist der Test aus der Machbarkeitsanalyse trotzdem gemacht: Ob unsere
-- Bausteine diese Seite tragen, entscheidet ihr Aufbau, nicht ihr Wortlaut.
--
-- --------------------------------------------------------------------------
--  Danach von Hand
-- --------------------------------------------------------------------------
--
--   1. Die Texte einsetzen (Verwaltung → Seiten).
--   2. Die Bilder hochladen. Die Plätze heissen `vuozvolc-…` und stehen
--      nach diesem Skript in der Bildauswahl bereit.
--   3. Die dreissig Steckbriefe pflegen. Bewusst nicht hier: Ein Name im
--      Netz ist die Entscheidung der Person. Der Baustein zeigt Namen nur,
--      wenn die Person im eigenen Steckbrief zugestimmt HAT und der Verein
--      es am Baustein eingeschaltet hat — beides, nicht eines.
--   4. Zwei Seiten fehlen. Die Analyse zählt dreizehn Inhaltsseiten, hat
--      aber nur elf namentlich aufgeführt; welche beiden das sind, ist von
--      hier aus nicht feststellbar.

begin;

-- Die Schranke. `hmrogjpuslpzrittljjr` ist DileHis Projekt; dort ist dieses
-- Skript ein Unfall. Geprüft wird am Vereinsnamen, weil die Datenbank ihre
-- eigene Projektkennung nicht kennt.
do $$
begin
  if exists (select 1 from public.app_settings
              where org_name is not null
                and org_name not in ('Mein Verein e. V.', '', 'Vuozvolc')) then
    raise exception 'Hier steht schon ein Verein drin (%). Dieses Skript gehört nur in das leere Projekt DING.',
      (select org_name from public.app_settings limit 1);
  end if;
end $$;

-- --------------------------------------------------------------------------
--  1. Die Gestaltung
-- --------------------------------------------------------------------------
--
-- Aus der Analyse: Fliesstext Open Sans in Grau (#666), Überschriften
-- Antic Didone in Dunkelgrau (#333), Abschnittsflächen in warmem Creme
-- (#faf2e9).
--
-- `color_primary` ist geraten. Die Analyse hält für Vuozvolc keine
-- Auszeichnungsfarbe fest, und eine gibt es dort kaum — dieses gedeckte
-- Braun ist ein Vorschlag, kein Befund. Unter Erscheinungsbild zu ändern.
update public.app_settings set
  org_name        = 'Vuozvolc',
  org_short_name  = 'Vuozvolc',
  font_headings   = 'Antic Didone',
  font_body       = 'Open Sans',
  color_dark      = '#333333',
  color_surface   = '#faf2e9',
  color_primary   = '#8c6f4a';

-- --------------------------------------------------------------------------
--  2. Die Bildplätze
-- --------------------------------------------------------------------------
--
-- Ein Platz ohne Datei ist ein beschrifteter Haken, an den ein Bild gehängt
-- wird. Ohne ihn stünde die Bildauswahl im Editor leer da.
insert into public.site_images (slot, label, page, alt_text)
select v.slot, v.label, v.page, ''
  from (values
    ('vuozvolc-start-1', 'Startseite, Bild 1', 'Startseite'),
    ('vuozvolc-start-2', 'Startseite, Bild 2', 'Startseite'),
    ('vuozvolc-ernaehrung-2', 'Ernährung, Bild 1', 'Die Ernährung im 13./14. Jahrhundert'),
    ('vuozvolc-ernaehrung-4', 'Ernährung, Bild 2', 'Die Ernährung im 13./14. Jahrhundert'),
    ('vuozvolc-maennerkleidung-1', 'Männerkleidung, Bild', 'Männerkleidung'),
    ('vuozvolc-frauenkleidung-1', 'Frauenkleidung, Bild', 'Frauenkleidung'),
    ('vuozvolc-naalbinding-1', 'Naalbinding, Bild 1', 'Naalbinding / Nadelbinden'),
    ('vuozvolc-naalbinding-2', 'Naalbinding, Bild 2', 'Naalbinding / Nadelbinden'),
    ('vuozvolc-naalbinding-3', 'Naalbinding, Bild 3', 'Naalbinding / Nadelbinden'),
    ('vuozvolc-naalbinding-4', 'Naalbinding, Bild 4', 'Naalbinding / Nadelbinden')
  ) as v(slot, label, page)
 where not exists (select 1 from public.site_images s where s.slot = v.slot);

-- --------------------------------------------------------------------------
--  3. Die Startseite
-- --------------------------------------------------------------------------
update public.site_pages
   set content = $json$
{
  "root": {},
  "content": [
    {
      "type": "Willkommen",
      "props": {
        "id": "willkommen-41",
        "bildSchluessel": "titelbild-startseite",
        "ueberschrift": "",
        "text": "",
        "knopf1": "Kontakt aufnehmen",
        "ziel1": "/kontakt",
        "knopf2": "",
        "ziel2": "",
        "hoehe": "gross"
      }
    },
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-42",
        "oberzeile": "PROMPTUS",
        "ueberschrift": "Willkommen",
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
        "id": "textabschnitt-43",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
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
        "id": "einzelbild-44",
        "bildSchluessel": "vuozvolc-start-1",
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
        "bildSchluessel": "vuozvolc-start-2",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    },
    {
      "type": "Trennlinie",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "trennlinie-46"
      }
    },
    {
      "type": "Seitenkopf",
      "props": {
        "breite": "schmal",
        "abstandOben": "gross",
        "abstandUnten": "gross",
        "textfarbe": "standard",
        "hintergrund": "keine",
        "flaeche": "inhalt",
        "id": "seitenkopf-47",
        "oberzeile": "SOCIUS",
        "ueberschrift": "Was wir sind",
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
        "id": "textabschnitt-48",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb,
       is_published = true,
       published_at = now()
 where slug = 'startseite';

-- --------------------------------------------------------------------------
--  4. Die übrigen Seiten
-- --------------------------------------------------------------------------

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
        "id": "seitenkopf-1",
        "oberzeile": "SOCIUS",
        "ueberschrift": "Aktive Mitglieder",
        "text": "Wer bei uns mitmacht, und was er kann.",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Darstellungen",
      "props": {
        "breite": "breit",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "darstellungen-2",
        "kategorie": "",
        "ueberschrift": "",
        "einleitung": "",
        "namenZeigen": true
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title,
       content = excluded.content,
       is_published = true,
       published_at = now();

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
        "id": "seitenkopf-3",
        "oberzeile": "INSTITUTIONES",
        "ueberschrift": "Die Ernährung im 13./14. Jahrhundert",
        "text": "",
        "ausrichtung": "links"
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
        "id": "ueberschrift-4",
        "oberzeile": "",
        "text": "Zwischenüberschrift 1",
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
        "id": "textabschnitt-5",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
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
        "id": "ueberschrift-6",
        "oberzeile": "",
        "text": "Zwischenüberschrift 2",
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
        "id": "textabschnitt-7",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
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
        "id": "einzelbild-8",
        "bildSchluessel": "vuozvolc-ernaehrung-2",
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
        "id": "ueberschrift-9",
        "oberzeile": "",
        "text": "Zwischenüberschrift 3",
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
        "id": "textabschnitt-10",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
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
        "id": "ueberschrift-11",
        "oberzeile": "",
        "text": "Zwischenüberschrift 4",
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
        "id": "textabschnitt-12",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
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
        "id": "einzelbild-13",
        "bildSchluessel": "vuozvolc-ernaehrung-4",
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
        "id": "ueberschrift-14",
        "oberzeile": "",
        "text": "Zwischenüberschrift 5",
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
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    },
    {
      "type": "Trennlinie",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "trennlinie-16"
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
        "id": "ueberschrift-17",
        "oberzeile": "",
        "text": "Quellen",
        "groesse": "klein",
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
        "id": "textabschnitt-18",
        "inhalt": "<p><em>Platzhalter für die Quellenbelege des Artikels.</em></p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title,
       content = excluded.content,
       is_published = true,
       published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('maennerkleidung', 'Männerkleidung', $json$
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
        "id": "seitenkopf-19",
        "oberzeile": "INSTITUTIONES",
        "ueberschrift": "Männerkleidung",
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
        "id": "textabschnitt-20",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
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
        "id": "einzelbild-21",
        "bildSchluessel": "vuozvolc-maennerkleidung-1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title,
       content = excluded.content,
       is_published = true,
       published_at = now();

insert into public.site_pages (slug, title, content, is_published, published_at, seo_type)
values ('frauenkleidung', 'Frauenkleidung', $json$
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
        "id": "seitenkopf-22",
        "oberzeile": "INSTITUTIONES",
        "ueberschrift": "Frauenkleidung",
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
        "id": "textabschnitt-23",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
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
        "id": "einzelbild-24",
        "bildSchluessel": "vuozvolc-frauenkleidung-1",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title,
       content = excluded.content,
       is_published = true,
       published_at = now();

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
        "id": "seitenkopf-25",
        "oberzeile": "INSTITUTIONES",
        "ueberschrift": "Still- und Schwangerschaftskleidung",
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
        "id": "textabschnitt-26",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title,
       content = excluded.content,
       is_published = true,
       published_at = now();

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
        "id": "seitenkopf-27",
        "oberzeile": "INSTITUTIONES",
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
        "id": "textabschnitt-28",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
        "ausrichtung": "links",
        "aufzaehlung": "punkte"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title,
       content = excluded.content,
       is_published = true,
       published_at = now();

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
        "id": "seitenkopf-29",
        "oberzeile": "INSTITUTIONES",
        "ueberschrift": "Naalbinding / Nadelbinden",
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
        "id": "textabschnitt-30",
        "inhalt": "<p><em>Platzhalter. Hier kommt der Text von vuozvolc.de hin — Verwaltung → Seiten → diese Seite öffnen, diesen Absatz ersetzen.</em></p>",
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
        "id": "einzelbild-31",
        "bildSchluessel": "vuozvolc-naalbinding-1",
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
        "bildSchluessel": "vuozvolc-naalbinding-2",
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
        "bildSchluessel": "vuozvolc-naalbinding-3",
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
        "bildSchluessel": "vuozvolc-naalbinding-4",
        "bildunterschrift": "",
        "bildbreite": "voll"
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title,
       content = excluded.content,
       is_published = true,
       published_at = now();

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
        "id": "seitenkopf-35",
        "oberzeile": "SOCIUS GREX",
        "ueberschrift": "Historie der Gruppe",
        "text": "",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Zeitstrahl",
      "props": {
        "id": "zeitstrahl-36",
        "ueberschrift": "",
        "hintergrund": "keine",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "punkte": [
          {
            "titel": "Platzhalter",
            "jahre": "2007",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2008",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2009",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2010",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2011",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2012",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2013",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2014",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2015",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2016",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2017",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2018",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2019",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2020",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2021",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2022",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2023",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2024",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          },
          {
            "titel": "Platzhalter",
            "jahre": "2025",
            "untertitel": "",
            "bildSchluessel": "",
            "ziel": ""
          }
        ]
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title,
       content = excluded.content,
       is_published = true,
       published_at = now();

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
        "id": "seitenkopf-37",
        "oberzeile": "",
        "ueberschrift": "Termine",
        "text": "Wo wir dieses Jahr zu sehen sind — und wo wir waren.",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Termine",
      "props": {
        "breite": "breit",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "termine-38",
        "ueberschrift": "",
        "unterzeile": "",
        "anzahl": 50,
        "rueckschau": 4
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title,
       content = excluded.content,
       is_published = true,
       published_at = now();

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
        "id": "seitenkopf-39",
        "oberzeile": "CONTACTUS",
        "ueberschrift": "Kontakt",
        "text": "Schreibt uns.",
        "ausrichtung": "links"
      }
    },
    {
      "type": "Kontaktformular",
      "props": {
        "breite": "schmal",
        "abstandOben": "normal",
        "abstandUnten": "normal",
        "id": "kontaktformular-40",
        "ueberschrift": "",
        "hinweis": ""
      }
    }
  ]
}
$json$::jsonb, true, now(), 'keine')
    on conflict (slug) do update
   set title = excluded.title,
       content = excluded.content,
       is_published = true,
       published_at = now();

-- --------------------------------------------------------------------------
--  5. Das Menü
-- --------------------------------------------------------------------------
--
-- Die sechs Artikel liegen unter „Wissenswertes" — dreizehn Punkte
-- nebeneinander sind keine Kopfzeile mehr. Eine Ebene Untermenü kann die
-- Kopfzeile, mehr nicht.
--
-- „Wissenswertes" zeigt selbst auf den längsten der Artikel. Das ist keine
-- Schönheit, sondern eine Regel der Datenbank: `site_menu_target_check`
-- verlangt von JEDEM Eintrag genau ein Ziel — entweder eine Seite oder eine
-- Adresse. Einen blossen Aufklapp-Punkt ohne Ziel gibt es hier nicht, und die
-- Oberfläche bietet ihn auch nicht an. Wer lieber eine eigene Übersichtsseite
-- möchte, legt sie an und hängt den Punkt daran.
delete from public.site_menu where area = 'header';

with eltern as (
  insert into public.site_menu (label, href, page_id, area, sort_order, is_visible)
  values
    ('Startseite',       '/',                  null, 'header', 10, true),
    ('Aktive Mitglieder','/aktive-mitglieder', null, 'header', 20, true),
    ('Wissenswertes',    '/ernaehrung',        null, 'header', 30, true),
    ('Historie',         '/historie',          null, 'header', 40, true),
    ('Termine',          '/termine',           null, 'header', 50, true),
    ('Kontakt',          '/kontakt',           null, 'header', 60, true)
  returning id, label
)
insert into public.site_menu (label, href, page_id, parent_id, area, sort_order, is_visible)
select v.label, v.href, null, (select id from eltern where label = 'Wissenswertes'),
       'header', v.ord, true
  from (values
    ('Die Ernährung im 13./14. Jh.',        '/ernaehrung',                         10),
    ('Männerkleidung',                      '/maennerkleidung',                    20),
    ('Frauenkleidung',                      '/frauenkleidung',                     30),
    ('Still- und Schwangerschaftskleidung', '/still-und-schwangerschaftskleidung',  40),
    ('Naalbinding / Nadelbinden',           '/naalbinding',                        50),
    ('Ausrüstungsleitfaden',                '/ausruestungsleitfaden',              60)
  ) as v(label, href, ord);

commit;

-- Danach: die Seite aufrufen. Was fehlt, ist Text und Bild — nicht Aufbau.
