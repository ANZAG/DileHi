-- Forum
--
-- Eigenbau statt Discourse, Flarum oder MyBB. Der Grund ist nicht der Aufwand,
-- sondern die Kopplung: Ein fremdes Forum bringt sein eigenes Rechtesystem mit,
-- das dauerhaft mit unseren Rollen synchron gehalten werden müsste – und der
-- wertvollste Teil, der Veranstaltungs-Thread mit Zusagestand und Umfrage,
-- wäre über eine fremde API am schwersten umzusetzen. Für die eigenständige
-- Fassung käme obendrein ein zweiter Server je Verein dazu.
--
-- Abgeschaut ist trotzdem viel, vor allem von Discourse:
--   * Rechte je Rubrik als DREI getrennte Rechte (sehen / antworten / eröffnen)
--   * Lesestand statt Datum – "3 neue Beiträge seit deinem Besuch"
--   * Beobachten je Thema und je Rubrik statt global an/aus
--   * Entwürfe im Editor, Bearbeitungsverlauf, weiches Löschen
-- Weggelassen: Trust Levels, Abzeichen, Gamification. Bei 10 bis 50 Mitgliedern
-- ist das Ballast.

-- ══ Rubriken ════════════════════════════════════════════════════════════════

CREATE TYPE public.forum_category_status AS ENUM ('vorgeschlagen', 'aktiv', 'archiviert');

CREATE TABLE public.forum_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text,
  icon          text NOT NULL DEFAULT 'MessageSquare',
  sort_order    integer NOT NULL DEFAULT 0,
  -- Mitglieder dürfen Rubriken vorschlagen; freigeschaltet wird moderiert.
  status        public.forum_category_status NOT NULL DEFAULT 'vorgeschlagen',
  -- Rubrik für die automatisch angelegten Veranstaltungs-Threads. Genau eine.
  is_event_room boolean NOT NULL DEFAULT false,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX forum_one_event_room
  ON public.forum_categories ((true)) WHERE is_event_room;

/**
 * Rechte je Rubrik und Rolle.
 *
 * Drei getrennte Rechte, weil eine einzige Moderationsflagge die realen Fälle
 * nicht abbildet: "Vorstandsintern" soll für andere unsichtbar sein,
 * "Protokolle" darf jeder lesen, aber nur der Vorstand eröffnet Themen, und in
 * "Absprachen" darf jeder alles.
 */
CREATE TABLE public.forum_category_roles (
  category_id uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  can_view    boolean NOT NULL DEFAULT true,
  can_reply   boolean NOT NULL DEFAULT true,
  can_start   boolean NOT NULL DEFAULT true,
  -- Moderation je Rubrik: Wer die Quellenrubrik betreut, soll nicht überall
  -- löschen dürfen.
  is_moderator boolean NOT NULL DEFAULT false,
  PRIMARY KEY (category_id, role)
);

-- ══ Themen und Beiträge ═════════════════════════════════════════════════════

CREATE TABLE public.forum_threads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  title         text NOT NULL,
  slug          text NOT NULL,
  created_by    uuid NOT NULL,
  is_pinned     boolean NOT NULL DEFAULT false,
  is_locked     boolean NOT NULL DEFAULT false,
  -- Nach der Veranstaltung geschlossen, aber lesbar. Vereine schlagen
  -- erstaunlich oft nach, wie es im letzten Jahr lief.
  is_archived   boolean NOT NULL DEFAULT false,
  -- Verknüpfung zur Veranstaltung. ON DELETE SET NULL: Der Termin verschwindet,
  -- die Absprache bleibt lesbar.
  event_id      uuid REFERENCES public.events(id) ON DELETE SET NULL,
  post_count    integer NOT NULL DEFAULT 0,
  last_post_at  timestamptz NOT NULL DEFAULT now(),
  last_post_by  uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX forum_threads_category_idx ON public.forum_threads (category_id, is_pinned DESC, last_post_at DESC);
CREATE UNIQUE INDEX forum_threads_event_idx ON public.forum_threads (event_id) WHERE event_id IS NOT NULL;

CREATE TYPE public.forum_post_kind AS ENUM ('beitrag', 'umfrage', 'mitbringliste');

