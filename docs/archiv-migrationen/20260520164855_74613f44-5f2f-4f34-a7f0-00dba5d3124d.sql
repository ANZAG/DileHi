
-- Membership applications (rebuilt with correct RLS)
CREATE TABLE IF NOT EXISTS public.membership_applications (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  salutation                text,
  first_name                text NOT NULL,
  last_name                 text NOT NULL,
  email                     text NOT NULL,
  phone                     text,
  birthdate                 date,
  street                    text,
  zip                       text,
  city                      text,
  membership_type           text NOT NULL DEFAULT 'aktiv',
  contribution_interval     text NOT NULL DEFAULT 'jaehrlich',
  iban                      text,
  bic                       text,
  account_holder            text,
  statutes_accepted         boolean NOT NULL DEFAULT false,
  data_processing_accepted  boolean NOT NULL DEFAULT false,
  sepa_accepted             boolean NOT NULL DEFAULT false,
  status                    text NOT NULL DEFAULT 'pending',
  reviewed_by               uuid,
  reviewed_at               timestamptz,
  review_notes              text,
  created_user_id           uuid
);

ALTER TABLE public.membership_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_application" ON public.membership_applications;
DROP POLICY IF EXISTS "admin_select_application" ON public.membership_applications;
DROP POLICY IF EXISTS "admin_update_application" ON public.membership_applications;
DROP POLICY IF EXISTS "admin_delete_application" ON public.membership_applications;

CREATE POLICY "Anyone can submit application"
  ON public.membership_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members managers can view applications"
  ON public.membership_applications FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'members.manage'));

CREATE POLICY "Members managers can update applications"
  ON public.membership_applications FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'members.manage'));

CREATE POLICY "Members managers can delete applications"
  ON public.membership_applications FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'members.manage'));

CREATE OR REPLACE FUNCTION public.get_pending_application_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.membership_applications WHERE status = 'pending';
$$;
