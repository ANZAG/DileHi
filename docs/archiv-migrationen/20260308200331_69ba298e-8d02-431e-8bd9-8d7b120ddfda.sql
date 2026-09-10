
-- Extend profiles table with membership fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS salutation text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS membership_type text DEFAULT 'aktiv',
  ADD COLUMN IF NOT EXISTS contribution_interval text DEFAULT 'jaehrlich',
  ADD COLUMN IF NOT EXISTS entry_date date,
  ADD COLUMN IF NOT EXISTS exit_date date,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add schatzmeister to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'schatzmeister';

-- Create is_schatzmeister function using text cast
CREATE OR REPLACE FUNCTION public.is_schatzmeister(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'schatzmeister'
  )
$$;

-- Update is_member to include schatzmeister
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('vorstand', 'mitglied', 'herold', 'schatzmeister')
  )
$$;

-- Update count_members
CREATE OR REPLACE FUNCTION public.count_members()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id) FROM public.user_roles WHERE role::text IN ('vorstand', 'mitglied', 'herold', 'schatzmeister')
$$;

-- Create membership_files table
CREATE TABLE IF NOT EXISTS public.membership_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vorstand can insert membership files"
  ON public.membership_files FOR INSERT
  WITH CHECK (is_vorstand(auth.uid()));

CREATE POLICY "Vorstand can delete membership files"
  ON public.membership_files FOR DELETE
  USING (is_vorstand(auth.uid()));

CREATE POLICY "User or Vorstand or Schatzmeister can view membership files"
  ON public.membership_files FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_vorstand(auth.uid())
    OR is_schatzmeister(auth.uid())
  );