CREATE TABLE public.forum_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  kind         public.forum_post_kind NOT NULL DEFAULT 'beitrag',
  -- Gesäubertes HTML aus dem WYSIWYG-Editor.
  body         text NOT NULL DEFAULT '',
  -- Umfrage bzw. Mitbringliste: Frage, Optionen, Frist, anonym ja/nein.
  payload      jsonb NOT NULL DEFAULT '{}',
  created_by   uuid NOT NULL,
  reply_to_id  uuid REFERENCES public.forum_posts(id) ON DELETE SET NULL,
  edited_at    timestamptz,
  edited_by    uuid,
  -- Weiches Löschen: Für einen Verein mit Protokollcharakter ist wichtig, dass
  -- nachvollziehbar bleibt, dass etwas da war.
  deleted_at   timestamptz,
  deleted_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX forum_posts_thread_idx ON public.forum_posts (thread_id, created_at);

/** Bearbeitungsverlauf – wer wann was geändert hat. */
CREATE TABLE public.forum_post_revisions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  body       text NOT NULL,
  edited_by  uuid NOT NULL,
  edited_at  timestamptz NOT NULL DEFAULT now()
);

-- ══ Beteiligung ═════════════════════════════════════════════════════════════

CREATE TABLE public.forum_reactions (
  post_id  uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL,
  emoji    text NOT NULL,
  PRIMARY KEY (post_id, user_id, emoji)
);

/** Stimmen zu Umfragen und Einträge in Mitbringlisten. */
CREATE TABLE public.forum_poll_votes (
  post_id  uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL,
  option_key text NOT NULL,
  note     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, option_key)
);

/**
 * Lesestand. Das ist der Unterschied zwischen einem Forum, das lebt, und einer
 * Liste nach Datum: "3 neue Beiträge seit deinem Besuch" statt "zuletzt am 14.".
 */
CREATE TABLE public.forum_read_state (
  user_id    uuid NOT NULL,
  thread_id  uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, thread_id)
);

CREATE TYPE public.forum_watch_level AS ENUM ('beobachten', 'verfolgen', 'stumm');

/** Beobachten je Thema ODER je Rubrik – global an/aus wird sofort abgeschaltet. */
CREATE TABLE public.forum_subscriptions (
  user_id     uuid NOT NULL,
  thread_id   uuid REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  level       public.forum_watch_level NOT NULL DEFAULT 'beobachten',
  CHECK (num_nonnulls(thread_id, category_id) = 1)
);

CREATE UNIQUE INDEX forum_sub_thread_idx   ON public.forum_subscriptions (user_id, thread_id)   WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX forum_sub_category_idx ON public.forum_subscriptions (user_id, category_id) WHERE category_id IS NOT NULL;

/** Entwürfe – wer beim Schreiben abgelenkt wird, verliert den Text sonst. */
CREATE TABLE public.forum_drafts (
  user_id    uuid NOT NULL,
  thread_id  uuid REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  title      text,
  body       text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX forum_draft_thread_idx   ON public.forum_drafts (user_id, thread_id)   WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX forum_draft_category_idx ON public.forum_drafts (user_id, category_id) WHERE category_id IS NOT NULL;

-- ══ Profilbeiwerk ═══════════════════════════════════════════════════════════
--
-- Kleinigkeiten, die in jedem Forum erwartet werden. Bewusst am Profil und
-- nicht am Forum: Der eigene Titel taucht auch anderswo auf.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS forum_signature text,
  ADD COLUMN IF NOT EXISTS forum_title     text;

COMMENT ON COLUMN public.profiles.forum_title IS
  'Selbst gewaehlter Beiname unter dem Namen, z. B. "Zeugwart". Kein Amt und keine Berechtigung.';

-- ══ Rechte ══════════════════════════════════════════════════════════════════

INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES
  ('forum.use',              'Forum nutzen',                    'forum', 300),
  ('forum.moderate',         'Forum moderieren',                'forum', 310),
  ('forum.categories_manage','Rubriken anlegen und freigeben',  'forum', 320)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission, granted)
SELECT r.role, p.permission, true
FROM (VALUES
  ('mitglied'::public.app_role), ('herold'::public.app_role),
  ('schatzmeister'::public.app_role), ('officiatus_1'::public.app_role),
  ('officiatus_2'::public.app_role)
) AS r(role)
CROSS JOIN (VALUES ('forum.use')) AS p(permission)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role = r.role AND rp.permission = p.permission
);

INSERT INTO public.role_permissions (role, permission, granted)
SELECT r.role, p.permission, true
FROM (VALUES ('officiatus_1'::public.app_role), ('officiatus_2'::public.app_role)) AS r(role)
CROSS JOIN (VALUES ('forum.moderate'), ('forum.categories_manage')) AS p(permission)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp
  WHERE rp.role = r.role AND rp.permission = p.permission
);

