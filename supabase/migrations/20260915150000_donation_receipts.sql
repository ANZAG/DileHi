-- Zuwendungsbestätigungen nach amtlichem Muster.
--
-- Wer spendet, will die Spende von der Steuer absetzen und braucht dafür eine
-- Bestätigung. Bisher schreibt die Kasse sie in Word, mit dem Bescheid vom
-- letzten Mal, und niemand weiss, ob für dieselbe Spende schon eine
-- ausgestellt wurde.
--
-- Was hier entsteht:
--   donations            eingegangene Spenden und – nur wo erlaubt –
--                        Mitgliedsbeiträge
--   donation_receipts    ausgestellte Bestätigungen, mit fortlaufender Nummer
--                        und allen Angaben zum Zeitpunkt der Ausstellung
--                        (das Doppel, das der Verein aufbewahren muss)
--   issue_donation_receipt   stellt aus – einzeln oder als Sammelbestätigung
--   cancel_donation_receipt  nimmt eine Bestätigung zurück
--   import_paid_contributions übernimmt bezahlte Beiträge eines Jahres
--
-- Die Datenbank prüft, was schiefgehen kann:
--   * Der Bescheid darf nicht zu alt sein: Freistellungsbescheid 5 Jahre,
--     Feststellung nach § 60a AO 3 Jahre (§ 63 Abs. 5 AO). Sonst erkennt das
--     Finanzamt die Bestätigung nicht an, und der Verein haftet.
--   * Mitgliedsbeiträge nur, wenn sie abziehbar sind (§ 10b Abs. 1 Satz 8
--     EStG) – bei vielen Brauchtums- und Heimatvereinen sind sie es nicht.
--   * Für eine Zuwendung gibt es höchstens eine Bestätigung, und bestätigte
--     Zuwendungen lassen sich nicht mehr ändern.
--
-- Hängt an der Gemeinnützigkeit (Modul „nonprofit").

-- ── Modul, Recht, Angabe zum Bescheid ───────────────────────────────────────

insert into public.app_modules (key, label, description, kind, requires, sort_order, enabled) values
  ('donation_receipts', 'Zuwendungsbestätigungen',
   'Spenden erfassen und Zuwendungsbestätigungen nach amtlichem Muster ausstellen, einzeln oder gesammelt.',
   'addon', 'nonprofit', 350, true)
on conflict (key) do nothing;

insert into public.permission_catalog (key, label, category, sort_order) values
  ('donations.manage', 'Spenden erfassen und Zuwendungsbestätigungen ausstellen', 'Finanzen', 3)
on conflict (key) do nothing;

insert into public.role_permissions (role, permission, granted)
select distinct r.role, 'donations.manage', true
from (
  select rc.key as role from public.role_catalog rc where rc.is_leadership
  union
  select rp.role from public.role_permissions rp where rp.permission = 'contributions.manage' and rp.granted
) r
on conflict (role, permission) do nothing;

-- Der Freistellungsbescheid gilt „für den letzten Veranlagungszeitraum" –
-- das amtliche Muster verlangt ihn. Freitext, weil Bescheide oft mehrere
-- Jahre umfassen („2021 bis 2023").
alter table public.app_settings
  add column if not exists exemption_notice_period text;

-- ── Tabellen ────────────────────────────────────────────────────────────────

create table if not exists public.donation_receipts (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  donor_user_id uuid references public.profiles(id) on delete set null,
  donor_name text not null,
  donor_address text not null,
  kind text not null check (kind in ('single', 'collective')),
  issued_on date not null,
  total numeric(12, 2) not null,
  -- Alles, was auf der Bestätigung steht, so wie es beim Ausstellen war.
  -- Ein neuer Bescheid oder eine neue Anschrift ändern keine alte Bestätigung.
  snapshot jsonb not null,
  issued_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now()
);

create index if not exists donation_receipts_donor_idx on public.donation_receipts (donor_user_id);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  -- Ein Mitglied oder jemand von aussen: dann Name und Anschrift von Hand.
  donor_user_id uuid references public.profiles(id) on delete set null,
  donor_name text,
  donor_address text,
  kind text not null default 'money' check (kind in ('money', 'membership_fee')),
  amount numeric(10, 2) not null check (amount > 0),
  received_on date not null,
  -- Verzicht auf Erstattung von Aufwendungen („Aufwandsspende").
  waiver boolean not null default false,
  contribution_id uuid unique references public.contributions(id) on delete set null,
  note text,
  receipt_id uuid references public.donation_receipts(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donations_donor_known check (donor_user_id is not null or nullif(btrim(donor_name), '') is not null)
);

create index if not exists donations_donor_idx on public.donations (donor_user_id);
create index if not exists donations_receipt_idx on public.donations (receipt_id);

-- ── Bestätigte Zuwendungen bleiben, wie sie sind ────────────────────────────

create or replace function public.donations_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    if old.receipt_id is not null then
      raise exception 'Für diese Zuwendung gibt es schon eine Bestätigung. Erst die Bestätigung zurücknehmen.';
    end if;
    return old;
  end if;

  new.updated_at := now();
  if old.receipt_id is not null and (
       new.amount is distinct from old.amount
    or new.received_on is distinct from old.received_on
    or new.kind is distinct from old.kind
    or new.waiver is distinct from old.waiver
    or new.donor_user_id is distinct from old.donor_user_id
    or new.donor_name is distinct from old.donor_name
    or new.donor_address is distinct from old.donor_address
  ) then
    raise exception 'Für diese Zuwendung gibt es schon eine Bestätigung. Erst die Bestätigung zurücknehmen.';
  end if;
  -- Die Verknüpfung setzen und lösen nur die beiden Funktionen unten.
  if new.receipt_id is distinct from old.receipt_id
     and coalesce(current_setting('ding.donation_receipt', true), '') <> 'on' then
    raise exception 'Bestätigungen entstehen nur über „Bestätigung ausstellen".';
  end if;
  return new;
end;
$$;

drop trigger if exists donations_guard on public.donations;
create trigger donations_guard
  before update or delete on public.donations
  for each row execute function public.donations_guard();

create or replace function public.donations_insert_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.receipt_id is not null then
    raise exception 'Bestätigungen entstehen nur über „Bestätigung ausstellen".';
  end if;
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

drop trigger if exists donations_insert_guard on public.donations;
create trigger donations_insert_guard
  before insert on public.donations
  for each row execute function public.donations_insert_guard();

-- ── Ausstellen ──────────────────────────────────────────────────────────────

create or replace function public.issue_donation_receipt(_donation_ids uuid[], _issued_on date default current_date)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  s public.app_settings%rowtype;
  _anzahl integer;
  _gefunden integer;
  _spender integer;
  _jahre integer;
  _erste public.donations%rowtype;
  _name text;
  _anschrift text;
  _gueltig_bis date;
  _jahr integer := extract(year from _issued_on)::integer;
  _naechste integer;
  _nummer text;
  _summe numeric(12, 2);
  _positionen jsonb;
  _id uuid;
  _p public.profiles%rowtype;
begin
  if not public.has_permission(auth.uid(), 'donations.manage') then
    raise exception 'Zuwendungsbestätigungen stellt aus, wer Spenden verwaltet.';
  end if;
  if not public.module_enabled('donation_receipts') then
    raise exception 'Zuwendungsbestätigungen sind nicht eingeschaltet.';
  end if;

  _anzahl := coalesce(array_length(_donation_ids, 1), 0);
  if _anzahl = 0 then
    raise exception 'Keine Zuwendung ausgewählt.';
  end if;

  select * into s from public.app_settings limit 1;
  if nullif(btrim(s.tax_office), '') is null or nullif(btrim(s.tax_number), '') is null
     or nullif(btrim(s.tax_purposes), '') is null or s.exemption_notice_date is null then
    raise exception 'Es fehlen Angaben zum Bescheid: Finanzamt, Steuernummer, Datum und Zwecke stehen im Erscheinungsbild unter Gemeinnützigkeit.';
  end if;
  if coalesce(s.exemption_notice_kind, 'exemption') = 'exemption' and nullif(btrim(s.exemption_notice_period), '') is null then
    raise exception 'Es fehlt der Veranlagungszeitraum des Freistellungsbescheids (Erscheinungsbild, Gemeinnützigkeit).';
  end if;

  _gueltig_bis := (s.exemption_notice_date
    + case when s.exemption_notice_kind = 'assessment_60a' then interval '3 years' else interval '5 years' end)::date;
  if _issued_on > _gueltig_bis then
    raise exception 'Der Bescheid vom % ist zu alt: Bestätigungen dürfen nur bis % ausgestellt werden (§ 63 Abs. 5 AO).',
      to_char(s.exemption_notice_date, 'DD.MM.YYYY'), to_char(_gueltig_bis, 'DD.MM.YYYY');
  end if;
  if _issued_on > current_date then
    raise exception 'Eine Bestätigung lässt sich nicht im Voraus ausstellen.';
  end if;

  -- Sperren, damit niemand dieselbe Spende gleichzeitig ein zweites Mal bestätigt.
  perform 1 from public.donations where id = any(_donation_ids) for update;

  select count(*) into _gefunden from public.donations where id = any(_donation_ids);
  if _gefunden <> (select count(distinct x) from unnest(_donation_ids) x) then
    raise exception 'Nicht alle ausgewählten Zuwendungen wurden gefunden.';
  end if;
  if exists (select 1 from public.donations where id = any(_donation_ids) and receipt_id is not null) then
    raise exception 'Für mindestens eine Zuwendung gibt es schon eine Bestätigung.';
  end if;
  if not s.fees_deductible and exists (select 1 from public.donations where id = any(_donation_ids) and kind = 'membership_fee') then
    raise exception 'Mitgliedsbeiträge sind bei diesem Verein nicht abziehbar (§ 10b Abs. 1 Satz 8 EStG) – dafür gibt es keine Bestätigung.';
  end if;
  if exists (select 1 from public.donations where id = any(_donation_ids) and received_on > _issued_on) then
    raise exception 'Eine Zuwendung liegt nach dem Datum der Bestätigung.';
  end if;

  select count(distinct coalesce(donor_user_id::text, lower(btrim(donor_name)) || '|' || lower(btrim(coalesce(donor_address, '')))))
    into _spender from public.donations where id = any(_donation_ids);
  if _spender <> 1 then
    raise exception 'Eine Bestätigung gilt für genau eine Person. Die Auswahl enthält mehrere.';
  end if;
  select count(distinct extract(year from received_on)) into _jahre from public.donations where id = any(_donation_ids);
  if _jahre <> 1 then
    raise exception 'Eine Sammelbestätigung umfasst ein Kalenderjahr. Die Auswahl reicht über mehrere.';
  end if;

  select * into _erste from public.donations where id = any(_donation_ids) order by received_on, created_at limit 1;
  _name := nullif(btrim(_erste.donor_name), '');
  _anschrift := nullif(btrim(_erste.donor_address), '');
  if _erste.donor_user_id is not null then
    select * into _p from public.profiles where id = _erste.donor_user_id;
    _name := coalesce(_name, nullif(btrim(concat_ws(' ', _p.first_name, _p.last_name)), ''), nullif(btrim(_p.display_name), ''));
    if _anschrift is null and nullif(btrim(_p.street), '') is not null and nullif(btrim(_p.city), '') is not null then
      _anschrift := btrim(_p.street) || E'\n' || btrim(concat_ws(' ', _p.zip, _p.city));
    end if;
  end if;
  if _name is null then
    raise exception 'Der Name der spendenden Person fehlt.';
  end if;
  if _anschrift is null then
    raise exception 'Die Anschrift von % fehlt. Sie gehört ins Profil oder direkt an die Zuwendung.', _name;
  end if;

  select sum(amount),
         jsonb_agg(jsonb_build_object('received_on', received_on, 'kind', kind, 'waiver', waiver, 'amount', amount)
                   order by received_on, created_at)
    into _summe, _positionen
    from public.donations where id = any(_donation_ids);

  perform pg_advisory_xact_lock(hashtext('donation_receipts_number'), _jahr);
  select coalesce(max(nullif(split_part(r.number, '-', 2), '')::integer), 0) + 1
    into _naechste
    from public.donation_receipts r
   where split_part(r.number, '-', 1) = _jahr::text
     and split_part(r.number, '-', 2) ~ '^[0-9]+$';
  _nummer := _jahr || '-' || lpad(_naechste::text, 3, '0');

  insert into public.donation_receipts (number, donor_user_id, donor_name, donor_address, kind, issued_on, total, snapshot, issued_by)
  values (
    _nummer, _erste.donor_user_id, _name, _anschrift,
    case when _anzahl = 1 then 'single' else 'collective' end,
    _issued_on, _summe,
    jsonb_build_object(
      'org_name', s.org_name,
      'org_street', s.org_street,
      'org_zip', s.org_zip,
      'org_city', s.org_city,
      'tax_office', s.tax_office,
      'tax_number', s.tax_number,
      'notice_kind', coalesce(s.exemption_notice_kind, 'exemption'),
      'notice_date', s.exemption_notice_date,
      'notice_period', s.exemption_notice_period,
      'purposes', s.tax_purposes,
      'fees_deductible', s.fees_deductible,
      'items', _positionen
    ),
    auth.uid()
  )
  returning id into _id;

  perform set_config('ding.donation_receipt', 'on', true);
  update public.donations set receipt_id = _id where id = any(_donation_ids);
  perform set_config('ding.donation_receipt', '', true);

  if _erste.donor_user_id is not null and _erste.donor_user_id is distinct from auth.uid() then
    insert into public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
    values (_erste.donor_user_id, auth.uid(), 'donation_receipt', 'Deine Zuwendungsbestätigung ist da',
            'Nr. ' || _nummer || ' – zum Ausdrucken unter Zuwendungen.', '/intern/zuwendungen', 'donation_receipt', _id);
  end if;

  return _id;
end;
$$;

-- ── Zurücknehmen ────────────────────────────────────────────────────────────
--
-- Eine falsche Bestätigung wird nicht gelöscht – sie bleibt als Doppel mit
-- Grund stehen. Die Zuwendungen sind danach wieder frei für eine neue.

create or replace function public.cancel_donation_receipt(_receipt_id uuid, _reason text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.has_permission(auth.uid(), 'donations.manage') then
    raise exception 'Zurücknehmen darf, wer Spenden verwaltet.';
  end if;
  if nullif(btrim(_reason), '') is null then
    raise exception 'Bitte einen Grund angeben.';
  end if;
  update public.donation_receipts
     set cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = btrim(_reason)
   where id = _receipt_id and cancelled_at is null;
  if not found then
    raise exception 'Diese Bestätigung gibt es nicht oder sie ist schon zurückgenommen.';
  end if;
  perform set_config('ding.donation_receipt', 'on', true);
  update public.donations set receipt_id = null where receipt_id = _receipt_id;
  perform set_config('ding.donation_receipt', '', true);
end;
$$;

-- ── Bezahlte Beiträge übernehmen ────────────────────────────────────────────

create or replace function public.import_paid_contributions(_year integer)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _neu integer;
begin
  if not public.has_permission(auth.uid(), 'donations.manage') then
    raise exception 'Übernehmen darf, wer Spenden verwaltet.';
  end if;
  if not coalesce((select fees_deductible from public.app_settings limit 1), false) then
    raise exception 'Mitgliedsbeiträge sind bei diesem Verein nicht abziehbar (§ 10b Abs. 1 Satz 8 EStG).';
  end if;
  insert into public.donations (donor_user_id, kind, amount, received_on, contribution_id, note)
  select c.user_id, 'membership_fee', c.amount, coalesce(c.paid_at, make_date(_year, 12, 31)), c.id,
         'Mitgliedsbeitrag ' || _year
    from public.contributions c
   where c.year = _year
     and c.status = 'bezahlt'
     and coalesce(c.amount, 0) > 0
     and not exists (select 1 from public.donations d where d.contribution_id = c.id);
  get diagnostics _neu = row_count;
  return _neu;
end;
$$;

-- ── Wer was sehen und ändern darf ───────────────────────────────────────────

alter table public.donations enable row level security;
alter table public.donation_receipts enable row level security;

create policy "Read own donations or as donation manager" on public.donations
  for select to authenticated
  using (donor_user_id = auth.uid() or public.has_permission(auth.uid(), 'donations.manage'));

create policy "Donation managers change donations" on public.donations
  for all to authenticated
  using (public.has_permission(auth.uid(), 'donations.manage'))
  with check (public.has_permission(auth.uid(), 'donations.manage'));

-- Bestätigungen entstehen und ändern sich nur über die Funktionen oben.
create policy "Read own valid receipts or as donation manager" on public.donation_receipts
  for select to authenticated
  using ((donor_user_id = auth.uid() and cancelled_at is null) or public.has_permission(auth.uid(), 'donations.manage'));

grant select, insert, update, delete on public.donations to authenticated;
grant select on public.donation_receipts to authenticated;
grant all on public.donations, public.donation_receipts to service_role;

revoke all on function public.donations_guard() from public, anon, authenticated;
revoke all on function public.donations_insert_guard() from public, anon, authenticated;
revoke all on function public.issue_donation_receipt(uuid[], date) from public, anon, authenticated;
revoke all on function public.cancel_donation_receipt(uuid, text) from public, anon, authenticated;
revoke all on function public.import_paid_contributions(integer) from public, anon, authenticated;
grant execute on function public.issue_donation_receipt(uuid[], date) to authenticated, service_role;
grant execute on function public.cancel_donation_receipt(uuid, text) to authenticated, service_role;
grant execute on function public.import_paid_contributions(integer) to authenticated, service_role;
