-- Auslagenerstattung und Pauschalen – ein Bereich für gemeinnützige Vereine.
--
-- Jemand kauft Lampenöl fürs Lager und will das Geld wieder. Bisher: Beleg in
-- die Tasche, irgendwann dem Kassenwart geben, und niemand weiss, was schon
-- erstattet ist. Hier: mit Foto des Belegs einreichen, die Kasse prüft und
-- erstattet, beide sehen jederzeit den Stand.
--
-- Dazu die Pauschalen: Ehrenamtspauschale (§ 3 Nr. 26a EStG) und
-- Übungsleiterfreibetrag (§ 3 Nr. 26 EStG) sind Freibeträge je Person und
-- Jahr. Wer sie überschreitet, muss den Rest versteuern – die Kasse soll das
-- sehen, bevor sie auszahlt.
--
-- Was hier entsteht:
--   Bucket „receipts"      privat, jedes Mitglied nur im eigenen Ordner
--   expense_claims         Auslagen mit Beleg und Stand
--   volunteer_payments     ausgezahlte Pauschalen
--   app_settings           die Freibeträge, anpassbar im Erscheinungsbild
--
-- Hängt an der Gemeinnützigkeit (Modul „nonprofit").

-- ── Modul, Recht, Freibeträge ───────────────────────────────────────────────

insert into public.app_modules (key, label, description, kind, requires, sort_order, enabled) values
  ('expense_claims', 'Auslagen',
   'Auslagen mit Beleg einreichen und erstatten; Übersicht zu Ehrenamts- und Übungsleiterpauschale.',
   'addon', 'nonprofit', 340, true)
on conflict (key) do nothing;

insert into public.permission_catalog (key, label, category, sort_order) values
  ('expenses.manage', 'Auslagen prüfen und erstatten, Pauschalen verwalten', 'Finanzen', 2)
on conflict (key) do nothing;

-- Für die Vereinsleitung und für jede Rolle, die schon die Beiträge verwaltet –
-- das ist in der Regel die Kasse.
insert into public.role_permissions (role, permission, granted)
select distinct r.role, 'expenses.manage', true
from (
  select rc.key as role from public.role_catalog rc where rc.is_leadership
  union
  select rp.role from public.role_permissions rp where rp.permission = 'contributions.manage' and rp.granted
) r
on conflict (role, permission) do nothing;

-- Stand 2026. Ändert der Gesetzgeber die Beträge, lassen sie sich im
-- Erscheinungsbild anpassen, ohne dass jemand den Code anfasst.
alter table public.app_settings
  add column if not exists volunteer_allowance numeric(10, 2) not null default 960,
  add column if not exists trainer_allowance numeric(10, 2) not null default 3300;

-- ── Belege: ein privater Speicher ───────────────────────────────────────────
--
-- Nicht in internal-files: Dort liest jedes Mitglied alles ausser „membership".
-- Pfad: <Mitglied>/<Zeitstempel>_<Dateiname>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('receipts', 'receipts', false, 10485760,
   '{image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf}'::text[])
on conflict (id) do nothing;

create policy "Receipts: read own or as expense manager" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_permission(auth.uid(), 'expenses.manage'))
  );

create policy "Receipts: upload into own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_member(auth.uid())
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Receipts: delete own or as expense manager" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_permission(auth.uid(), 'expenses.manage'))
  );

-- ── Tabellen ────────────────────────────────────────────────────────────────

create table if not exists public.expense_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null default 'material' check (category in ('travel', 'material', 'food', 'other')),
  amount numeric(10, 2) not null check (amount > 0),
  spent_on date not null,
  event_id uuid references public.events(id) on delete set null,
  note text,
  receipt_path text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected', 'paid')),
  decision_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_claims_user_idx on public.expense_claims (user_id);
create index if not exists expense_claims_status_idx on public.expense_claims (status);

create table if not exists public.volunteer_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- volunteer = Ehrenamtspauschale, trainer = Übungsleiterfreibetrag
  kind text not null check (kind in ('volunteer', 'trainer')),
  amount numeric(10, 2) not null check (amount > 0),
  paid_on date not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists volunteer_payments_user_idx on public.volunteer_payments (user_id, paid_on);

-- ── Wer den Stand einer Auslage ändert ──────────────────────────────────────
--
-- Mitglieder reichen für sich selbst ein und können eine Auslage ändern oder
-- zurückziehen, solange sie nicht geprüft ist. Genehmigen, Ablehnen und
-- Erstatten ist Sache der Kasse, und wer das tut, steht dabei.

