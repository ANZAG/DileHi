-- Inventar und Ausleihe – ein zuschaltbares Modul.
--
-- Zelte, Lagerausstattung, Leihgewandung, Waffen: Was der Verein besitzt, wo
-- es liegt, in welchem Zustand es ist und wer es gerade hat. Vor einer
-- Veranstaltung reserviert, am Aufbautag ausgegeben, danach zurück.
--
-- Was hier entsteht:
--   inventory_items     die Gegenstände, mit Anzahl, Lagerort und Zustand
--   inventory_loans     Reservierungen und Ausleihen, für einen Zeitraum oder
--                       eine Veranstaltung
--   inventory_available()  wie viele Stück in einem Zeitraum frei sind
--   inventory_reminders()  Erinnerung an überfällige Rückgaben, aufgerufen von
--                          der Abendzusammenfassung
--
-- Abgeschaltet ausgeliefert. Die Werte in der Datenbank sind englisch, die
-- Beschriftungen stehen im Programm.

-- ── Modul und Recht ─────────────────────────────────────────────────────────

insert into public.app_modules (key, label, description, kind, requires, sort_order, enabled) values
  ('inventory', 'Inventar',
   'Was der Verein besitzt – Zelte, Lagerausstattung, Leihgewandung, Waffen – mit Lagerort, Zustand und Ausleihe.',
   'addon', null, 260, false)
on conflict (key) do nothing;

insert into public.permission_catalog (key, label, category, sort_order) values
  ('inventory.manage', 'Inventar verwalten und ausgeben', 'Verein', 3)
on conflict (key) do nothing;

insert into public.role_permissions (role, permission, granted)
select rc.key, 'inventory.manage', true
from public.role_catalog rc
where rc.is_leadership
on conflict (role, permission) do nothing;

-- ── Tabellen ────────────────────────────────────────────────────────────────

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Sonstiges',
  description text,
  quantity integer not null default 1 check (quantity >= 0),
  location text,
  condition text not null default 'good' check (condition in ('good', 'worn', 'repair', 'retired')),
  -- Leihgabe eines Mitglieds. null = gehört dem Verein.
  owner_id uuid references public.profiles(id) on delete set null,
  note text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_loans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  -- wer den Gegenstand bekommt
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  quantity integer not null default 1 check (quantity >= 1),
  from_date date not null,
  until_date date not null,
  status text not null default 'reserved' check (status in ('reserved', 'handed_out', 'returned')),
  note text,
  handed_out_at timestamptz,
  returned_at timestamptz,
  overdue_notified_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_loans_dates check (until_date >= from_date)
);

create index if not exists inventory_loans_item_idx on public.inventory_loans (item_id);
create index if not exists inventory_loans_user_idx on public.inventory_loans (user_id);
create index if not exists inventory_loans_event_idx on public.inventory_loans (event_id);

-- ── Wie viel frei ist ───────────────────────────────────────────────────────
--
-- Belegt ist, was reserviert oder ausgegeben ist und sich mit dem Zeitraum
-- überschneidet. Ausgegeben und nicht zurück zählt auch über das vereinbarte
-- Rückgabedatum hinaus: Das Zelt steht dann eben noch nicht wieder im Lager.

create or replace function public.inventory_available(_item_id uuid, _from date, _until date, _except uuid default null)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select greatest(0, i.quantity - coalesce((
    select sum(l.quantity)
    from public.inventory_loans l
    where l.item_id = i.id
      and l.status in ('reserved', 'handed_out')
      and l.from_date <= _until
      and (l.until_date >= _from or l.status = 'handed_out')
      and (_except is null or l.id <> _except)
  ), 0))::integer
  from public.inventory_items i
  where i.id = _item_id
$$;

-- ── Ausleihen bleiben ehrlich ───────────────────────────────────────────────
--
-- Mitglieder reservieren für sich selbst. Ausgeben und Zurücknehmen übernimmt,
-- wer das Inventar verwaltet – sonst stimmt „wer hat es gerade" nicht mehr.
-- Mehr als vorhanden lässt sich nicht verplanen, und Ausgesondertes gar nicht.

create or replace function public.inventory_loans_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _verwalter boolean := public.has_permission(auth.uid(), 'inventory.manage');
  _item public.inventory_items%rowtype;
  _frei integer;
