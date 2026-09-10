-- Erste Schritte: gemerkt wird ab jetzt je Schritt, nicht je Tour
--
-- Bisher standen in user_tours vier Schlüssel: „member“, „vorstand“,
-- „schatzmeister“, „herold“. Das war die Einteilung der alten Touren, und sie
-- hatte den Nachteil, den man erst nach einem halben Jahr merkt: Kommt ein
-- Bereich dazu, gibt es nur zwei Möglichkeiten. Entweder alle sehen die ganze
-- Tour noch einmal, oder niemand sieht den neuen Teil.
--
-- Jetzt trägt jeder Schritt seinen eigenen Schlüssel. Ein neuer Schritt ist
-- dann ein Schlüssel, den noch niemand hat – und wird genau einmal gezeigt,
-- allein, ohne den Rest.
--
-- Diese Migration trägt für alle, die eine der alten Touren durchhatten, die
-- entsprechenden Schritte nach. Sonst stünde beim nächsten Anmelden die
-- komplette Tour wieder da.
--
-- Nachgetragen wird nur, was die alte Tour wirklich enthielt. Schritte zu
-- Bereichen, die es damals noch nicht gab (Forum, Darstellungssteckbrief,
-- Seiten im Editor, Module, Erscheinungsbild, Vorlagen), bleiben offen und
-- werden gezeigt – das ist ja der Sinn der Sache.

COMMENT ON COLUMN public.user_tours.tour_key IS
  'Schlüssel eines Schrittes aus src/components/onboarding/schritte.ts. Vorhanden = gesehen.';

INSERT INTO public.user_tours (user_id, tour_key)
SELECT t.user_id, s.key
FROM public.user_tours t
CROSS JOIN LATERAL (
  SELECT unnest(
    CASE t.tour_key
      -- Die alte Mitglieder-Tour.
      WHEN 'member' THEN ARRAY[
        'willkommen', 'profil', 'veranstaltungen', 'anmelden', 'versammlungen',
        'abstimmungen', 'dokumente', 'beitraege', 'quellen', 'karte', 'abschluss'
      ]
      -- Die alte Vorstands-Tour. „Seitenbilder“ ist ersatzlos entfallen, der
      -- Reiter gibt es nicht mehr.
      WHEN 'vorstand' THEN ARRAY[
        'verwaltung', 'mitglieder', 'antraege', 'kontaktanfragen', 'galerie',
        'quellen_pflege', 'highlights', 'rollen', 'abstimmungen_leiten',
        'auswertungen', 'protokoll'
      ]
      WHEN 'schatzmeister' THEN ARRAY['beitraege_verwalten']
      WHEN 'herold' THEN ARRAY[
        'verwaltung', 'kontaktanfragen', 'galerie', 'quellen_pflege', 'highlights'
      ]
      ELSE ARRAY[]::text[]
    END
  ) AS key
) s
ON CONFLICT (user_id, tour_key) DO NOTHING;

-- Die vier alten Schlüssel werden nicht mehr gelesen. Sie stehen zu lassen
-- hiesse, dass beim nächsten Blick in die Tabelle niemand mehr weiss, was sie
-- bedeuten – und ein Schritt mit dem Namen „member“ wird es nie geben.
DELETE FROM public.user_tours
WHERE tour_key IN ('member', 'vorstand', 'schatzmeister', 'herold');
