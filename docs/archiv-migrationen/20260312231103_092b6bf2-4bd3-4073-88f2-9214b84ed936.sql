
-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS: Vorstand can manage (hardcoded for safety - prevents lockout)
CREATE POLICY "Vorstand can view permissions" ON public.role_permissions FOR SELECT TO authenticated USING (is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can insert permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can update permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can delete permissions" ON public.role_permissions FOR DELETE TO authenticated USING (is_vorstand(auth.uid()));

-- has_permission function (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
      AND rp.granted = true
  )
$$;

-- get_user_permissions function
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT rp.permission), '{}')
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = _user_id
    AND rp.granted = true
$$;

-- Seed default permissions
INSERT INTO public.role_permissions (role, permission) VALUES
  -- Vorstand (all permissions)
  ('vorstand', 'admin.access'),
  ('vorstand', 'roles.manage'),
  ('vorstand', 'members.manage'),
  ('vorstand', 'profiles.view_all'),
  ('vorstand', 'membership_files.manage'),
  ('vorstand', 'membership_files.view'),
  ('vorstand', 'gallery.manage'),
  ('vorstand', 'epoch_sources.manage'),
  ('vorstand', 'visitor_highlights.manage'),
  ('vorstand', 'site_images.manage'),
  ('vorstand', 'contacts.view'),
  ('vorstand', 'contacts.reply'),
  ('vorstand', 'contacts.delete'),
  ('vorstand', 'documents.manage'),
  ('vorstand', 'elections.manage'),
  ('vorstand', 'contributions.manage'),
  ('vorstand', 'announcements.moderate'),
  ('vorstand', 'events.moderate'),
  ('vorstand', 'audit.view'),
  -- Herold
  ('herold', 'admin.access'),
  ('herold', 'gallery.manage'),
  ('herold', 'epoch_sources.manage'),
  ('herold', 'visitor_highlights.manage'),
  ('herold', 'site_images.manage'),
  ('herold', 'contacts.view'),
  ('herold', 'profiles.view_all'),
  -- Schatzmeister
  ('schatzmeister', 'admin.access'),
  ('schatzmeister', 'contacts.view'),
  ('schatzmeister', 'contributions.manage'),
  ('schatzmeister', 'membership_files.view'),
  ('schatzmeister', 'profiles.view_all');

-- === UPDATE RLS POLICIES TO USE has_permission() ===

-- gallery_images
DROP POLICY IF EXISTS "Admin can delete gallery" ON public.gallery_images;
DROP POLICY IF EXISTS "Admin can insert gallery" ON public.gallery_images;
DROP POLICY IF EXISTS "Admin can update gallery" ON public.gallery_images;
CREATE POLICY "Perm: gallery.manage delete" ON public.gallery_images FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'gallery.manage'));
CREATE POLICY "Perm: gallery.manage insert" ON public.gallery_images FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'gallery.manage'));
CREATE POLICY "Perm: gallery.manage update" ON public.gallery_images FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'gallery.manage'));

-- epoch_sources
DROP POLICY IF EXISTS "Vorstand/Herold can delete epoch_sources" ON public.epoch_sources;
DROP POLICY IF EXISTS "Vorstand/Herold can insert epoch_sources" ON public.epoch_sources;
DROP POLICY IF EXISTS "Vorstand/Herold can update epoch_sources" ON public.epoch_sources;
CREATE POLICY "Perm: epoch_sources.manage delete" ON public.epoch_sources FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'epoch_sources.manage'));
CREATE POLICY "Perm: epoch_sources.manage insert" ON public.epoch_sources FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'epoch_sources.manage'));
CREATE POLICY "Perm: epoch_sources.manage update" ON public.epoch_sources FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'epoch_sources.manage'));

-- epoch_visitor_items
DROP POLICY IF EXISTS "Vorstand/Herold can delete epoch_visitor_items" ON public.epoch_visitor_items;
DROP POLICY IF EXISTS "Vorstand/Herold can insert epoch_visitor_items" ON public.epoch_visitor_items;
DROP POLICY IF EXISTS "Vorstand/Herold can update epoch_visitor_items" ON public.epoch_visitor_items;
CREATE POLICY "Perm: visitor_highlights.manage delete" ON public.epoch_visitor_items FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'visitor_highlights.manage'));
CREATE POLICY "Perm: visitor_highlights.manage insert" ON public.epoch_visitor_items FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'visitor_highlights.manage'));
CREATE POLICY "Perm: visitor_highlights.manage update" ON public.epoch_visitor_items FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'visitor_highlights.manage'));