-- Verhalten der Veranstaltungs-Threads – vom technischen Administrator gesetzt.
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS forum_event_thread text NOT NULL DEFAULT 'vorgabe_an'
    CHECK (forum_event_thread IN ('immer', 'vorgabe_an', 'vorgabe_aus', 'aus'));

COMMENT ON COLUMN public.app_settings.forum_event_thread IS
  'immer = immer anlegen, vorgabe_an/aus = Haekchen beim Anlegen vorbelegt, aus = keine Threads zu Veranstaltungen.';

-- ══ Hilfsfunktionen für die Zugriffsprüfung ═════════════════════════════════
--
-- Als Funktionen, damit die Policies lesbar bleiben und die Regel an einer
-- Stelle steht.

CREATE OR REPLACE FUNCTION public.forum_can(_category_id uuid, _what text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_permission(auth.uid(), 'forum.moderate')
      OR EXISTS (
        SELECT 1
        FROM public.forum_category_roles cr
        JOIN public.user_roles ur ON ur.role = cr.role AND ur.user_id = auth.uid()
        WHERE cr.category_id = _category_id
          AND CASE _what
                WHEN 'view'  THEN cr.can_view
                WHEN 'reply' THEN cr.can_reply
                WHEN 'start' THEN cr.can_start
                WHEN 'mod'   THEN cr.is_moderator
                ELSE false
              END
      );
$$;

COMMENT ON FUNCTION public.forum_can(uuid, text) IS
  'Darf der angemeldete Nutzer in dieser Rubrik sehen/antworten/eroeffnen/moderieren?';

REVOKE ALL ON FUNCTION public.forum_can(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forum_can(uuid, text) TO authenticated;

-- ══ Zugriffsschutz ══════════════════════════════════════════════════════════

ALTER TABLE public.forum_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_category_roles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_revisions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_poll_votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_read_state      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_drafts          ENABLE ROW LEVEL SECURITY;

-- Rubriken: sichtbar, wenn aktiv und die Rolle sie sehen darf. Eigene
-- Vorschläge sieht man auch vor der Freigabe.
CREATE POLICY "Rubriken sehen" ON public.forum_categories FOR SELECT TO authenticated
USING (
  public.has_permission(auth.uid(), 'forum.use')
  AND (
    (status = 'aktiv' AND public.forum_can(id, 'view'))
    OR created_by = auth.uid()
    OR public.has_permission(auth.uid(), 'forum.categories_manage')
  )
);

CREATE POLICY "Rubrik vorschlagen" ON public.forum_categories FOR INSERT TO authenticated
WITH CHECK (
  public.has_permission(auth.uid(), 'forum.use')
  AND created_by = auth.uid()
  -- Freigeben darf nur die Moderation; vorschlagen jeder.
  AND (status = 'vorgeschlagen' OR public.has_permission(auth.uid(), 'forum.categories_manage'))
);

CREATE POLICY "Rubriken verwalten" ON public.forum_categories FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'forum.categories_manage'));

CREATE POLICY "Rubriken loeschen" ON public.forum_categories FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'forum.categories_manage'));

CREATE POLICY "Rubrikrechte sehen" ON public.forum_category_roles FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'forum.use'));

CREATE POLICY "Rubrikrechte verwalten" ON public.forum_category_roles FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'forum.categories_manage'))
WITH CHECK (public.has_permission(auth.uid(), 'forum.categories_manage'));

-- Themen
CREATE POLICY "Themen sehen" ON public.forum_threads FOR SELECT TO authenticated
USING (public.forum_can(category_id, 'view'));

CREATE POLICY "Thema eroeffnen" ON public.forum_threads FOR INSERT TO authenticated
WITH CHECK (public.forum_can(category_id, 'start') AND created_by = auth.uid());

CREATE POLICY "Thema aendern" ON public.forum_threads FOR UPDATE TO authenticated
USING (
  (created_by = auth.uid() AND NOT is_locked)
  OR public.forum_can(category_id, 'mod')
  OR public.has_permission(auth.uid(), 'forum.moderate')
);

CREATE POLICY "Thema loeschen" ON public.forum_threads FOR DELETE TO authenticated
USING (public.forum_can(category_id, 'mod') OR public.has_permission(auth.uid(), 'forum.moderate'));

-- Beiträge
CREATE POLICY "Beitraege sehen" ON public.forum_posts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.forum_threads t
  WHERE t.id = thread_id AND public.forum_can(t.category_id, 'view')
));

