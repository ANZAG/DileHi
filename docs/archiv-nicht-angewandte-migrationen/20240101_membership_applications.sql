-- ============================================================
-- Migration: membership_applications table
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists public.membership_applications (
  id                        uuid primary key default gen_random_uuid(),
  created_at                timestamptz default now(),

  -- Applicant personal data
  salutation                text,
  first_name                text not null,
  last_name                 text not null,
  email                     text not null,
  phone                     text,
  birthdate                 date,
  street                    text,
  zip                       text,
  city                      text,

  -- Membership preferences
  membership_type           text default 'aktiv',
  contribution_interval     text default 'jaehrlich',

  -- SEPA direct debit
  iban                      text,
  bic                       text,
  account_holder            text,

  -- Consent checkboxes
  statutes_accepted         boolean default false,
  data_processing_accepted  boolean default false,
  sepa_accepted             boolean default false,

  -- Review / workflow
  status                    text default 'pending',  -- pending | approved | rejected
  reviewed_by               uuid references auth.users(id),
  reviewed_at               timestamptz,
  review_notes              text,
  created_user_id           uuid  -- set after the invited user accepts
);

-- ---- Row Level Security ----
alter table public.membership_applications enable row level security;

-- Anyone (including anonymous visitors) can submit a new application.
create policy "public_insert_application"
  on public.membership_applications
  for insert
  with check (true);

-- Only members with the admin.access permission can read applications.
create policy "admin_select_application"
  on public.membership_applications
  for select
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role = ur.role
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and p.key = 'admin.access'
    )
  );

-- Only members with admin.access can update (approve / reject) applications.
create policy "admin_update_application"
  on public.membership_applications
  for update
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role = ur.role
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and p.key = 'admin.access'
    )
  );

-- ============================================================
-- Optional: pending-application count function for the dashboard badge
-- ============================================================
create or replace function public.get_pending_application_count()
returns integer
language sql
security definer
as $$
  select count(*)::integer
  from public.membership_applications
  where status = 'pending';
$$;
