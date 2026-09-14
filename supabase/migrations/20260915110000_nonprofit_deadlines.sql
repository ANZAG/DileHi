-- Gemeinnützigkeit als Einstellung – und als erster Bereich dahinter: Fristen.
--
-- Ein gemeinnütziger Verein hat Pflichten, die ein loser Freundeskreis nicht
-- hat: die Steuererklärung für die Gemeinnützigkeit, einen Bescheid, der für
-- Zuwendungsbestätigungen nicht zu alt sein darf, die Einladungsfrist zur
-- Mitgliederversammlung, die Eintragung eines neuen Vorstands. Was davon DING
-- anbietet, soll nur sehen, wer es braucht.
--
-- Deshalb:
--   app_settings.is_nonprofit   wird im Erscheinungsbild abgefragt
--   Modul „nonprofit"           folgt dieser Einstellung (Trigger) und steht
--                               nicht in der Modulliste
--   alle Bereiche dafür         hängen per `requires` an „nonprofit" – ohne
--                               die Einstellung sind sie überall unsichtbar
--
-- Die Angaben zum Bescheid des Finanzamts braucht später auch die
-- Zuwendungsbestätigung; sie stehen deshalb schon hier.

-- ── Angaben zur Gemeinnützigkeit ────────────────────────────────────────────

alter table public.app_settings
  add column if not exists is_nonprofit boolean not null default false,
  add column if not exists tax_office text,
  add column if not exists tax_number text,
  -- exemption      = Freistellungsbescheid bzw. Anlage zum Körperschaftsteuerbescheid
  -- assessment_60a = Feststellung der satzungsmässigen Voraussetzungen nach § 60a AO
  add column if not exists exemption_notice_kind text
    check (exemption_notice_kind is null or exemption_notice_kind in ('exemption', 'assessment_60a')),
  add column if not exists exemption_notice_date date,
  add column if not exists tax_purposes text,
  -- Mitgliedsbeiträge an Vereine, die etwa Heimatpflege oder kulturelle
  -- Betätigungen der Freizeitgestaltung fördern, sind nicht abziehbar
  -- (§ 10b Abs. 1 Satz 8 EStG). Deshalb eine Einstellung und keine Annahme.
  add column if not exists fees_deductible boolean not null default false;

-- ── Das Modul, das der Einstellung folgt ────────────────────────────────────

insert into public.app_modules (key, label, description, kind, requires, sort_order, enabled) values
  ('nonprofit', 'Gemeinnütziger Verein',
   'Wird unter Erscheinungsbild eingestellt. Schaltet die Bereiche für gemeinnützige Vereine frei.',
   'core', null, 300, false)
on conflict (key) do nothing;

create or replace function public.app_settings_sync_nonprofit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' or new.is_nonprofit is distinct from old.is_nonprofit then
    update public.app_modules set enabled = new.is_nonprofit where key = 'nonprofit';
  end if;
  return new;
end;
$$;

drop trigger if exists app_settings_sync_nonprofit on public.app_settings;
create trigger app_settings_sync_nonprofit
  after insert or update on public.app_settings
  for each row execute function public.app_settings_sync_nonprofit();

update public.app_modules
   set enabled = coalesce((select bool_or(s.is_nonprofit) from public.app_settings s), false)
 where key = 'nonprofit';

-- ── Fristen ─────────────────────────────────────────────────────────────────

insert into public.app_modules (key, label, description, kind, requires, sort_order, enabled) values
  ('club_deadlines', 'Fristen',
   'Steuererklärung, Bescheid, Mitgliederversammlung, Vereinsregister, Versicherung – mit Erinnerung an die Zuständigen.',
   'addon', 'nonprofit', 310, true)
on conflict (key) do nothing;

insert into public.permission_catalog (key, label, category, sort_order) values
  ('deadlines.manage', 'Fristen verwalten', 'Verein', 4)
on conflict (key) do nothing;

insert into public.role_permissions (role, permission, granted)
select rc.key, 'deadlines.manage', true
from public.role_catalog rc
where rc.is_leadership
on conflict (role, permission) do nothing;

create table if not exists public.club_deadlines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'other'
    check (category in ('tax', 'register', 'assembly', 'insurance', 'other')),
  due_date date not null,
  -- null = einmalig; sonst kommt die nächste Frist beim Erledigen von selbst
  repeat_months integer check (repeat_months is null or repeat_months between 1 and 120),
  remind_days integer not null default 30 check (remind_days between 0 and 365),
  -- null = alle, die Fristen verwalten
  responsible_role text references public.role_catalog(key) on update cascade on delete set null,
  note text,
  done_at timestamptz,
  done_by uuid references public.profiles(id) on delete set null,
  reminded_at timestamptz,
  overdue_notified_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_deadlines_open_idx on public.club_deadlines (due_date) where done_at is null;

