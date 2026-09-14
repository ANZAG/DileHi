-- Nachweise mit Ablaufdatum – ein zuschaltbares Modul.
--
-- Erste Hilfe, Pulverschein, Befähigungsnachweis nach dem Sprengstoffgesetz,
-- Anhänger-Führerschein, Schaukampf-Einweisung. Ein Verein, der mit
-- Schwarzpulver oder vor Publikum mit Waffen arbeitet, muss am Tag der
-- Veranstaltung wissen, wer was darf – nicht an dem Tag, an dem jemand den
-- Schein einmal gezeigt hat.
--
-- Was hier entsteht:
--   certificate_types     die Arten, die ein Verein führt (legt die Verwaltung an)
--   member_certificates   der Nachweis eines Mitglieds, mit Ablaufdatum
--   certificate_reminders()        Erinnerungen, aufgerufen von der Abendzusammenfassung
--   event_attendee_certificates()  was die Leitung einer Veranstaltung sieht
--
-- Abgeschaltet ausgeliefert: Nicht jeder Verein braucht das.
-- Scans der Nachweise gibt es bewusst noch nicht – die Speicherregeln für
-- internal-files zeigen alles ausser „membership" jedem Mitglied.

-- ── Modul, Rechte, Profilbereich ────────────────────────────────────────────

insert into public.app_modules (key, label, description, kind, requires, sort_order, enabled) values
  ('certificates', 'Nachweise',
   'Qualifikationen mit Ablaufdatum – Erste Hilfe, Pulverschein, Führerschein – mit Erinnerung vor dem Ablauf.',
   'addon', null, 250, false)
on conflict (key) do nothing;

insert into public.permission_catalog (key, label, category, sort_order) values
  ('certificates.view', 'Nachweise aller Mitglieder einsehen', 'Mitglieder', 5),
  ('certificates.manage', 'Nachweise verwalten und prüfen', 'Mitglieder', 6)
on conflict (key) do nothing;

-- Voreingestellt für die Vereinsleitung. Weitere Rollen gibt die Verwaltung
-- unter Berechtigungen frei, etwa eine Epochenleitung.
insert into public.role_permissions (role, permission, granted)
select rc.key, p.permission, true
from public.role_catalog rc
cross join (values ('certificates.view'), ('certificates.manage')) as p(permission)
where rc.is_leadership
on conflict (role, permission) do nothing;

insert into public.profile_fields (block_key, type, label, module, sort_order, is_active) values
  ('nachweise', 'block', 'Meine Nachweise', 'certificates', 60, true)
on conflict (block_key) do nothing;

-- ── Tabellen ────────────────────────────────────────────────────────────────

create table if not exists public.certificate_types (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  -- null = ohne Ablaufdatum, etwa ein Führerschein
  validity_months integer check (validity_months is null or validity_months between 1 and 240),
  remind_days integer not null default 60 check (remind_days between 0 and 365),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint certificate_types_label_key unique (label)
);

create table if not exists public.member_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- restrict: Eine Art, an der Nachweise hängen, wird ausgeschaltet, nicht gelöscht.
  type_id uuid not null references public.certificate_types(id) on delete restrict,
  issued_on date,
  valid_until date,
  note text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  reminded_at timestamptz,
  expired_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_certificates_dates check (valid_until is null or issued_on is null or valid_until >= issued_on)
);

create index if not exists member_certificates_user_idx on public.member_certificates (user_id);
create index if not exists member_certificates_valid_until_idx on public.member_certificates (valid_until);

-- ── Prüfen und Erinnern bleiben ehrlich ─────────────────────────────────────
--
-- „Geprüft" setzt nur, wer Nachweise verwaltet – und immer mit dem eigenen
-- Namen. Ändert das Mitglied danach Art oder Datum, ist die Prüfung hinfällig.
-- Ein neues Ablaufdatum setzt die Erinnerungen zurück: Sie gelten dem neuen.

create or replace function public.member_certificates_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _verwalter boolean := public.has_permission(auth.uid(), 'certificates.manage');
begin
  new.updated_at := now();

  if tg_op = 'UPDATE' and new.valid_until is distinct from old.valid_until then
    new.reminded_at := null;
    new.expired_notified_at := null;
  end if;

  if _verwalter then
    if new.verified_at is null then
      new.verified_by := null;
    elsif tg_op = 'INSERT' or old.verified_at is null then
      new.verified_by := auth.uid();
    end if;
  elsif tg_op = 'INSERT' then
    new.verified_by := null;
    new.verified_at := null;
  elsif (new.type_id, new.issued_on, new.valid_until, new.user_id)
        is distinct from (old.type_id, old.issued_on, old.valid_until, old.user_id) then
    new.verified_by := null;
    new.verified_at := null;
  else
    new.verified_by := old.verified_by;
    new.verified_at := old.verified_at;
  end if;

  return new;
end;
$$;

drop trigger if exists member_certificates_guard on public.member_certificates;
create trigger member_certificates_guard
  before insert or update on public.member_certificates
  for each row execute function public.member_certificates_guard();

-- ── Wer was sehen und ändern darf ───────────────────────────────────────────

alter table public.certificate_types enable row level security;
alter table public.member_certificates enable row level security;

create policy "Members read certificate types" on public.certificate_types
  for select to authenticated
  using (public.is_member(auth.uid()));

create policy "Managers change certificate types" on public.certificate_types
  for all to authenticated
  using (public.has_permission(auth.uid(), 'certificates.manage'))
  with check (public.has_permission(auth.uid(), 'certificates.manage'));