-- site_images
DROP POLICY IF EXISTS "Vorstand/Herold can delete site_images" ON public.site_images;
DROP POLICY IF EXISTS "Vorstand/Herold can insert site_images" ON public.site_images;
DROP POLICY IF EXISTS "Vorstand/Herold can update site_images" ON public.site_images;
CREATE POLICY "Perm: site_images.manage delete" ON public.site_images FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'site_images.manage'));
CREATE POLICY "Perm: site_images.manage insert" ON public.site_images FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'site_images.manage'));
CREATE POLICY "Perm: site_images.manage update" ON public.site_images FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'site_images.manage'));

-- contact_messages
DROP POLICY IF EXISTS "Admins can read contacts" ON public.contact_messages;
DROP POLICY IF EXISTS "Vorstand can delete contacts" ON public.contact_messages;
CREATE POLICY "Perm: contacts.view" ON public.contact_messages FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'contacts.view'));
CREATE POLICY "Perm: contacts.delete" ON public.contact_messages FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'contacts.delete'));

-- contact_replies
DROP POLICY IF EXISTS "Admins can view replies" ON public.contact_replies;
DROP POLICY IF EXISTS "Vorstand can insert replies" ON public.contact_replies;
CREATE POLICY "Perm: contacts.view replies" ON public.contact_replies FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'contacts.view'));
CREATE POLICY "Perm: contacts.reply" ON public.contact_replies FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'contacts.reply') AND replied_by = auth.uid());

-- documents
DROP POLICY IF EXISTS "Vorstand can delete documents" ON public.documents;
DROP POLICY IF EXISTS "Vorstand can insert documents" ON public.documents;
CREATE POLICY "Perm: documents.manage delete" ON public.documents FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'documents.manage'));
CREATE POLICY "Perm: documents.manage insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'documents.manage'));

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Perm: profiles.view_all" ON public.profiles FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'profiles.view_all'));

-- elections
DROP POLICY IF EXISTS "Vorstand can create elections" ON public.elections;
DROP POLICY IF EXISTS "Vorstand can delete elections" ON public.elections;
DROP POLICY IF EXISTS "Vorstand can update elections" ON public.elections;
CREATE POLICY "Perm: elections.manage create" ON public.elections FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'elections.manage') AND created_by = auth.uid());
CREATE POLICY "Perm: elections.manage delete" ON public.elections FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'));
CREATE POLICY "Perm: elections.manage update" ON public.elections FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'));

-- candidates
DROP POLICY IF EXISTS "Vorstand can create candidates" ON public.candidates;
DROP POLICY IF EXISTS "Vorstand can delete candidates" ON public.candidates;
CREATE POLICY "Perm: elections.manage create candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'elections.manage'));
CREATE POLICY "Perm: elections.manage delete candidates" ON public.candidates FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'));

-- election_groups
DROP POLICY IF EXISTS "Vorstand can create election groups" ON public.election_groups;
DROP POLICY IF EXISTS "Vorstand can delete election groups" ON public.election_groups;
DROP POLICY IF EXISTS "Vorstand can update election groups" ON public.election_groups;
CREATE POLICY "Perm: elections.manage create groups" ON public.election_groups FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'elections.manage') AND created_by = auth.uid());
CREATE POLICY "Perm: elections.manage delete groups" ON public.election_groups FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'));
CREATE POLICY "Perm: elections.manage update groups" ON public.election_groups FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'));

-- election_audit_log
DROP POLICY IF EXISTS "Vorstand can create audit log entries" ON public.election_audit_log;
DROP POLICY IF EXISTS "Vorstand can view audit log" ON public.election_audit_log;
CREATE POLICY "Perm: audit.view" ON public.election_audit_log FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'audit.view'));
CREATE POLICY "Perm: elections.manage audit insert" ON public.election_audit_log FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'elections.manage'));

