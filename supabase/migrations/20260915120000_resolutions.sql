-- Beschlussregister – ein Bereich für gemeinnützige Vereine.
--
-- „Haben wir das nicht 2019 schon beschlossen?" Die Antwort steht in einem
-- Protokoll, irgendwo, als PDF. Das Register stellt jeden Beschluss einzeln
-- und durchsuchbar hin: Nummer, Datum, Gremium, Wortlaut, Ergebnis – mit
-- Verweis auf die Abstimmung und das Protokoll, und mit dem Beschluss, der
-- ihn später aufgehoben hat.
--
-- Hängt an der Gemeinnützigkeit (Modul „nonprofit").

insert into public.app_modules (key, label, description, kind, requires, sort_order, enabled) values
  ('resolutions', 'Beschlussregister',
   'Alle Beschlüsse von Mitgliederversammlung und Vorstand, nummeriert und durchsuchbar.',
   'addon', 'nonprofit', 320, true)
on conflict (key) do nothing;

insert into public.permission_catalog (key, label, category, sort_order) values
  ('resolutions.manage', 'Beschlüsse erfassen und bearbeiten', 'Verein', 5)
on conflict (key) do nothing;

insert into public.role_permissions (role, permission, granted)
select rc.key, 'resolutions.manage', true
from public.role_catalog rc
where rc.is_leadership
on conflict (role, permission) do nothing;

create table if not exists public.resolutions (
  id uuid primary key default gen_random_uuid(),
  -- „2026/03", fortlaufend je Jahr; von Hand überschreibbar für alte Beschlüsse
  number text,
  decided_on date not null,
  body text not null default 'assembly' check (body in ('assembly', 'board', 'other')),
  title text not null,
  text text not null,
  outcome text not null default 'adopted' check (outcome in ('adopted', 'rejected')),
  result text,
  -- members = alle Mitglieder; board = nur, wer Beschlüsse verwaltet
  visibility text not null default 'members' check (visibility in ('members', 'board')),
  election_id uuid references public.elections(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  superseded_by uuid references public.resolutions(id) on delete set null,
  note text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resolutions_number_key unique (number)
);

create index if not exists resolutions_decided_on_idx on public.resolutions (decided_on desc);

-- Die Nummer vergibt die Datenbank, damit zwei, die gleichzeitig erfassen,
-- nicht beide „2026/03" bekommen – und damit niemand zählen muss.
create or replace function public.resolutions_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _jahr integer := extract(year from new.decided_on)::integer;
  _naechste integer;
begin
  new.updated_at := now();
  if new.number is null or btrim(new.number) = '' then
    perform pg_advisory_xact_lock(hashtext('resolutions_number'), _jahr);
    select coalesce(max(nullif(split_part(r.number, '/', 2), '')::integer), 0) + 1
      into _naechste
      from public.resolutions r
     where split_part(r.number, '/', 1) = _jahr::text
       and split_part(r.number, '/', 2) ~ '^[0-9]+$';
    new.number := _jahr || '/' || lpad(_naechste::text, 2, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists resolutions_guard on public.resolutions;
create trigger resolutions_guard
  before insert or update on public.resolutions
  for each row execute function public.resolutions_guard();

alter table public.resolutions enable row level security;

create policy "Members read resolutions" on public.resolutions
  for select to authenticated
  using (
    (visibility = 'members' and public.is_member(auth.uid()))
    or public.has_permission(auth.uid(), 'resolutions.manage')
  );

create policy "Managers change resolutions" on public.resolutions
  for all to authenticated
  using (public.has_permission(auth.uid(), 'resolutions.manage'))
  with check (public.has_permission(auth.uid(), 'resolutions.manage'));

grant select, insert, update, delete on public.resolutions to authenticated;
grant all on public.resolutions to service_role;

revoke all on function public.resolutions_guard() from public, anon, authenticated;