-- Den eigenen Nachweis sieht und pflegt jedes Mitglied; alle anderen nur, wer
-- darf. Andere Mitglieder sehen nichts – ein Pulverschein ist keine
-- Vereinsinformation.
create policy "Read own certificates or with permission" on public.member_certificates
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_permission(auth.uid(), 'certificates.view')
    or public.has_permission(auth.uid(), 'certificates.manage')
  );

create policy "Add own certificates or as manager" on public.member_certificates
  for insert to authenticated
  with check (
    public.is_member(auth.uid())
    and (user_id = auth.uid() or public.has_permission(auth.uid(), 'certificates.manage'))
  );

create policy "Change own certificates or as manager" on public.member_certificates
  for update to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(), 'certificates.manage'))
  with check (user_id = auth.uid() or public.has_permission(auth.uid(), 'certificates.manage'));

create policy "Delete own certificates or as manager" on public.member_certificates
  for delete to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(), 'certificates.manage'));

grant select, insert, update, delete on public.certificate_types to authenticated;
grant select, insert, update, delete on public.member_certificates to authenticated;
grant all on public.certificate_types to service_role;
grant all on public.member_certificates to service_role;

-- ── Was die Leitung einer Veranstaltung sieht ───────────────────────────────
--
-- Die gültigen Nachweise derer, die zugesagt haben – gültig bis zum Ende der
-- Veranstaltung, in der Zeitzone des Vereins. Sehen darf das, wer die
-- Veranstaltung angelegt hat, wer alle Veranstaltungen bearbeitet oder wer
-- Nachweise einsehen darf. Alle anderen bekommen eine leere Liste.

create or replace function public.event_attendee_certificates(_event_id uuid)
returns table (user_id uuid, label text, valid_until date, verified boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select mc.user_id, ct.label, mc.valid_until, mc.verified_at is not null
  from public.events e
  join public.event_attendees a on a.event_id = e.id and a.status = 'attending'
  join public.member_certificates mc on mc.user_id = a.user_id
  join public.certificate_types ct on ct.id = mc.type_id and ct.is_active
  where e.id = _event_id
    and public.module_enabled('certificates')
    and (
      e.created_by = auth.uid()
      or public.has_permission(auth.uid(), 'events.moderate')
      or public.has_permission(auth.uid(), 'certificates.view')
      or public.has_permission(auth.uid(), 'certificates.manage')
    )
    and (
      mc.valid_until is null
      or mc.valid_until >= (
        coalesce(e.end_date, e.start_date)
          at time zone coalesce((select s.calendar_timezone from public.app_settings s limit 1), 'Europe/Berlin')
      )::date
    )
  order by ct.sort_order, ct.label
$$;

-- ── Erinnerungen ────────────────────────────────────────────────────────────
--
-- Aufgerufen von der Abendzusammenfassung, bevor sie die Mails baut – so
-- stehen die Erinnerungen in derselben Mail wie alles andere.
--
-- Zwei Anlässe, jeder genau einmal je Ablaufdatum:
--   vorher    sobald der Vorlauf der Art beginnt
--   danach    am ersten Abend nach dem Ablauf, aber nur bis 30 Tage danach –
--             wer alte Scheine nachträgt, soll keine Flut von Meldungen bekommen

create or replace function public.certificate_reminders()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _anzahl integer := 0;
  _zeilen integer;
begin
  if not public.module_enabled('certificates') then
    return 0;
  end if;

  with faellig as (
    update public.member_certificates mc
       set reminded_at = now()
      from public.certificate_types ct, public.profiles p
     where ct.id = mc.type_id
       and p.id = mc.user_id
       and ct.is_active
       and coalesce(p.is_active, true)
       and mc.valid_until is not null
       and mc.reminded_at is null
       and mc.valid_until >= current_date
       and mc.valid_until <= current_date + ct.remind_days
    returning mc.id, mc.user_id, ct.label, mc.valid_until
  )
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  select f.user_id,
         'certificate_expiring',
         f.label || ' läuft bald ab',
         'Gültig bis ' || to_char(f.valid_until, 'DD.MM.YYYY') || '. Denk daran, ihn rechtzeitig zu erneuern.',
         '/intern/profil',
         'member_certificate',
         f.id
    from faellig f;
  get diagnostics _zeilen = row_count;
  _anzahl := _anzahl + _zeilen;

  with abgelaufen as (
    update public.member_certificates mc
       set expired_notified_at = now()
      from public.certificate_types ct, public.profiles p
     where ct.id = mc.type_id
       and p.id = mc.user_id
       and ct.is_active
       and coalesce(p.is_active, true)
       and mc.valid_until is not null
       and mc.expired_notified_at is null
       and mc.valid_until < current_date
       and mc.valid_until >= current_date - 30
    returning mc.id, mc.user_id, ct.label, mc.valid_until
  )
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  select f.user_id,
         'certificate_expired',
         f.label || ' ist abgelaufen',
         'Er galt bis ' || to_char(f.valid_until, 'DD.MM.YYYY') || '. Trag den neuen Nachweis in deinem Profil ein.',
         '/intern/profil',
         'member_certificate',
         f.id
    from abgelaufen f;
  get diagnostics _zeilen = row_count;
  _anzahl := _anzahl + _zeilen;

  return _anzahl;
end;
$$;

-- ── Wer die Funktionen aufrufen darf ────────────────────────────────────────
--
-- Supabase gibt neuen Funktionen Ausführungsrechte an anon und authenticated
-- direkt, nicht nur über PUBLIC. Deshalb beides entziehen und dann gezielt
-- vergeben.

revoke all on function public.member_certificates_guard() from public, anon, authenticated;

revoke all on function public.event_attendee_certificates(uuid) from public, anon;
grant execute on function public.event_attendee_certificates(uuid) to authenticated, service_role;

revoke all on function public.certificate_reminders() from public, anon, authenticated;
grant execute on function public.certificate_reminders() to service_role;