-- contributions
DROP POLICY IF EXISTS "Own or treasurer can view contributions" ON public.contributions;
DROP POLICY IF EXISTS "Treasurer or Vorstand can delete contributions" ON public.contributions;
DROP POLICY IF EXISTS "Treasurer or Vorstand can insert contributions" ON public.contributions;
DROP POLICY IF EXISTS "Treasurer or Vorstand can update contributions" ON public.contributions;
CREATE POLICY "Perm: contributions view" ON public.contributions FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_permission(auth.uid(), 'contributions.manage'));
CREATE POLICY "Perm: contributions.manage delete" ON public.contributions FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'contributions.manage'));
CREATE POLICY "Perm: contributions.manage insert" ON public.contributions FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'contributions.manage'));
CREATE POLICY "Perm: contributions.manage update" ON public.contributions FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'contributions.manage'));

-- contribution_rates
DROP POLICY IF EXISTS "Treasurer or Vorstand can insert rates" ON public.contribution_rates;
DROP POLICY IF EXISTS "Treasurer or Vorstand can update rates" ON public.contribution_rates;
CREATE POLICY "Perm: contributions.manage insert rates" ON public.contribution_rates FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'contributions.manage'));
CREATE POLICY "Perm: contributions.manage update rates" ON public.contribution_rates FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'contributions.manage'));

-- membership_files
DROP POLICY IF EXISTS "User or Vorstand or Schatzmeister can view membership files" ON public.membership_files;
DROP POLICY IF EXISTS "Vorstand can delete membership files" ON public.membership_files;
DROP POLICY IF EXISTS "Vorstand can insert membership files" ON public.membership_files;
CREATE POLICY "Perm: membership_files view" ON public.membership_files FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_permission(auth.uid(), 'membership_files.view'));
CREATE POLICY "Perm: membership_files.manage delete" ON public.membership_files FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'membership_files.manage'));
CREATE POLICY "Perm: membership_files.manage insert" ON public.membership_files FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'membership_files.manage'));

-- user_roles
DROP POLICY IF EXISTS "Vorstand can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Vorstand can insert roles" ON public.user_roles;
CREATE POLICY "Perm: members.manage delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'members.manage'));
CREATE POLICY "Perm: members.manage insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'members.manage'));

-- announcements
DROP POLICY IF EXISTS "Vorstand can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Vorstand can update announcements" ON public.announcements;
CREATE POLICY "Perm: announcements.moderate delete" ON public.announcements FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'announcements.moderate'));
CREATE POLICY "Perm: announcements.moderate update" ON public.announcements FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'announcements.moderate'));

-- announcement_files
DROP POLICY IF EXISTS "Vorstand can delete announcement files" ON public.announcement_files;
CREATE POLICY "Perm: announcements.moderate delete files" ON public.announcement_files FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'announcements.moderate'));

-- announcement_replies
DROP POLICY IF EXISTS "Own or vorstand can delete replies" ON public.announcement_replies;
CREATE POLICY "Perm: delete replies" ON public.announcement_replies FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_permission(auth.uid(), 'announcements.moderate'));

-- events
DROP POLICY IF EXISTS "Creator or Vorstand can delete events" ON public.events;
DROP POLICY IF EXISTS "Creator or Vorstand can update events" ON public.events;
CREATE POLICY "Perm: events.moderate delete" ON public.events FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_permission(auth.uid(), 'events.moderate'));
CREATE POLICY "Perm: events.moderate update" ON public.events FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_permission(auth.uid(), 'events.moderate'));

-- group_members
DROP POLICY IF EXISTS "Vorstand can delete group members" ON public.group_members;
DROP POLICY IF EXISTS "Vorstand can insert group members" ON public.group_members;
DROP POLICY IF EXISTS "Vorstand can update group members" ON public.group_members;
CREATE POLICY "Perm: elections.manage delete members" ON public.group_members FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'));
CREATE POLICY "Perm: elections.manage insert members" ON public.group_members FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'elections.manage'));
CREATE POLICY "Perm: elections.manage update members" ON public.group_members FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'));

-- representation_log
DROP POLICY IF EXISTS "Vorstand can insert representation log" ON public.representation_log;
DROP POLICY IF EXISTS "Vorstand can view representation log" ON public.representation_log;
CREATE POLICY "Perm: elections.manage insert rep log" ON public.representation_log FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'elections.manage'));
CREATE POLICY "Perm: elections.manage view rep log" ON public.representation_log FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'elections.manage'));
