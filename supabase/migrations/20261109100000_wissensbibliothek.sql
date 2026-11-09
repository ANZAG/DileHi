-- Wissensbibliothek – ein Nachschlagewerk für Rechercheergebnisse.
--
-- Jede Sachaussage steht als Belegkarte da: ein Kernsatz, wie sicher er ist
-- (Belegstufe Q, F oder A), auf welcher Ebene er gilt, und dazu die Fundstelle
-- mit geprüftem Wortlaut, Zeigebild und ganzer Seite. Das alles liegt in der
-- Bibliothek selbst, denn wer auf einer Veranstaltung einen Beleg zeigen will,
-- hat weder die Bücher noch einen Dateiordner dabei.
--
-- Was hier entsteht:
--   library_presentations  die Darstellungen (Kürzel wie PI21), mit Zeitraum,
--                          Ebenen-Vokabular und den Namen der neun Sachbereiche
--   library_sources        das gemeinsame Quellenregister, mit Rechtsstatus
--   library_plates         Bildtafeln, mit den fünf Angaben zum Bild
--   library_cards          die Belegkarten
--   library_findings       die Fundstellen einer Karte, in Quelle oder Bildtafel
--   library_images         welche Bilder im Speicher liegen und wie gross sie sind
--   library_pages          freie Seiten: Startseite, Methode, Prüfregeln
--   library_history        jede Änderung mit altem und neuem Stand
--   library_import()       legt einen Eintrag an oder aktualisiert ihn, aus den
--                          Kopfdaten einer Markdown-Datei (als JSON)
--   library_search()       Volltextsuche über Karten, Quellen und Bildtafeln
--
-- Die Datenbank ist die Quelle der Wahrheit. Eingepflegt wird über die Seite
-- „Pflege" (Ordner hochladen) oder direkt per SQL mit library_import(); beides
-- läuft durch dieselben Prüfungen. Was sich ändert, hält library_history fest.
--
-- Nichts davon gehört in den Build: Alles, was im Build steckt, liegt ohne
-- Anmeldung auf dem Webspace. Texte und Bilder kommen deshalb nur über die
-- Datenbank und einen privaten Speicher, beides nur für angemeldete Mitglieder
-- mit dem Recht library.read.
--
-- Abgeschaltet ausgeliefert. Werte in der Datenbank sind englisch (`checked`,
-- `internal`), die Kopfdaten der Dateien deutsch (`geprüft`, `intern`);
-- library_import() übersetzt. Standard: docs/wissensbibliothek-standard.md.

-- ── Modul und Rechte ────────────────────────────────────────────────────────

insert into public.app_modules (key, label, description, kind, requires, sort_order, enabled) values
  ('library', 'Wissensbibliothek',
   'Nachschlagewerk für Rechercheergebnisse: Belegkarten mit Fundstelle, Wortlaut und Seitenbild, nur für Mitglieder.',
   'core', null, 155, false)
on conflict (key) do nothing;

insert into public.permission_catalog (key, label, category, sort_order) values
  ('library.read', 'Wissensbibliothek lesen', 'Inhalte', 5),
  ('library.manage', 'Wissensbibliothek pflegen', 'Inhalte', 6)
on conflict (key) do nothing;

-- Lesen dürfen von Anfang an alle Rollen, die es gibt: Ein Mitglied, das nur
-- eine Funktionsrolle hat, soll nicht leer ausgehen. Wer es enger will, nimmt
-- das Recht in der Rollenverwaltung wieder weg.
insert into public.role_permissions (role, permission, granted)
select rc.key, 'library.read', true
from public.role_catalog rc
on conflict (role, permission) do nothing;

insert into public.role_permissions (role, permission, granted)
select rc.key, 'library.manage', true
from public.role_catalog rc
where rc.is_leadership
on conflict (role, permission) do nothing;

