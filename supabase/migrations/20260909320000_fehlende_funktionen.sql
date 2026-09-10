-- Fünf Funktionen, die es nur in der laufenden Datenbank gab
--
-- Sie werden benutzt – `get_role_catalog()` und `get_permission_catalog()`
-- sogar direkt vom Programm –, standen aber in keiner Migration. Angelegt
-- wurden sie vor der eingecheckten Historie oder von Hand.
--
-- Hier stehen sie im Wortlaut aus der laufenden Datenbank
-- (`pg_get_functiondef`), nicht nachgebaut: Ein geratener Rumpf hätte beim
-- Einspielen die funktionierende Fassung überschrieben.
--
-- ── Und was das über die Historie sagt ─────────────────────────────────────
--
-- Beim Nachsehen kam heraus, dass es nicht bei Funktionen bleibt: Auch die
-- Tabellen `role_catalog`, `permission_catalog` und `role_permissions` werden
-- befüllt und verändert, aber nirgends angelegt. Die Migrationen allein
-- ergeben also keine lauffähige Datenbank.
--
-- Diese Datei schliesst die Lücke bei den Funktionen. Die Tabellen brauchen
-- einen Ausgangsstand aus der laufenden Datenbank – siehe docs/standalone.md.

CREATE OR REPLACE FUNCTION public.get_member_directory()
RETURNS TABLE (id uuid, display_name text, is_active boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT p.id, p.display_name, p.is_active
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
$fn$;

CREATE OR REPLACE FUNCTION public.get_member_ids()
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE public.is_member(ur.user_id)
$fn$;

CREATE OR REPLACE FUNCTION public.get_permission_catalog()
RETURNS TABLE (key text, label text, category text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT key, label, category FROM public.permission_catalog ORDER BY category, sort_order
$fn$;

CREATE OR REPLACE FUNCTION public.get_role_catalog()
RETURNS TABLE (key text, label text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT key, label FROM public.role_catalog ORDER BY sort_order
$fn$;

CREATE OR REPLACE FUNCTION public.touch_election_on_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  UPDATE public.elections
  SET updated_at = now()
  WHERE id = COALESCE(NEW.election_id, OLD.election_id);
  RETURN COALESCE(NEW, OLD);
END;
$fn$;

-- Die Rechte, wie sie in den Migrationen von August stehen – dort allerdings
-- an Funktionen, die es zu dem Zeitpunkt noch gar nicht gab.
REVOKE ALL ON FUNCTION public.get_member_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_directory() TO authenticated;

REVOKE ALL ON FUNCTION public.get_member_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_ids() TO authenticated;

REVOKE ALL ON FUNCTION public.get_permission_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_permission_catalog() TO authenticated;

REVOKE ALL ON FUNCTION public.get_role_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_role_catalog() TO authenticated;

-- Triggerfunktion: Postgres ruft sie im Rahmen der ausloesenden Anweisung.
REVOKE ALL ON FUNCTION public.touch_election_on_vote() FROM PUBLIC, anon, authenticated;
