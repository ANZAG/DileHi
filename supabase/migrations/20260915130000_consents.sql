-- Einwilligungen und Notfallkontakte – ein Bereich für gemeinnützige Vereine.
--
-- Fotos von Veranstaltungen landen auf der Website und in sozialen Medien.
-- Wer nicht zu sehen sein will, muss das nicht jedes Mal sagen müssen, und wer
-- fotografiert, muss wissen, wen er meiden soll. Bei Minderjährigen stimmt
-- ein Erziehungsberechtigter zu. Und im Lager braucht die Leitung im Notfall
-- eine Telefonnummer – aber nur sie.
--
-- Was hier entsteht:
--   consent_types               die Einwilligungen, die der Verein einholt
--   member_consents             die Entscheidung je Mitglied (ja/nein)
--   member_consent_log          jede Entscheidung mit Zeitpunkt – als Nachweis
--   member_emergency_contacts   Notfallkontakte
--   event_attendee_care()       was die Leitung einer Veranstaltung sieht
--
-- Hängt an der Gemeinnützigkeit (Modul „nonprofit").

insert into public.app_modules (key, label, description, kind, requires, sort_order, enabled) values
  ('consents', 'Einwilligungen',
   'Fotofreigaben und Notfallkontakte – mit Nachweis, wer wann zugestimmt hat.',
   'addon', 'nonprofit', 330, true)
on conflict (key) do nothing;

insert into public.permission_catalog (key, label, category, sort_order) values
  ('consents.manage', 'Einwilligungen verwalten und Notfallkontakte einsehen', 'Mitglieder', 7)
on conflict (key) do nothing;

insert into public.role_permissions (role, permission, granted)
select rc.key, 'consents.manage', true
from public.role_catalog rc
where rc.is_leadership
on conflict (role, permission) do nothing;

insert into public.profile_fields (block_key, type, label, module, sort_order, is_active) values
  ('einwilligungen', 'block', 'Einwilligungen und Notfallkontakt', 'consents', 70, true)
on conflict (block_key) do nothing;

-- ── Tabellen ────────────────────────────────────────────────────────────────

create table if not exists public.consent_types (
  id uuid primary key default gen_random_uuid(),
  -- Feste Kennung für Einwilligungen, an denen das Programm etwas festmacht
  -- („photos" bei Veranstaltungen). Selbst angelegte haben keine.
  key text unique,
  label text not null unique,
  text text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.consent_types (key, label, text, sort_order) values
  ('photos', 'Fotos und Videos',
   'Ich willige ein, dass Fotos und Videos, auf denen ich zu erkennen bin und die bei Veranstaltungen des Vereins entstehen, auf der Website und in den sozialen Medien des Vereins veröffentlicht werden. Die Einwilligung ist freiwillig und kann jederzeit mit Wirkung für die Zukunft widerrufen werden.',
   10),
  ('name', 'Name bei Veröffentlichungen',
   'Ich willige ein, dass mein Name zusammen mit solchen Fotos oder in Berichten über Veranstaltungen des Vereins genannt wird. Die Einwilligung ist freiwillig und kann jederzeit mit Wirkung für die Zukunft widerrufen werden.',
   20)
on conflict do nothing;

create table if not exists public.member_consents (
  user_id uuid not null references public.profiles(id) on delete cascade,
  type_id uuid not null references public.consent_types(id) on delete cascade,
  granted boolean not null,
  -- Bei Minderjährigen: wer für sie entschieden hat
  guardian_name text,
  decided_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id) on delete set null default auth.uid(),
  primary key (user_id, type_id)
);

create table if not exists public.member_consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type_id uuid not null references public.consent_types(id) on delete cascade,
  granted boolean not null,
  guardian_name text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz not null default now()
);

create index if not exists member_consent_log_user_idx on public.member_consent_log (user_id, decided_at desc);

create table if not exists public.member_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  relation text,
  created_at timestamptz not null default now()
);

create index if not exists member_emergency_contacts_user_idx on public.member_emergency_contacts (user_id);

-- ── Jede Entscheidung bleibt nachweisbar ────────────────────────────────────
--
-- Eine Einwilligung muss man belegen können, einen Widerruf auch. Deshalb
-- landet jede Änderung im Protokoll – mit Zeitpunkt und wer sie eingetragen
-- hat, etwa die Verwaltung nach einem Papierformular.

create or replace function public.member_consents_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE'
     and new.granted is not distinct from old.granted
     and new.guardian_name is not distinct from old.guardian_name then
    return new;
  end if;
  new.decided_at := now();
  new.decided_by := coalesce(auth.uid(), new.decided_by);
  return new;
end;
$$;

drop trigger if exists member_consents_guard on public.member_consents;
create trigger member_consents_guard
  before insert or update on public.member_consents
  for each row execute function public.member_consents_guard();