create or replace function public.expense_claims_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _verwalter boolean := public.has_permission(auth.uid(), 'expenses.manage');
begin
  new.updated_at := now();

  -- Ohne Anmeldung laufen nur Einspielungen und Wartung.
  if auth.uid() is not null and not _verwalter then
    if tg_op = 'INSERT' then
      new.user_id := auth.uid();
      new.status := 'submitted';
      new.decision_note := null;
      new.decided_by := null;
      new.decided_at := null;
      new.paid_at := null;
    else
      if old.status <> 'submitted' then
        raise exception 'Eine geprüfte Auslage lässt sich nicht mehr ändern.';
      end if;
      if new.status is distinct from old.status then
        raise exception 'Prüfen und Erstatten übernimmt die Kasse.';
      end if;
      new.decision_note := old.decision_note;
      new.decided_by := old.decided_by;
      new.decided_at := old.decided_at;
      new.paid_at := old.paid_at;
    end if;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status in ('approved', 'rejected') then
      new.decided_at := now();
      new.decided_by := coalesce(auth.uid(), new.decided_by);
    elsif new.status = 'paid' then
      new.paid_at := now();
      if new.decided_at is null then
        new.decided_at := now();
        new.decided_by := coalesce(auth.uid(), new.decided_by);
      end if;
    elsif new.status = 'submitted' then
      new.decided_at := null;
      new.decided_by := null;
      new.paid_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists expense_claims_guard on public.expense_claims;
create trigger expense_claims_guard
  before insert or update on public.expense_claims
  for each row execute function public.expense_claims_guard();

-- Eingereicht: die Kasse erfährt es. Entschieden oder erstattet: das Mitglied.
create or replace function public.expense_claims_notify()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _name text;
  _betrag text := replace(to_char(new.amount, 'FM999999990.00'), '.', ',') || ' €';
begin
  if not public.module_enabled('expense_claims') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select coalesce(nullif(btrim(display_name), ''), 'Ein Mitglied') into _name
      from public.profiles where id = new.user_id;
    insert into public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
    select distinct ur.user_id, new.user_id, 'expense_submitted',
           coalesce(_name, 'Ein Mitglied') || ' hat eine Auslage eingereicht',
           new.title || ' · ' || _betrag,
           '/intern/auslagen', 'expense_claim', new.id
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id and coalesce(p.is_active, true)
     where public.has_permission(ur.user_id, 'expenses.manage')
       and ur.user_id <> new.user_id;
  elsif new.status is distinct from old.status and new.status in ('approved', 'rejected', 'paid') then
    insert into public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
    values (
      new.user_id, auth.uid(), 'expense_' || new.status,
      case new.status when 'approved' then 'Auslage genehmigt' when 'rejected' then 'Auslage abgelehnt' else 'Auslage erstattet' end,
      new.title || ' · ' || _betrag || coalesce(' – ' || new.decision_note, ''),
      '/intern/auslagen', 'expense_claim', new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists expense_claims_notify on public.expense_claims;
create trigger expense_claims_notify
  after insert or update on public.expense_claims
  for each row execute function public.expense_claims_notify();

-- ── Wer was sehen und ändern darf ───────────────────────────────────────────

alter table public.expense_claims enable row level security;
alter table public.volunteer_payments enable row level security;

create policy "Read own claims or as expense manager" on public.expense_claims
  for select to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(), 'expenses.manage'));

create policy "Submit own claims" on public.expense_claims
  for insert to authenticated
  with check (
    public.is_member(auth.uid())
    and (user_id = auth.uid() or public.has_permission(auth.uid(), 'expenses.manage'))
  );

create policy "Change own open claims or as expense manager" on public.expense_claims
  for update to authenticated
  using ((user_id = auth.uid() and status = 'submitted') or public.has_permission(auth.uid(), 'expenses.manage'))
  with check (user_id = auth.uid() or public.has_permission(auth.uid(), 'expenses.manage'));

create policy "Withdraw own open claims or as expense manager" on public.expense_claims
  for delete to authenticated
  using ((user_id = auth.uid() and status = 'submitted') or public.has_permission(auth.uid(), 'expenses.manage'));

create policy "Read own allowance payments or as expense manager" on public.volunteer_payments
  for select to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(), 'expenses.manage'));

create policy "Expense managers change allowance payments" on public.volunteer_payments
  for all to authenticated
  using (public.has_permission(auth.uid(), 'expenses.manage'))
  with check (public.has_permission(auth.uid(), 'expenses.manage'));

grant select, insert, update, delete on public.expense_claims to authenticated;
grant select, insert, update, delete on public.volunteer_payments to authenticated;
grant all on public.expense_claims, public.volunteer_payments to service_role;

-- ── Wer die Funktionen aufrufen darf ────────────────────────────────────────

revoke all on function public.expense_claims_guard() from public, anon, authenticated;
revoke all on function public.expense_claims_notify() from public, anon, authenticated;
