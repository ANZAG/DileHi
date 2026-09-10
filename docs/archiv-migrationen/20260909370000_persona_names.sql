-- Darstellungen dürfen einen Namen tragen – wenn die Person das will
--
-- Die öffentliche Übersicht der Darstellungen zeigt bisher grundsätzlich keine
-- Namen: Zeit, Rolle, Kenntnisse, Bilder. Das war die richtige Vorgabe und
-- bleibt es.
--
-- Andere Vereine führen die Seite aber als „wer wir sind" – mit Bild, Namen
-- und einer Zeile zur Fertigkeit. Ohne Namen ist das eine andere Seite.
--
-- ── Zwei Schalter, nicht einer ─────────────────────────────────────────────
--
-- Ein Name im Netz ist nicht die Entscheidung des Vereins, sondern die der
-- Person. Deshalb reicht ein Schalter am Baustein nicht:
--
--   show_name am Steckbrief   Die Person selbst, im eigenen Profil.
--   Schalter am Baustein      Der Verein, für die Seite als Ganzes.
--
-- Gezeigt wird ein Name nur, wenn beides zutrifft. Die Vorgabe ist „nein" –
-- wer nichts tut, steht nicht mit Namen im Netz.

ALTER TABLE public.member_personas
  ADD COLUMN IF NOT EXISTS show_name boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.member_personas.show_name IS
  'Darf der Name der Person bei dieser Darstellung oeffentlich stehen? Entscheidung der Person selbst.';

-- Die Rückgabe ändert sich, deshalb neu anlegen statt ersetzen.
DROP FUNCTION IF EXISTS public.get_public_personas();

CREATE FUNCTION public.get_public_personas()
RETURNS TABLE (period text, portrayal text, expertise text, images text[], name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT p.period, p.portrayal, p.expertise, p.public_images,
         -- Nur bei ausdrücklicher Zustimmung, und nur der Anzeigename. Die
         -- Kennung des Kontos bleibt aussen vor: Sie taugt zum Verknüpfen mit
         -- anderen Daten, der Anzeigename nicht.
         CASE WHEN p.show_name THEN pr.display_name END
  FROM public.member_personas p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.is_public
  ORDER BY p.period, p.sort_order, p.id
$fn$;

REVOKE ALL ON FUNCTION public.get_public_personas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_personas() TO anon, authenticated;