create or replace function public.member_consents_log()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT'
     or new.granted is distinct from old.granted
     or new.guardian_name is distinct from old.guardian_name then
    insert into public.member_consent_log (user_id, type_id, granted, guardian_name, decided_by, decided_at)
    values (new.user_id, new.type_id, new.granted, new.guardian_name, new.decided_by, new.decided_at);
  end if;
  return new;
end;
$$;

drop trigger if exists member_consents_log on public.member_consents;
create trigger member_consents_log
  after insert or update on public.member_consents
  for each row execute function public.member_consents_log();

-- ── Wer was sehen und ändern darf ───────────────────────────────────────────

alter table public.consent_types enable row level security;
alter table public.member_consents enable row level security;
alter table public.member_consent_log enable row level security;
alter table public.member_emergency_contacts enable row level security;

create policy "Members read consent types" on public.consent_types
  for select to authenticated using (public.is_member(auth.uid()));

create policy "Managers change consent types" on public.consent_types
  for all to authenticated
  using (public.has_permission(auth.uid(), 'consents.manage'))
  with check (public.has_permission(auth.uid(), 'consents.manage'));

create policy "Read own consents or as manager" on public.member_consents
  for select to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(), 'consents.manage'));

create policy "Decide own consents or as manager" on public.member_consents
  for insert to authenticated
  with check (public.is_member(auth.uid()) and (user_id = auth.uid() or public.has_permission(auth.uid(), 'consents.manage')));

create policy "Change own consents or as manager" on public.member_consents
  for update to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(), 'consents.manage'))
  with check (user_id = auth.uid() or public.has_permission(auth.uid(), 'consents.manage'));

-- Das Protokoll schreibt nur der Trigger; lesen darf man das eigene.
create policy "Read own consent log or as manager" on public.member_consent_log
  for select to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(), 'consents.manage'));

create policy "Read own emergency contacts or as manager" on public.member_emergency_contacts
  for select to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(), 'consents.manage'));

create policy "Change own emergency contacts or as manager" on public.member_emergency_contacts
  for all to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(), 'consents.manage'))
  with check (public.is_member(auth.uid()) and (user_id = auth.uid() or public.has_permission(auth.uid(), 'consents.manage')));

grant select on public.consent_types to authenticated;
grant insert, update, delete on public.consent_types to authenticated;
grant select, insert, update on public.member_consents to authenticated;
grant select on public.member_consent_log to authenticated;
grant select, insert, update, delete on public.member_emergency_contacts to authenticated;
grant all on public.consent_types, public.member_consents, public.member_consent_log, public.member_emergency_contacts to service_role;

-- ── Was die Leitung einer Veranstaltung sieht ───────────────────────────────
--
-- Für die, die zugesagt haben: ohne Fotofreigabe? minderjährig am Tag der
-- Veranstaltung? Notfallkontakte. Sehen darf das, wer die Veranstaltung
-- angelegt hat, wer alle Veranstaltungen bearbeitet oder wer Einwilligungen
-- verwaltet. Alle anderen bekommen eine leere Liste.

create or replace function public.event_attendee_care(_event_id uuid)
returns table (user_id uuid, display_name text, no_photo_consent boolean, is_minor boolean, contacts jsonb)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id,
         p.display_name,
         not exists (
           select 1 from public.member_consents mc
           join public.consent_types ct on ct.id = mc.type_id and ct.key = 'photos'
           where mc.user_id = p.id and mc.granted
         ),
         coalesce(
           p.birthdate > (
             (e.start_date at time zone coalesce((select s.calendar_timezone from public.app_settings s limit 1), 'Europe/Berlin'))::date
             - interval '18 years'
           )::date,
           false
         ),
         coalesce((
           select jsonb_agg(jsonb_build_object('name', c.name, 'phone', c.phone, 'relation', c.relation) order by c.created_at)
           from public.member_emergency_contacts c where c.user_id = p.id
         ), '[]'::jsonb)
  from public.events e
  join public.event_attendees a on a.event_id = e.id and a.status = 'attending'
  join public.profiles p on p.id = a.user_id
  where e.id = _event_id
    and public.module_enabled('consents')
    and (
      e.created_by = auth.uid()
      or public.has_permission(auth.uid(), 'events.moderate')
      or public.has_permission(auth.uid(), 'consents.manage')
    )
  order by p.display_name
$$;

-- ── Wer die Funktionen aufrufen darf ────────────────────────────────────────

revoke all on function public.member_consents_guard() from public, anon, authenticated;
revoke all on function public.member_consents_log() from public, anon, authenticated;
revoke all on function public.event_attendee_care(uuid) from public, anon;
grant execute on function public.event_attendee_care(uuid) to authenticated, service_role;
