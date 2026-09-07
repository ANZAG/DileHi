-- Rollen bekommen Eigenschaften statt Sonderbehandlung im Code
--
-- Ausgangslage: Welche Rollen den Vorstand bilden und welche im Aufnahmeantrag
-- ausgewiesen werden, steht heute an vier Stellen im Code – in getOfficials()
-- und der Vorstandsleiste in invite-member/index.ts, in der Rollen-Tabelle in
-- ms-email.ts, in MemberRegistry.tsx und in OnboardingTour.tsx. Jede davon ist
-- eine eigene Kopie derselben Liste.
--
-- Die Vereinsstruktur soll dabei erhalten bleiben: 1. Officiatus, 2. Officiatus
-- und Schatzmeister sind nach §5 (3) der Satzung der Vorstand, die beiden
-- Beisitzer (Kassenprüfung, Öffentlichkeitsarbeit) gehören ihm nicht an. Das
-- ist keine Ausnahme, die weg muss – es ist eine Eigenschaft der Rolle, die
-- bisher nur keinen Platz in der Datenbank hatte.
--
-- WICHTIG – bewusst NICHT geändert: is_vorstand() bleibt, wie es ist.
-- Die Funktion wird in 15 RLS-Policies ausgewertet und prüft heute
-- role IN ('vorstand', 'officiatus_1', 'officiatus_2') – der Schatzmeister ist
-- absichtlich nicht dabei. Würde man sie auf is_board umstellen, bekäme der
-- Schatzmeister schlagartig die Rechte des geschäftsführenden Vorstands.
-- is_board beschreibt die Vereinsstruktur, is_vorstand() eine Berechtigung.
-- Beides sauber zu trennen ist Aufgabe des Rechteumbaus, nicht dieser Migration.

ALTER TABLE public.role_catalog
  ADD COLUMN IF NOT EXISTS description   text,
  -- Gehört die Rolle dem Vorstand im Vereinsrechtssinn an?
  ADD COLUMN IF NOT EXISTS is_board      boolean NOT NULL DEFAULT false,
  -- Wird die Rolle nach außen ausgewiesen (Aufnahmeantrag, Impressum, Website)?
  ADD COLUMN IF NOT EXISTS public_listed boolean NOT NULL DEFAULT false,
  -- Grundrolle der Installation – darf nicht gelöscht werden.
  ADD COLUMN IF NOT EXISTS is_system     boolean NOT NULL DEFAULT false,
  -- Wie oft darf die Rolle vergeben werden? NULL = beliebig oft.
  ADD COLUMN IF NOT EXISTS max_holders   integer;

COMMENT ON COLUMN public.role_catalog.is_board IS
  'Vorstand im Vereinsrechtssinn. Rein beschreibend - steuert KEINE Berechtigungen.';
COMMENT ON COLUMN public.role_catalog.public_listed IS
  'Wird nach aussen ausgewiesen, z. B. in der Vorstandsleiste des Aufnahmeantrags.';

-- Bestand nach der Satzung setzen.
UPDATE public.role_catalog SET is_board = true,  public_listed = true,  max_holders = 1,
       description = 'Erster Vorsitzender, vertritt den Verein nach außen'
 WHERE key = 'officiatus_1';

UPDATE public.role_catalog SET is_board = true,  public_listed = true,  max_holders = 1,
       description = 'Zweiter Vorsitzender, Vertretung des 1. Officiatus'
 WHERE key = 'officiatus_2';

UPDATE public.role_catalog SET is_board = true,  public_listed = true,  max_holders = 1,
       description = 'Kasse, Beiträge und Mitgliedsunterlagen'
 WHERE key = 'schatzmeister';

-- Beisitzer: kein Vorstand, aber eigene Aufgaben und Rechte.
UPDATE public.role_catalog SET is_board = false, public_listed = false,
       description = 'Beisitzer, Öffentlichkeitsarbeit und Außendarstellung'
 WHERE key = 'herold';

UPDATE public.role_catalog SET is_board = false, public_listed = false, is_system = true,
       description = 'Aktives oder förderndes Mitglied'
 WHERE key = 'mitglied';

-- Alt-Rolle ohne Träger. is_board bleibt true, damit is_vorstand() und diese
-- Spalte für sie dasselbe aussagen, aber sie wird nicht ausgewiesen.
UPDATE public.role_catalog SET is_board = true,  public_listed = false,
       description = 'Alt-Rolle, durch officiatus_1/2 ersetzt. Nicht mehr vergeben.'
 WHERE key = 'vorstand';

-- ── Wer wird nach außen ausgewiesen? ────────────────────────────────────────
--
-- Ersetzt getOfficials() in invite-member: Reihenfolge, Beschriftung und
-- Auswahl kommen aus dem Rollenkatalog statt aus drei Codelisten.
-- Deterministisch sortiert – bisher entschied der Zufall, welcher Name
-- erscheint, wenn eine Rolle mehrfach besetzt ist.
CREATE OR REPLACE FUNCTION public.get_board_members()
RETURNS TABLE (role_key text, role_label text, sort_order integer, display_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rc.key,
         rc.label,
         rc.sort_order,
         COALESCE(
           NULLIF(TRIM(p.display_name), ''),
           NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), '')
         )
  FROM public.role_catalog rc
  LEFT JOIN LATERAL (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text = rc.key
    ORDER BY ur.created_at, ur.user_id
    LIMIT 1
  ) held ON true
  LEFT JOIN public.profiles p ON p.id = held.user_id AND p.is_active
  WHERE rc.public_listed
  ORDER BY rc.sort_order, rc.key
$$;

COMMENT ON FUNCTION public.get_board_members() IS
  'Nach aussen auszuweisende Aemter mit aktuellem Inhaber. Reihenfolge und Beschriftung aus role_catalog.';

REVOKE ALL ON FUNCTION public.get_board_members() FROM PUBLIC, anon;
-- Vorerst nur fuer angemeldete Mitglieder. Fuer eine oeffentliche
-- Vorstandsanzeige auf der Website kann spaeter zusaetzlich anon berechtigt
-- werden - das ist eine Datenschutzentscheidung, keine technische.
GRANT EXECUTE ON FUNCTION public.get_board_members() TO authenticated;