begin
  new.updated_at := now();

  -- Ohne Anmeldung laufen nur die Abendzusammenfassung und Einspielungen.
  if auth.uid() is not null and not _verwalter then
    if tg_op = 'INSERT' then
      new.status := 'reserved';
      new.user_id := auth.uid();
    elsif new.status is distinct from old.status then
      raise exception 'Ausgeben und Zurücknehmen übernimmt die Inventarverwaltung.';
    end if;
  end if;

  if new.status = 'handed_out' and (tg_op = 'INSERT' or old.status <> 'handed_out') then
    new.handed_out_at := now();
  end if;
  if new.status = 'returned' and (tg_op = 'INSERT' or old.status <> 'returned') then
    new.returned_at := now();
  end if;
  if tg_op = 'UPDATE' and new.until_date is distinct from old.until_date then
    new.overdue_notified_at := null;
  end if;

  -- Nur prüfen, wenn sich an der Belegung etwas ändert. Sonst scheiterte etwa
  -- die Erinnerung, weil jemand die Anzahl eines Gegenstands verringert hat.
  if new.status in ('reserved', 'handed_out')
     and (tg_op = 'INSERT'
          or (new.item_id, new.quantity, new.from_date, new.until_date, new.status)
             is distinct from (old.item_id, old.quantity, old.from_date, old.until_date, old.status)) then
    select * into _item from public.inventory_items where id = new.item_id;
    if _item.condition = 'retired' then
      raise exception '„%“ ist ausgesondert und kann nicht ausgeliehen werden.', _item.name;
    end if;
    _frei := public.inventory_available(new.item_id, new.from_date, new.until_date,
                                        case when tg_op = 'UPDATE' then new.id else null end);
    if new.quantity > _frei then
      raise exception 'Von „%“ sind in diesem Zeitraum nur % Stück frei.', _item.name, _frei;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_loans_guard on public.inventory_loans;
create trigger inventory_loans_guard
  before insert or update on public.inventory_loans
  for each row execute function public.inventory_loans_guard();

create or replace function public.inventory_items_touch()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists inventory_items_touch on public.inventory_items;
create trigger inventory_items_touch
  before update on public.inventory_items
  for each row execute function public.inventory_items_touch();

-- ── Wer was sehen und ändern darf ───────────────────────────────────────────
--
-- Das Inventar gehört dem Verein, also sieht jedes Mitglied, was es gibt und
-- wer was hat – genau diese Frage soll die Seite beantworten.

alter table public.inventory_items enable row level security;
alter table public.inventory_loans enable row level security;

create policy "Members read inventory" on public.inventory_items
  for select to authenticated
  using (public.is_member(auth.uid()));

create policy "Managers change inventory" on public.inventory_items
  for all to authenticated
  using (public.has_permission(auth.uid(), 'inventory.manage'))
  with check (public.has_permission(auth.uid(), 'inventory.manage'));

create policy "Members read loans" on public.inventory_loans
  for select to authenticated
  using (public.is_member(auth.uid()));

create policy "Members reserve for themselves" on public.inventory_loans
  for insert to authenticated
  with check (
    public.is_member(auth.uid())
    and (user_id = auth.uid() or public.has_permission(auth.uid(), 'inventory.manage'))
  );

create policy "Change own reservations or as manager" on public.inventory_loans
  for update to authenticated
  using ((user_id = auth.uid() and status = 'reserved') or public.has_permission(auth.uid(), 'inventory.manage'))
  with check (user_id = auth.uid() or public.has_permission(auth.uid(), 'inventory.manage'));

create policy "Cancel own reservations or as manager" on public.inventory_loans
  for delete to authenticated
  using ((user_id = auth.uid() and status = 'reserved') or public.has_permission(auth.uid(), 'inventory.manage'));

grant select, insert, update, delete on public.inventory_items to authenticated;
grant select, insert, update, delete on public.inventory_loans to authenticated;
grant all on public.inventory_items to service_role;
grant all on public.inventory_loans to service_role;

-- ── Erinnerung an überfällige Rückgaben ─────────────────────────────────────
--
-- Einmal je vereinbartem Rückgabedatum, an die Person, die es hat. Wird das
-- Datum verlängert, gilt die Erinnerung dem neuen.

create or replace function public.inventory_reminders()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _anzahl integer;
begin
  if not public.module_enabled('inventory') then
    return 0;
  end if;

  with ueberfaellig as (
    update public.inventory_loans l
       set overdue_notified_at = now()
      from public.inventory_items i
     where i.id = l.item_id
       and l.status = 'handed_out'
       and l.until_date < current_date
       and l.overdue_notified_at is null
    returning l.id, l.user_id, i.name, l.until_date
  )
  insert into public.notifications (user_id, type, title, body, link, entity_type, entity_id)
  select u.user_id,
         'inventory_overdue',
         u.name || ' ist überfällig',
         'Die Rückgabe war bis ' || to_char(u.until_date, 'DD.MM.YYYY')
           || ' vereinbart. Bitte bring es zurück oder sprich dich mit der Inventarverwaltung ab.',
         '/intern/inventar',
         'inventory_loan',
         u.id
    from ueberfaellig u;
  get diagnostics _anzahl = row_count;
  return _anzahl;
end;
$$;

-- ── Wer die Funktionen aufrufen darf ────────────────────────────────────────

revoke all on function public.inventory_available(uuid, date, date, uuid) from public, anon;
grant execute on function public.inventory_available(uuid, date, date, uuid) to authenticated, service_role;

revoke all on function public.inventory_loans_guard() from public, anon, authenticated;
revoke all on function public.inventory_items_touch() from public, anon, authenticated;

revoke all on function public.inventory_reminders() from public, anon, authenticated;
grant execute on function public.inventory_reminders() to service_role;