create or replace function public.library_reader(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.has_permission(_user_id, 'library.read')
      or public.has_permission(_user_id, 'library.manage')
$$;

-- ── Tabellen ────────────────────────────────────────────────────────────────

create table if not exists public.library_presentations (
  id text primary key check (id ~ '^[A-Z][A-Z0-9]{1,9}$'),
  title text not null,
  epoch text,
  period text,
  -- Ebenen von allgemein nach konkret, z. B. Armee … Einzelperson
  levels text[] not null default '{}',
  -- Bezeichnung der neun Sachbereiche: {"1": "Rahmen …", …}
  areas jsonb not null default '{}'::jsonb,
  body text,
  as_of date,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.library_sources (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  kind text,
  title text not null,
  place_publisher text,
  year text,
  note text,
  original text,
  level text,
  rights text,
  rights_status text not null check (rights_status in ('free', 'internal', 'open')),
  evaluated text,
  title_page text,
  body text,
  -- Verbindungen, beide freiwillig: das Buch in der Quellensammlung (geteilte
  -- Dateien) und die Angabe auf der öffentlichen Epochenseite.
  collection_source_id uuid references public.sources(id) on delete set null,
  public_source_id uuid references public.epoch_sources(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.library_plates (
  id text primary key check (id ~ '^[A-Z][A-Z0-9]*-T[0-9]+$'),
  presentation_id text not null references public.library_presentations(id) on update cascade,
  title text not null,
  file text,
  object text,
  dating text,
  reproduction text,
  readable text,
  not_readable text,
  unit text,
  rights text,
  rights_status text not null check (rights_status in ('free', 'internal', 'open')),
  as_of date,
  body text,
  updated_at timestamptz not null default now()
);

create table if not exists public.library_cards (
  id text primary key check (id ~ '^[A-Z][A-Z0-9]*-[0-9]{4}$'),
  presentation_id text not null references public.library_presentations(id) on update cascade,
  area smallint not null check (area between 1 and 9),
  statement text not null,
  grade text not null check (grade in ('Q', 'F', 'A')),
  grade_note text,
  level text,
  valid_for text,
  keywords text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'checked', 'image_missing', 'image_replace')),
  as_of date,
  body text,
  updated_at timestamptz not null default now()
);

create index if not exists library_cards_presentation_idx on public.library_cards (presentation_id, area);

create table if not exists public.library_findings (
  id uuid primary key default gen_random_uuid(),
  card_id text not null references public.library_cards(id) on delete cascade on update cascade,
  position integer not null default 0,
  source_id text references public.library_sources(id) on update cascade,
  plate_id text references public.library_plates(id) on update cascade,
  page text,
  pdf_page integer,
  quote text,
  quote_note text,
  -- Pfade wie in den Kopfdaten: <quelle>/sNNN_a1.jpg, <Kürzel>/T27.jpg
  pointer_image text,
  page_image text,
  constraint library_findings_one_origin check (num_nonnulls(source_id, plate_id) = 1)
);

create index if not exists library_findings_card_idx on public.library_findings (card_id, position);
create index if not exists library_findings_source_idx on public.library_findings (source_id);
create index if not exists library_findings_plate_idx on public.library_findings (plate_id);

-- Ein Bild, wie es in den Kopfdaten heisst (`becher-2018/s29.jpg`), und wo es
-- im Speicher liegt. Gespeichert wird eine Webfassung, nicht das Original.
create table if not exists public.library_images (
  path text primary key,
  object text not null,
  preview text,
  width integer,
  height integer,
  bytes integer,
  uploaded_by uuid references public.profiles(id) on delete set null default auth.uid(),
  uploaded_at timestamptz not null default now()
);

create table if not exists public.library_pages (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  title text not null,
  body text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.library_history (
  id bigint generated by default as identity primary key,
  table_name text not null,
  entry_id text not null,
  operation text not null,
  old_row jsonb,
  new_row jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create index if not exists library_history_entry_idx on public.library_history (entry_id, changed_at desc);

-- ── Änderungsverlauf ────────────────────────────────────────────────────────
--
-- Früher hätte Git den Verlauf gehalten. Seit die Datenbank die Quelle ist,
-- tut es diese Tabelle. Unveränderte Einspielungen schreiben nichts.

create or replace function public.library_track()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _alt jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  _neu jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  _zeile jsonb := coalesce(_neu, _alt);
begin
  if tg_op = 'UPDATE' and (_alt - 'updated_at') = (_neu - 'updated_at') then
    return null;
  end if;
  insert into public.library_history (table_name, entry_id, operation, old_row, new_row)
  values (
    tg_table_name,
    case tg_table_name
      when 'library_findings' then _zeile->>'card_id'
      when 'library_images' then _zeile->>'path'
      when 'library_pages' then _zeile->>'slug'
      else _zeile->>'id'
    end,
    lower(tg_op), _alt, _neu
  );
  return null;
end;
$$;

do $$
declare
  _t text;
begin
  foreach _t in array array['library_presentations', 'library_sources', 'library_plates', 'library_cards',
                            'library_findings', 'library_images', 'library_pages'] loop
    execute format('drop trigger if exists library_track on public.%I', _t);
    execute format('create trigger library_track after insert or update or delete on public.%I
                    for each row execute function public.library_track()', _t);
  end loop;
  foreach _t in array array['library_presentations', 'library_sources', 'library_plates', 'library_cards',
                            'library_pages'] loop
    execute format('drop trigger if exists library_touch on public.%I', _t);
    execute format('create trigger library_touch before update on public.%I
                    for each row execute function public.update_updated_at()', _t);
  end loop;
end;
$$;

-- ── Bilder nur mit Rechtsstatus ─────────────────────────────────────────────
--
-- Ein Bild liegt im Ordner seiner Quelle (`becher-2018/…`) oder seiner
-- Darstellung (`PI21/…`, für Bildtafeln). Beide tragen einen Rechtsstatus;
-- ein Bild, das zu keiner von beiden gehört, hätte keinen und kommt nicht
-- herein.

create or replace function public.library_images_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  _ordner text := split_part(new.path, '/', 1);
begin
  if new.path !~ '^[A-Za-z0-9][A-Za-z0-9-]*/[^/]+$' then
    raise exception 'Bild „%“: erwartet wird <Quelle oder Darstellung>/<Datei>.', new.path;
  end if;
  if not exists (select 1 from public.library_sources where id = _ordner)
     and not exists (select 1 from public.library_presentations where id = _ordner) then
    raise exception 'Bild „%“: Ordner „%“ ist weder eine Quelle im Register noch eine Darstellung. Erst die Quelle mit Rechtsstatus anlegen.', new.path, _ordner;
  end if;
  return new;
end;
$$;

drop trigger if exists library_images_guard on public.library_images;
create trigger library_images_guard
  before insert or update on public.library_images
  for each row execute function public.library_images_guard();

-- ── Einspielen ──────────────────────────────────────────────────────────────
--
-- Nimmt die Kopfdaten einer Datei so, wie sie im Standard stehen – deutsche
-- Schlüssel, deutsche Werte – und den Text darunter. Gibt die Kennung zurück.
--
--   select public.library_import('karte', '{"id": "PI21-0001", …}'::jsonb, '**Einschränkung:** …');
--
-- Arten: darstellung, quelle, bild, karte, seite. Läuft mit den Rechten der
-- aufrufenden Person; schreiben darf nur, wer library.manage hat.

create or replace function public.library_value(_feld text, _wert text)
returns text
language plpgsql
immutable
set search_path to 'public'
as $$
begin
  if _wert is null then
    return null;
  end if;
  if _feld = 'status' then
    return case lower(_wert)
      when 'entwurf' then 'draft'
      when 'geprüft' then 'checked'
      when 'geprueft' then 'checked'
      when 'bild-fehlt' then 'image_missing'
      when 'bild-ersetzen' then 'image_replace'
      else null end;
  elsif _feld = 'rechte_status' then
    return case lower(_wert)
      when 'frei' then 'free'
      when 'intern' then 'internal'
      when 'offen' then 'open'
      else null end;
  end if;
  return _wert;
end;
$$;

create or replace function public.library_import(_art text, _d jsonb, _text text default null)
returns text
language plpgsql
set search_path to 'public'
as $$
declare
  _id text := nullif(trim(_d->>'id'), '');
  _darst public.library_presentations%rowtype;
  _rechte text;
  _status text;
  _f jsonb;
  _alt jsonb;
  _neu jsonb;
  _text_rein text := nullif(trim(coalesce(_text, '')), '');
begin
  if _id is null and _art <> 'seite' then
    raise exception '%: Die Kopfdaten haben keine id.', _art;
  end if;

  if _art = 'darstellung' then
    insert into public.library_presentations as t (id, title, epoch, period, levels, areas, body, as_of)
    values (
      _id,
      coalesce(_d->>'titel', _id),
      _d->>'epoche',
      _d->>'zeitraum',
      coalesce(array(select jsonb_array_elements_text(_d->'ebenen')), '{}'),
      coalesce(_d->'bereiche', '{}'::jsonb),
      _text_rein,
      (_d->>'stand')::date
    )
    on conflict (id) do update set
      title = excluded.title, epoch = excluded.epoch, period = excluded.period, levels = excluded.levels,
      areas = excluded.areas, body = excluded.body, as_of = excluded.as_of
    where (t.title, t.epoch, t.period, t.levels, t.areas, t.body, t.as_of)
          is distinct from (excluded.title, excluded.epoch, excluded.period, excluded.levels,
                            excluded.areas, excluded.body, excluded.as_of);
    return _id;

  elsif _art = 'quelle' then
    _rechte := public.library_value('rechte_status', _d->>'rechte_status');
    if _rechte is null then
      raise exception 'Quelle %: rechte_status fehlt oder ist unbekannt (frei, intern oder offen).', _id;
    end if;
    insert into public.library_sources as t
      (id, kind, title, place_publisher, year, note, original, level, rights, rights_status, evaluated, title_page, body)
    values (
      _id, _d->>'art', coalesce(_d->>'titel', _id), _d->>'ort_verlag', _d->>'jahr', _d->>'hinweis',
      _d->>'vorlage', _d->>'ebene', _d->>'rechte', _rechte, _d->>'ausgewertet', _d->>'titelblatt', _text_rein
    )
    on conflict (id) do update set
      kind = excluded.kind, title = excluded.title, place_publisher = excluded.place_publisher,
      year = excluded.year, note = excluded.note, original = excluded.original, level = excluded.level,
      rights = excluded.rights, rights_status = excluded.rights_status, evaluated = excluded.evaluated,
      title_page = excluded.title_page, body = excluded.body
    where (t.kind, t.title, t.place_publisher, t.year, t.note, t.original, t.level, t.rights,
           t.rights_status, t.evaluated, t.title_page, t.body)
          is distinct from (excluded.kind, excluded.title, excluded.place_publisher, excluded.year,
                            excluded.note, excluded.original, excluded.level, excluded.rights,
                            excluded.rights_status, excluded.evaluated, excluded.title_page, excluded.body);
    return _id;

  elsif _art = 'bild' then
    _rechte := public.library_value('rechte_status', _d->>'rechte_status');
    if _rechte is null then
      raise exception 'Bildtafel %: rechte_status fehlt oder ist unbekannt (frei, intern oder offen).', _id;
    end if;
    if not exists (select 1 from public.library_presentations where id = _d->>'darstellung') then
      raise exception 'Bildtafel %: Darstellung „%“ gibt es nicht.', _id, _d->>'darstellung';
    end if;
    insert into public.library_plates as t
      (id, presentation_id, title, file, object, dating, reproduction, readable, not_readable, unit,
       rights, rights_status, as_of, body)
    values (
      _id, _d->>'darstellung', coalesce(_d->>'titel', _id), _d->>'datei', _d->>'objekt', _d->>'datierung',
      _d->>'reproduktion', _d->>'ablesbar', _d->>'nicht_ablesbar', _d->>'einheit', _d->>'rechte', _rechte,
      (_d->>'stand')::date, _text_rein
    )
    on conflict (id) do update set
      presentation_id = excluded.presentation_id, title = excluded.title, file = excluded.file,
      object = excluded.object, dating = excluded.dating, reproduction = excluded.reproduction,
      readable = excluded.readable, not_readable = excluded.not_readable, unit = excluded.unit,
      rights = excluded.rights, rights_status = excluded.rights_status, as_of = excluded.as_of,
      body = excluded.body
    where (t.presentation_id, t.title, t.file, t.object, t.dating, t.reproduction, t.readable,
           t.not_readable, t.unit, t.rights, t.rights_status, t.as_of, t.body)
          is distinct from (excluded.presentation_id, excluded.title, excluded.file, excluded.object,
                            excluded.dating, excluded.reproduction, excluded.readable, excluded.not_readable,
                            excluded.unit, excluded.rights, excluded.rights_status, excluded.as_of, excluded.body);
    return _id;

  elsif _art = 'karte' then
    select * into _darst from public.library_presentations where id = _d->>'darstellung';
    if not found then
      raise exception 'Karte %: Darstellung „%“ gibt es nicht.', _id, _d->>'darstellung';
    end if;
    if split_part(_id, '-', 1) <> _darst.id then
      raise exception 'Karte %: Die Kennung beginnt nicht mit dem Kürzel der Darstellung (%).', _id, _darst.id;
    end if;
    if coalesce(_d->>'stufe', '') not in ('Q', 'F', 'A') then
      raise exception 'Karte %: stufe muss Q, F oder A sein.', _id;
    end if;
    if coalesce((_d->>'bereich') ~ '^[1-9]$', false) is not true then
      raise exception 'Karte %: bereich muss eine Zahl von 1 bis 9 sein.', _id;
    end if;
    if _d->>'ebene' is not null and cardinality(_darst.levels) > 0
       and not (_d->>'ebene' = any (_darst.levels)) then
      raise exception 'Karte %: Ebene „%“ steht nicht im Vokabular von % (%).',
        _id, _d->>'ebene', _darst.id, array_to_string(_darst.levels, ', ');
    end if;
    _status := coalesce(public.library_value('status', _d->>'status'), case when _d->>'status' is not null then 'x' end, 'draft');
    if _status = 'x' then
      raise exception 'Karte %: status „%“ ist unbekannt (entwurf, geprüft, bild-fehlt, bild-ersetzen).', _id, _d->>'status';
    end if;
    if jsonb_typeof(_d->'fundstellen') is distinct from 'array' or jsonb_array_length(_d->'fundstellen') = 0 then
      raise exception 'Karte %: Ohne Fundstelle keine Karte.', _id;
    end if;
    for _f in select * from jsonb_array_elements(_d->'fundstellen') loop
      if num_nonnulls(_f->>'quelle', _f->>'bild') <> 1 then
        raise exception 'Karte %: Jede Fundstelle nennt genau eins – quelle oder bild.', _id;
      end if;
      if _f->>'quelle' is not null and not exists (select 1 from public.library_sources where id = _f->>'quelle') then
        raise exception 'Karte %: Quelle „%“ steht nicht im Register.', _id, _f->>'quelle';
      end if;
      if _f->>'bild' is not null and not exists (select 1 from public.library_plates where id = _f->>'bild') then
        raise exception 'Karte %: Bildtafel „%“ gibt es nicht.', _id, _f->>'bild';
      end if;
    end loop;

    insert into public.library_cards as t
      (id, presentation_id, area, statement, grade, grade_note, level, valid_for, keywords, status, as_of, body)
    values (
      _id, _darst.id, (_d->>'bereich')::smallint, coalesce(_d->>'kernsatz', ''), _d->>'stufe',
      _d->>'stufe_hinweis', _d->>'ebene', _d->>'gilt_stand',
      coalesce(array(select jsonb_array_elements_text(_d->'schlagworte')), '{}'),
      _status, (_d->>'stand')::date, _text_rein
    )
    on conflict (id) do update set
      presentation_id = excluded.presentation_id, area = excluded.area, statement = excluded.statement,
      grade = excluded.grade, grade_note = excluded.grade_note, level = excluded.level,
      valid_for = excluded.valid_for, keywords = excluded.keywords, status = excluded.status,
      as_of = excluded.as_of, body = excluded.body
    where (t.presentation_id, t.area, t.statement, t.grade, t.grade_note, t.level, t.valid_for,
           t.keywords, t.status, t.as_of, t.body)
          is distinct from (excluded.presentation_id, excluded.area, excluded.statement, excluded.grade,
                            excluded.grade_note, excluded.level, excluded.valid_for, excluded.keywords,
                            excluded.status, excluded.as_of, excluded.body);
    if (select statement from public.library_cards where id = _id) = '' then
      raise exception 'Karte %: kernsatz fehlt.', _id;
    end if;

    -- Fundstellen nur ersetzen, wenn sie sich geändert haben – sonst stünde
    -- nach jedem Einspielen eine Änderung im Verlauf, die keine ist.
    select coalesce(jsonb_agg(jsonb_build_array(source_id, plate_id, page, pdf_page, quote, quote_note,
                                                pointer_image, page_image) order by position), '[]')
      into _alt
      from public.library_findings where card_id = _id;
    select coalesce(jsonb_agg(jsonb_build_array(f->>'quelle', f->>'bild', f->>'seite',
                                                (f->>'pdf_seite')::integer, f->>'wortlaut', f->>'wortlaut_hinweis',
                                                f->>'zeigebild', f->>'seitenbild') order by n), '[]')
      into _neu
      from jsonb_array_elements(_d->'fundstellen') with ordinality as x(f, n);
    if _alt is distinct from _neu then
      delete from public.library_findings where card_id = _id;
      insert into public.library_findings
        (card_id, position, source_id, plate_id, page, pdf_page, quote, quote_note, pointer_image, page_image)
      select _id, n, f->>'quelle', f->>'bild', f->>'seite', (f->>'pdf_seite')::integer, f->>'wortlaut',
             f->>'wortlaut_hinweis', f->>'zeigebild', f->>'seitenbild'
        from jsonb_array_elements(_d->'fundstellen') with ordinality as x(f, n);
    end if;
    return _id;

  elsif _art = 'seite' then
    _id := coalesce(_id, _d->>'slug');
    if _id is null then
      raise exception 'Seite: Die Kopfdaten haben keine id.';
    end if;
    insert into public.library_pages as t (slug, title, body, sort_order)
    values (_id, coalesce(_d->>'titel', _id), _text_rein, coalesce((_d->>'reihenfolge')::integer, 0))
    on conflict (slug) do update set title = excluded.title, body = excluded.body, sort_order = excluded.sort_order
    where (t.title, t.body, t.sort_order) is distinct from (excluded.title, excluded.body, excluded.sort_order);
    return _id;
  end if;

  raise exception 'Unbekannte Art „%“ (darstellung, quelle, bild, karte, seite).', _art;
end;
$$;

-- ── Suche ───────────────────────────────────────────────────────────────────
--
-- Deutsche Volltextsuche, jedes Wort als Wortanfang: „Stahlh" findet
-- „Stahlhelm", „Helme" findet „Helm". Eine Kennung („0042", „T27") findet
-- ihre Karte oder Tafel direkt – auf einer Veranstaltung heisst es „Karte
-- PI21-0042", nicht „die mit dem Bataillon".

create or replace function public.library_query(_q text)
returns tsquery
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  _wort text;
  _teil tsquery;
  _ganz tsquery;
begin
  for _wort in
    select m[1] from regexp_matches(coalesce(_q, ''), '([[:alnum:]äöüßÄÖÜ]+)', 'g') as m
  loop
    _teil := to_tsquery('german', quote_literal(_wort) || ':*');
    if numnode(_teil) > 0 then
      _ganz := case when _ganz is null then _teil else _ganz && _teil end;
    end if;
  end loop;
  return _ganz;
end;
$$;

create or replace function public.library_search(_q text)
returns table (kind text, id text, presentation_id text, title text, rank real)
language sql
stable
set search_path to 'public'
as $$
  with q as (
    select public.library_query(_q) as tq,
           case when trim(coalesce(_q, '')) ~ '^[A-Za-z0-9-]{2,}$' then upper(trim(_q)) end as kennung
  ),
  karten as (
    select c.id, c.presentation_id, c.statement,
           setweight(to_tsvector('german', c.statement), 'A')
           || setweight(to_tsvector('german', array_to_string(c.keywords, ' ')), 'A')
           || setweight(to_tsvector('german', coalesce(c.grade_note, '') || ' ' || coalesce(c.valid_for, '')
                                              || ' ' || coalesce(c.level, '')), 'C')
           || setweight(to_tsvector('german', coalesce(c.body, '')), 'C')
           || setweight(to_tsvector('german', coalesce((
                select string_agg(concat_ws(' ', f.quote, f.quote_note, s.title, p.title), ' ')
                from public.library_findings f
                left join public.library_sources s on s.id = f.source_id
                left join public.library_plates p on p.id = f.plate_id
                where f.card_id = c.id), '')), 'B') as doc
    from public.library_cards c
  ),
  quellen as (
    select s.id, s.title,
           setweight(to_tsvector('german', s.title), 'A')
           || setweight(to_tsvector('german', concat_ws(' ', s.kind, s.place_publisher, s.year, s.note,
                                                        s.evaluated, s.level, s.body)), 'C') as doc
    from public.library_sources s
  ),
  tafeln as (
    select p.id, p.presentation_id, p.title,
           setweight(to_tsvector('german', p.title), 'A')
           || setweight(to_tsvector('german', concat_ws(' ', p.object, p.dating, p.readable, p.not_readable,
                                                        p.unit, p.body)), 'B') as doc
    from public.library_plates p
  )
  select * from (
    select 'card'::text, k.id, k.presentation_id, k.statement,
           (case when q.kennung is not null and k.id like '%' || q.kennung || '%' then 10 else 0 end
            + coalesce(ts_rank(k.doc, q.tq), 0))::real
    from karten k, q
    where (q.tq is not null and k.doc @@ q.tq)
       or (q.kennung is not null and k.id like '%' || q.kennung || '%')
    union all
    select 'source', s.id, null, s.title,
           (case when q.kennung is not null and upper(s.id) = q.kennung then 10 else 0 end
            + coalesce(ts_rank(s.doc, q.tq), 0))::real
    from quellen s, q
    where (q.tq is not null and s.doc @@ q.tq)
       or (q.kennung is not null and upper(s.id) = q.kennung)
    union all
    select 'plate', t.id, t.presentation_id, t.title,
           (case when q.kennung is not null and t.id like '%' || q.kennung || '%' then 10 else 0 end
            + coalesce(ts_rank(t.doc, q.tq), 0))::real
    from tafeln t, q
    where (q.tq is not null and t.doc @@ q.tq)
       or (q.kennung is not null and t.id like '%' || q.kennung || '%')
  ) treffer (kind, id, presentation_id, title, rank)
  order by rank desc, id
  limit 50
$$;

-- ── Wer was sehen und ändern darf ───────────────────────────────────────────

do $$
declare
  _t text;
begin
  foreach _t in array array['library_presentations', 'library_sources', 'library_plates', 'library_cards',
                            'library_findings', 'library_images', 'library_pages'] loop
    execute format('alter table public.%I enable row level security', _t);
    execute format('drop policy if exists "Library: read" on public.%I', _t);
    execute format('create policy "Library: read" on public.%I for select to authenticated
                    using (public.library_reader(auth.uid()))', _t);
    execute format('drop policy if exists "Library: manage" on public.%I', _t);
    execute format('create policy "Library: manage" on public.%I for all to authenticated
                    using (public.has_permission(auth.uid(), ''library.manage''))
                    with check (public.has_permission(auth.uid(), ''library.manage''))', _t);
    execute format('revoke all on public.%I from anon', _t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', _t);
    execute format('grant all on public.%I to service_role', _t);
  end loop;
end;
$$;

alter table public.library_history enable row level security;
drop policy if exists "Library: history for managers" on public.library_history;
create policy "Library: history for managers" on public.library_history
  for select to authenticated
  using (public.has_permission(auth.uid(), 'library.manage'));
revoke all on public.library_history from anon;
grant select on public.library_history to authenticated;
grant all on public.library_history to service_role;

-- ── Speicher ────────────────────────────────────────────────────────────────
--
-- Privat. Die Seite holt Bilder über signierte Adressen mit kurzer Laufzeit.
-- Pfad wie in library_images.object: <Quelle oder Darstellung>/<Datei>.webp,
-- Vorschauen unter _vorschau/.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('library', 'library', false, 10485760, '{image/webp,image/jpeg,image/png}'::text[])
on conflict (id) do nothing;

drop policy if exists "Library: read images" on storage.objects;
create policy "Library: read images" on storage.objects
  for select to authenticated
  using (bucket_id = 'library' and public.library_reader(auth.uid()));

drop policy if exists "Library: upload images" on storage.objects;
create policy "Library: upload images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'library' and public.has_permission(auth.uid(), 'library.manage'));

drop policy if exists "Library: replace images" on storage.objects;
create policy "Library: replace images" on storage.objects
  for update to authenticated
  using (bucket_id = 'library' and public.has_permission(auth.uid(), 'library.manage'))
  with check (bucket_id = 'library' and public.has_permission(auth.uid(), 'library.manage'));

drop policy if exists "Library: delete images" on storage.objects;
create policy "Library: delete images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'library' and public.has_permission(auth.uid(), 'library.manage'));

-- ── Wer die Funktionen aufrufen darf ────────────────────────────────────────

revoke all on function public.library_reader(uuid) from public, anon;
grant execute on function public.library_reader(uuid) to authenticated, service_role;

revoke all on function public.library_track() from public, anon, authenticated;
revoke all on function public.library_images_guard() from public, anon, authenticated;

revoke all on function public.library_value(text, text) from public, anon;
grant execute on function public.library_value(text, text) to authenticated, service_role;

revoke all on function public.library_import(text, jsonb, text) from public, anon;
grant execute on function public.library_import(text, jsonb, text) to authenticated, service_role;

revoke all on function public.library_query(text) from public, anon;
grant execute on function public.library_query(text) to authenticated, service_role;

revoke all on function public.library_search(text) from public, anon;
grant execute on function public.library_search(text) to authenticated, service_role;