-- Erledigt: wer und wann – und bei wiederkehrenden Fristen gleich die nächste.
-- Wird die Frist verschoben, gelten die Erinnerungen dem neuen Datum.
create or replace function public.club_deadlines_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.due_date is distinct from old.due_date then
    new.reminded_at := null;
    new.overdue_notified_at := null;
  end if;
  if new.done_at is not null and (tg_op = 'INSERT' or old.done_at is null) then
    new.done_by := coalesce(auth.uid(), new.done_by);
  elsif new.done_at is null then
    new.done_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists club_deadlines_guard on public.club_deadlines;
create trigger club_deadlines_guard
  before insert or update on public.club_deadlines
  for each row execute function public.club_deadlines_guard();

create or replace function public.club_deadlines_next()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.done_at is not null and old.done_at is null and new.repeat_months is not null then
    insert into public.club_deadlines (title, category, due_date, repeat_months, remind_days, responsible_role, note, created_by)
    values (new.title, new.category, (new.due_date + make_interval(months => new.repeat_months))::date,
            new.repeat_months, new.remind_days, new.responsible_role, new.note, new.created_by);
  end if;
  return new;
end;
$$;

drop trigger if exists club_deadlines_next on public.club_deadlines;
create trigger club_deadlines_next
  after update on public.club_deadlines
  for each row execute function public.club_deadlines_next();

alter table public.club_deadlines enable row level security;

-- Fristen sind Sache des Vorstands, nicht des ganzen Vereins.
create policy "Deadline managers read deadlines" on public.club_deadlines
  for select to authenticated
  using (public.has_permission(auth.uid(), 'deadlines.manage'));

create policy "Deadline managers change deadlines" on public.club_deadlines
  for all to authenticated
  using (public.has_permission(auth.uid(), 'deadlines.manage'))
  with check (public.has_permission(auth.uid(), 'deadlines.manage'));

grant select, insert, update, delete on public.club_deadlines to authenticated;
grant all on public.club_deadlines to service_role;

-- ── Erinnerungen ────────────────────────────────────────────────────────────
--
-- An die zuständige Rolle, sonst an alle, die Fristen verwalten. Einmal, wenn
-- der Vorlauf beginnt, und einmal, wenn die Frist verstrichen ist.

create or replace function public.club_deadline_reminders()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _anzahl integer := 0;
  _zeilen integer;
begin
  if not public.module_enabled('club_deadlines') then
    return 0;
  end if;

  with faellig as (
    update public.club_deadlines d
       set reminded_at = now()
     where d.done_at is null
       and d.reminded_at is null
       and d.due_date >= current_date
       and d.due_date <= current_date + d.remind_days
    returning d.id, d.title, d.due_date, d.responsible_role
  )
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  select distinct ur.user_id,
         'deadline_due',
         'Frist: ' || f.title,
         'Fällig am ' || to_char(f.due_date, 'DD.MM.YYYY') || '.',
         '/intern/verwaltung?reiter=fristen',
         'club_deadline',
         f.id
    from faellig f
    join public.user_roles ur
      on (f.responsible_role is not null and ur.role = f.responsible_role)
      or (f.responsible_role is null and public.has_permission(ur.user_id, 'deadlines.manage'))
    join public.profiles p on p.id = ur.user_id and coalesce(p.is_active, true);
  get diagnostics _zeilen = row_count;
  _anzahl := _anzahl + _zeilen;

  with verstrichen as (
    update public.club_deadlines d
       set overdue_notified_at = now()
     where d.done_at is null
       and d.overdue_notified_at is null
       and d.due_date < current_date
       and d.due_date >= current_date - 60
    returning d.id, d.title, d.due_date, d.responsible_role
  )
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  select distinct ur.user_id,
         'deadline_overdue',
         'Frist verstrichen: ' || v.title,
         'Sie war am ' || to_char(v.due_date, 'DD.MM.YYYY') || ' fällig und ist noch nicht als erledigt markiert.',
         '/intern/verwaltung?reiter=fristen',
         'club_deadline',
         v.id
    from verstrichen v
    join public.user_roles ur
      on (v.responsible_role is not null and ur.role = v.responsible_role)
      or (v.responsible_role is null and public.has_permission(ur.user_id, 'deadlines.manage'))
    join public.profiles p on p.id = ur.user_id and coalesce(p.is_active, true);
  get diagnostics _zeilen = row_count;
  _anzahl := _anzahl + _zeilen;

  return _anzahl;
end;
$$;

-- ── Wer die Funktionen aufrufen darf ────────────────────────────────────────

revoke all on function public.app_settings_sync_nonprofit() from public, anon, authenticated;
revoke all on function public.club_deadlines_guard() from public, anon, authenticated;
revoke all on function public.club_deadlines_next() from public, anon, authenticated;
revoke all on function public.club_deadline_reminders() from public, anon, authenticated;
grant execute on function public.club_deadline_reminders() to service_role;