CREATE POLICY "Beitrag schreiben" ON public.forum_posts FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.forum_threads t
    WHERE t.id = thread_id
      AND NOT t.is_locked AND NOT t.is_archived
      AND public.forum_can(t.category_id, 'reply')
  )
);

CREATE POLICY "Beitrag aendern" ON public.forum_posts FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_permission(auth.uid(), 'forum.moderate')
  OR EXISTS (SELECT 1 FROM public.forum_threads t WHERE t.id = thread_id AND public.forum_can(t.category_id, 'mod'))
);

CREATE POLICY "Verlauf sehen" ON public.forum_post_revisions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.forum_posts p JOIN public.forum_threads t ON t.id = p.thread_id
  WHERE p.id = post_id AND public.forum_can(t.category_id, 'view')
));

-- Reaktionen, Stimmen, Lesestand, Abos, Entwürfe: jeder für sich selbst.
CREATE POLICY "Reaktionen sehen" ON public.forum_reactions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.forum_posts p JOIN public.forum_threads t ON t.id = p.thread_id
  WHERE p.id = post_id AND public.forum_can(t.category_id, 'view')
));
CREATE POLICY "Eigene Reaktion" ON public.forum_reactions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Stimmen sehen" ON public.forum_poll_votes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.forum_posts p JOIN public.forum_threads t ON t.id = p.thread_id
  WHERE p.id = post_id AND public.forum_can(t.category_id, 'view')
));
CREATE POLICY "Eigene Stimme" ON public.forum_poll_votes FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Eigener Lesestand" ON public.forum_read_state FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Eigene Abos" ON public.forum_subscriptions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Eigene Entwuerfe" ON public.forum_drafts FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ══ Zähler und Verlauf pflegen ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.forum_touch_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_threads
    SET post_count = post_count + 1, last_post_at = NEW.created_at, last_post_by = NEW.created_by
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_threads
    SET post_count = GREATEST(post_count - 1, 0)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER forum_posts_touch_thread
AFTER INSERT OR DELETE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.forum_touch_thread();

/** Vor jeder Änderung den alten Stand sichern. */
CREATE OR REPLACE FUNCTION public.forum_keep_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    INSERT INTO public.forum_post_revisions (post_id, body, edited_by)
    VALUES (OLD.id, OLD.body, COALESCE(auth.uid(), OLD.created_by));
    NEW.edited_at := now();
    NEW.edited_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER forum_posts_keep_revision
BEFORE UPDATE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.forum_keep_revision();

-- ══ Startrubriken ═══════════════════════════════════════════════════════════
-- Ein leeres Forum wird nicht benutzt. Diese vier decken ab, was ein Verein
-- typischerweise braucht; umbenennen und löschen geht jederzeit.

INSERT INTO public.forum_categories (name, slug, description, icon, sort_order, status, is_event_room) VALUES
  ('Ankündigungen', 'ankuendigungen', 'Wichtiges vom Vorstand.',                 'Megaphone',     10, 'aktiv', false),
  ('Veranstaltungen', 'veranstaltungen', 'Absprachen zu einzelnen Terminen.',    'CalendarDays',  20, 'aktiv', true),
  ('Werkstatt', 'werkstatt', 'Handwerk, Ausrüstung und Fragen dazu.',            'Wrench',        30, 'aktiv', false),
  ('Plauderei', 'plauderei', 'Alles, was sonst nirgends passt.',                 'MessageSquare', 40, 'aktiv', false)
ON CONFLICT (slug) DO NOTHING;

-- Voreinstellung: Alle Rollen dürfen überall lesen, antworten und eröffnen –
-- außer in "Ankündigungen", wo nur der geschäftsführende Vorstand Themen
-- eröffnet. Feiner einstellen lässt sich das in der Verwaltung.
INSERT INTO public.forum_category_roles (category_id, role, can_view, can_reply, can_start, is_moderator)
SELECT c.id, r.role, true, true,
       CASE WHEN c.slug = 'ankuendigungen'
            THEN r.role IN ('officiatus_1', 'officiatus_2') ELSE true END,
       r.role IN ('officiatus_1', 'officiatus_2')
FROM public.forum_categories c
CROSS JOIN (
  SELECT unnest(ARRAY['mitglied','herold','schatzmeister','officiatus_1','officiatus_2']::public.app_role[]) AS role
) r
ON CONFLICT (category_id, role) DO NOTHING;
