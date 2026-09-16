-- Eine Startseite, die nicht leer ist
--
-- Bis hierher bekam eine neue Installation eine Startseite ohne einen einzigen
-- Baustein: weisse Fläche zwischen Kopf- und Fusszeile. Wer die Adresse zum
-- ersten Mal aufruft — und das sind zuerst die Leute, die gerade eingerichtet
-- haben —, sieht nichts und weiss nicht, ob etwas kaputt ist oder ob er noch
-- etwas tun muss.
--
-- Also eine gebaute Seite ab Werk. Sie besteht aus denselben Bausteinen, die
-- der Seiteneditor anbietet; es gibt keine zweite, versteckte Fassung. Wer
-- etwas ändern will, öffnet Verwaltung → Seiten und findet genau das wieder,
-- was er sieht.
--
-- Drei Dinge waren dabei wichtig:
--
--   * Kein fremdes Bild. Der Willkommensbereich zeigt ohne hinterlegtes Bild
--     einen Verlauf aus der eigenen Vereinsfarbe. Ein mitgeliefertes Foto wäre
--     immer das Foto eines anderen Vereins.
--   * Keine erfundenen Angaben. Es steht nirgends, seit wann es die
--     Organisation gibt oder wie viele dabei sind — das weiss diese Migration
--     nicht, und geraten wäre schlimmer als weggelassen.
--   * Kein Wort, das nur zu einer Form passt. „Mitmachen“ und „dabei sein“
--     gelten für den eingetragenen Verein wie für die Interessengemeinschaft.
--
-- Überschrift und Unterzeile des Willkommensbereichs bleiben leer: Der
-- Baustein setzt dort den Namen und den Untertitel der Organisation ein,
-- sobald sie eingetragen sind. So füllt sich die Seite mit dem ersten Schritt
-- der Einrichtung von selbst.
--
-- Die Schranke ist wie bei den Forum-Rubriken: nur in einer Installation, in
-- der noch niemand die Daten eingetragen hat, und nur, solange die Startseite
-- unberührt leer ist. DileHi hat dort seit einem Jahr eine eigene Seite.

DO $$
DECLARE
  unberuehrt boolean;
BEGIN
  SELECT coalesce((SELECT org_name FROM public.app_settings LIMIT 1), '') = 'Mein Verein e. V.'
     AND coalesce(
           (SELECT jsonb_array_length(coalesce(content -> 'content', '[]'::jsonb))
              FROM public.site_pages WHERE slug = 'startseite'),
           0) = 0
    INTO unberuehrt;

  IF NOT unberuehrt THEN
    RAISE NOTICE 'Startseite übersprungen: Sie ist schon gebaut, oder die Installation läuft.';
    RETURN;
  END IF;

  -- Ein Platz für das eigene Titelbild.
  --
  -- Die Bildauswahl im Editor liest aus dieser Tabelle. Sie war in einer neuen
  -- Installation leer — es gab also keinen Platz, an den man ein Bild legen
  -- konnte, und das Auswahlfeld stand da, als gäbe es keine Bilder. Eine Zeile
  -- ohne Datei ist genau das: ein beschrifteter Platz, der auf sein Bild
  -- wartet.
  INSERT INTO public.site_images (slot, label, page, alt_text)
  SELECT 'titelbild-startseite', 'Titelbild', 'Startseite', ''
  WHERE NOT EXISTS (
    SELECT 1 FROM public.site_images WHERE slot = 'titelbild-startseite'
  );

  UPDATE public.site_pages
     SET content = $json$
{
  "root": {},
  "content": [
    {
      "type": "Willkommen",
      "props": {
        "id": "willkommen-start",
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
      "type": "Ueberschrift",
      "props": {
        "id": "ueberschrift-wer",
        "oberzeile": "Über uns",
        "text": "Wer wir sind",
        "groesse": "mittel",
        "ausrichtung": "mitte",
        "breite": "schmal",
        "hintergrund": "keine",
        "abstandOben": "weit",
        "abstandUnten": "eng"
      }
    },
    {
      "type": "Textabschnitt",
      "props": {
        "id": "text-wer",
        "inhalt": "<p>Hier stellen wir uns vor: wer wir sind, was wir tun und wann wir uns treffen.</p><p>Diesen Text schreibt ihr selbst — im Mitgliederbereich unter Verwaltung, Seiten, Startseite.</p>",
        "ausrichtung": "mitte",
        "aufzaehlung": "punkte",
        "breite": "schmal",
        "hintergrund": "keine",
        "abstandOben": "keiner",
        "abstandUnten": "weit"
      }
    },
    {
      "type": "Termine",
      "props": {
        "id": "termine-start",
        "ueberschrift": "Nächste Termine",
        "unterzeile": "",
        "anzahl": 6,
        "rueckschau": 0,
        "breite": "breit",
        "abstandOben": "weit",
        "abstandUnten": "weit"
      }
    },
    {
      "type": "Aktionskaesten",
      "props": {
        "id": "aktionen-start",
        "kaesten": [
          {
            "titel": "Mitmachen",
            "text": "Ihr habt Lust, dabei zu sein? Schreibt uns — wir melden uns.",
            "knopf": "Kontakt aufnehmen",
            "ziel": "/kontakt",
            "betont": true
          },
          {
            "titel": "Schon dabei?",
            "text": "Termine, Unterlagen und alles Weitere stehen im Mitgliederbereich.",
            "knopf": "Anmelden",
            "ziel": "/login",
            "betont": false
          }
        ],
        "hintergrund": "karte",
        "abstandOben": "weit",
        "abstandUnten": "weit"
      }
    }
  ]
}
$json$::jsonb
   WHERE slug = 'startseite';
END
$$;
