-- Archiv, geschützte Veranstaltungs-Threads und eine Rubrik für Voranfragen
--
-- Ausgangspunkt: Wird eine Veranstaltung gelöscht, bleibt ihre Absprache
-- unberührt in der Liste stehen – ohne Termin, ohne Bezug, ohne dass jemand
-- weiss, warum sie noch da ist. Der Fremdschlüssel setzt zwar event_id auf
-- NULL, aber sonst passiert nichts.
--
-- Der Thread einfach mitzulöschen wäre falsch: Darin steht, wer was mitbringen
-- wollte und was besprochen wurde. Für einen Verein ist das Protokoll. Er wird
-- deshalb archiviert – lesbar, aber abgeschlossen.

-- ══ 1. Rubriken, die nur automatisch befüllt werden ═════════════════════════
ALTER TABLE public.forum_categories
  ADD COLUMN IF NOT EXISTS only_auto_threads boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.forum_categories.only_auto_threads IS
  'Keine Themen von Hand: Diese Rubrik fuellt sich nur ueber Veranstaltungen.';

-- ══ 2. Der Thread merkt sich, wann der Termin vorbei war ════════════════════
--
-- Als Kopie und nicht per Verweis: Nach dem Löschen der Veranstaltung ist
-- event_id NULL, aber die Regel „Moderation darf nach dem Termin archivieren"
-- muss weiter gelten können.
ALTER TABLE public.forum_threads
  ADD COLUMN IF NOT EXISTS event_ends_on date;

COMMENT ON COLUMN public.forum_threads.event_ends_on IS
  'Ende des zugehoerigen Termins. Nicht NULL = dieser Thread gehoert zu einer Veranstaltung.';

-- Bestehende Threads nachtragen.
UPDATE public.forum_threads t
SET event_ends_on = COALESCE(e.end_date, e.start_date)::date
FROM public.events e
WHERE t.event_id = e.id AND t.event_ends_on IS NULL;

-- ══ 3. Beim Anlegen mitschreiben ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.ensure_event_thread(_event_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event       public.events%ROWTYPE;
  _mode        text;
  _category_id uuid;
  _thread_id   uuid;
  _slug        text;
BEGIN
  SELECT * INTO _event FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(forum_event_thread, 'vorgabe_an') INTO _mode FROM public.app_settings WHERE id;
  IF _mode = 'aus' THEN RETURN NULL; END IF;
  IF _mode <> 'immer' AND COALESCE(_event.forum_thread_wanted, _mode = 'vorgabe_an') IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  SELECT id INTO _thread_id FROM public.forum_threads WHERE event_id = _event_id;
  IF _thread_id IS NOT NULL THEN RETURN _thread_id; END IF;

  SELECT id INTO _category_id FROM public.forum_categories
   WHERE is_event_room AND status = 'aktiv' LIMIT 1;
  IF _category_id IS NULL THEN RETURN NULL; END IF;

  _slug := left(regexp_replace(lower(
             translate(_event.title, 'äöüßÄÖÜ', 'aousAOU')
           ), '[^a-z0-9]+', '-', 'g'), 60);
  IF _slug = '' OR _slug IS NULL THEN _slug := 'termin'; END IF;

  INSERT INTO public.forum_threads (category_id, title, slug, created_by, event_id, event_ends_on)
  VALUES (_category_id, _event.title, _slug, _event.created_by, _event_id,
          COALESCE(_event.end_date, _event.start_date)::date)
  RETURNING id INTO _thread_id;

  INSERT INTO public.forum_posts (thread_id, body, created_by)
  VALUES (
    _thread_id,
    '<p>Hier könnt ihr alles zu <strong>' ||
      replace(replace(_event.title, '&', '&amp;'), '<', '&lt;') ||
      '</strong> besprechen – Fahrgemeinschaften, Material, wer was mitbringt.</p>',
    _event.created_by
  );

  RETURN _thread_id;
END;
$$;

-- Verschiebt sich der Termin, verschiebt sich auch die Frist fürs Archivieren.
CREATE OR REPLACE FUNCTION public.events_sync_thread_title()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forum_threads
  SET title = NEW.title,
      event_ends_on = COALESCE(NEW.end_date, NEW.start_date)::date
  WHERE event_id = NEW.id
    AND (title IS DISTINCT FROM NEW.title
         OR event_ends_on IS DISTINCT FROM COALESCE(NEW.end_date, NEW.start_date)::date);
  RETURN NEW;
END;
$$;

-- ══ 4. Termin gelöscht: Absprache wandert ins Archiv ════════════════════════
/**
 * Läuft VOR dem Löschen der Veranstaltung.
 *
 * Setzt event_id gleich mit auf NULL – der Fremdschlüssel täte das ohnehin,
 * aber so sieht die Schutzregel unten in derselben Änderung, dass der Termin
 * gerade verschwindet, und lässt das Archivieren zu.
 */
CREATE OR REPLACE FUNCTION public.events_archive_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forum_threads
  SET is_archived = true,
      event_id = NULL
  WHERE event_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS events_forum_thread_archive ON public.events;
CREATE TRIGGER events_forum_thread_archive
BEFORE DELETE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.events_archive_thread();

-- ══ 5. Veranstaltungs-Threads sind geschützt ════════════════════════════════
/**
 * Solange der Termin existiert, gehört die Absprache dazu: Sie wird nicht von
 * Hand archiviert und nicht gelöscht, sondern verschwindet mit dem Termin.
 *
 * Ausnahme auf Wunsch: Ist der Termin vorbei, darf die Moderation archivieren.
 * Automatisch passiert das nicht – Nachbesprechungen brauchen manchmal noch
 * ein paar Tage, und ein Thread, der sich von selbst schliesst, während man
 * noch schreibt, ist ärgerlicher als einer, der zu lange offen steht.
 */
CREATE OR REPLACE FUNCTION public.forum_threads_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.event_id IS NOT NULL THEN
      RAISE EXCEPTION 'Diese Absprache gehoert zu einer Veranstaltung. Sie verschwindet, wenn der Termin geloescht wird.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- Der Termin wird gerade gelöscht (event_id fällt in derselben Änderung
  -- weg) – dann ist das Archivieren gewollt.
  IF OLD.event_id IS NOT NULL AND NEW.event_id IS NOT DISTINCT FROM OLD.event_id THEN
    IF NEW.is_archived AND NOT OLD.is_archived THEN
      IF OLD.event_ends_on IS NULL OR OLD.event_ends_on >= CURRENT_DATE THEN
        RAISE EXCEPTION 'Solange der Termin laeuft, kann die Absprache nicht archiviert werden.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_threads_guard_upd ON public.forum_threads;
CREATE TRIGGER forum_threads_guard_upd
BEFORE UPDATE ON public.forum_threads
FOR EACH ROW EXECUTE FUNCTION public.forum_threads_guard();

DROP TRIGGER IF EXISTS forum_threads_guard_del ON public.forum_threads;
CREATE TRIGGER forum_threads_guard_del
BEFORE DELETE ON public.forum_threads
FOR EACH ROW EXECUTE FUNCTION public.forum_threads_guard();

-- ══ 6. Keine Themen von Hand in der Terminrubrik ════════════════════════════
--
-- Die Regel steht in der Policy und nicht nur im Frontend: ensure_event_thread
-- läuft als SECURITY DEFINER und ist davon nicht betroffen, alles andere schon.
DROP POLICY IF EXISTS "Thema eroeffnen" ON public.forum_threads;
CREATE POLICY "Thema eroeffnen" ON public.forum_threads FOR INSERT TO authenticated
WITH CHECK (
  public.forum_can(category_id, 'start')
  AND created_by = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.forum_categories c
    WHERE c.id = category_id AND c.only_auto_threads
  )
);

-- ══ 7. Beiträge entfernen ═══════════════════════════════════════════════════
--
-- Bisher gab es gar keine Löschregel für Beiträge – niemand konnte einen
-- entfernen, auch die Moderation nicht. Weiches Löschen (deleted_at) läuft über
-- UPDATE und ist damit schon erlaubt; das hier ist für den Fall, dass etwas
-- wirklich weg muss, etwa personenbezogene Daten auf Verlangen.
DROP POLICY IF EXISTS "Beitrag entfernen" ON public.forum_posts;
CREATE POLICY "Beitrag entfernen" ON public.forum_posts FOR DELETE TO authenticated
USING (
  public.has_permission(auth.uid(), 'forum.moderate')
  OR EXISTS (
    SELECT 1 FROM public.forum_threads t
    WHERE t.id = thread_id AND public.forum_can(t.category_id, 'mod')
  )
);

-- ══ 8. Zwei Rubriken statt einer ════════════════════════════════════════════
--
-- „Passt der Termin überhaupt?" und „wer bringt den Grill mit?" sind zwei
-- verschiedene Gespräche. Das erste findet vor dem Termin statt und braucht
-- eine ganz normale, moderierbare Rubrik; das zweite hängt an einem konkreten
-- Datum und soll sich nicht von Hand anlegen lassen, sonst stehen dort
-- Themen ohne Termin.
UPDATE public.forum_categories
SET only_auto_threads = true
WHERE is_event_room;

INSERT INTO public.forum_categories (name, slug, description, icon, sort_order, status, is_event_room)
SELECT 'Terminvorschläge', 'terminvorschlaege',
       'Lohnt sich ein Termin? Hier wird vorher gefragt.',
       'CalendarPlus',
       COALESCE((SELECT sort_order FROM public.forum_categories WHERE is_event_room LIMIT 1), 0) - 1,
       'aktiv', false
WHERE NOT EXISTS (SELECT 1 FROM public.forum_categories WHERE slug = 'terminvorschlaege');

-- Rechte für die neue Rubrik wie für die Terminrubrik – sonst sieht sie niemand.
INSERT INTO public.forum_category_roles (category_id, role, can_view, can_reply, can_start, is_moderator)
SELECT neu.id, r.role, r.can_view, r.can_reply, true, r.is_moderator
FROM public.forum_categories neu
CROSS JOIN LATERAL (
  SELECT cr.role, cr.can_view, cr.can_reply, cr.is_moderator
  FROM public.forum_category_roles cr
  JOIN public.forum_categories c ON c.id = cr.category_id
  WHERE c.is_event_room
) r
WHERE neu.slug = 'terminvorschlaege'
ON CONFLICT (category_id, role) DO NOTHING;
