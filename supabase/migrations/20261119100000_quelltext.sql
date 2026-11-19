-- Der Text der Quellen, Seite für Seite – damit sich die Quellensammlung
-- auch im Inhalt durchsuchen lässt, nicht nur in den Titeln.
--
-- Woher der Text kommt: aus der Texterkennung beim Scannen im Browser
-- (Quellensammlung → Scannen). Später ebenso aus vorhandenen PDFs, deren
-- Text nachträglich gelesen wird.
--
-- Der Text hängt an der DATEI, nicht an der Quelle (`file_key` ist die
-- Kennung in SharePoint, bei Dateien im Supabase-Speicher deren Pfad). Ein
-- Scan, der erst in den Posteingang geht, hat noch keine Quelle – sein Text
-- liegt trotzdem schon bereit. Wird die Datei im Eingangskorb zugeordnet,
-- behält sie in SharePoint ihre Kennung, und der Text gehört ab dann zur
-- Quelle, ohne dass jemand etwas tun muss.
--
-- Gespeichert wird der Text so, wie er erkannt wurde, mit langem ſ – für
-- Zitate. Gesucht wird in einer Fassung mit rundem s, damit „Gehorsam" auch
-- „Gehorſam" findet.
--
-- Geschrieben wird nur über source_text_save(): Dort steht, wer einen
-- vorhandenen Text ersetzen darf.

create or replace function public.source_text_fold(_t text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  -- langes s, r rotunda, und das „e" über Umlauten alter Drucke
  select replace(translate(coalesce(_t, ''), 'ſꝛ', 'sr'), U&'\0364', '')
$$;

create or replace function public.source_text_query(_q text)
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
  -- Jedes Wort als Wortanfang, alle zusammen: „Pionier Kompanie" findet die
  -- Seite, auf der beides steht – auch „Pionierkompanien" über den Anfang.
  for _wort in
    select m[1] from regexp_matches(public.source_text_fold(_q), '([[:alnum:]äöüßÄÖÜ]+)', 'g') as m
  loop
    _teil := to_tsquery('german', quote_literal(_wort) || ':*');
    if numnode(_teil) > 0 then
      _ganz := case when _ganz is null then _teil else _ganz && _teil end;
    end if;
  end loop;
  return _ganz;
end;
$$;

create table public.source_pages (
  file_key text not null,
  page integer not null check (page >= 1),
  body text not null default '',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  -- Das Suchwort-Verzeichnis der Seite. Eine gewöhnliche Spalte, gefüllt
  -- vom Trigger unten – keine berechnete Spalte und kein Index über einen
  -- Ausdruck: Beides kann die Sicherung (backup_schema_ddl) nicht
  -- wiederherstellen (berechnete Spalten werden zu DEFAULT, der Index käme
  -- vor der Funktion, die er braucht).
  doc tsvector,
  primary key (file_key, page)
);

create or replace function public.source_pages_doc()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.doc := to_tsvector('german'::regconfig, public.source_text_fold(new.body));
  return new;
end;
$$;

create trigger source_pages_doc
  before insert or update of body on public.source_pages
  for each row execute function public.source_pages_doc();

create index source_pages_doc_idx on public.source_pages using gin (doc);

alter table public.source_pages enable row level security;

-- Lesen dürfen alle Mitglieder – wie die Quellen selbst.
create policy "Members can read source pages" on public.source_pages
  for select to authenticated using (public.is_member(auth.uid()));

revoke all on table public.source_pages from anon;
grant select on table public.source_pages to authenticated;
grant all on table public.source_pages to service_role;

/**
 * Den Text einer Datei ablegen, Seite für Seite (_pages[1] ist Seite 1).
 * Ein vorhandener Text wird ersetzt – aber nur von dem, der ihn abgelegt hat,
 * von dem, dem die Quelle gehört, oder von der Verwaltung der Dateiablage.
 */
create or replace function public.source_text_save(_file_key text, _pages text[])
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _uid uuid := auth.uid();
  _anzahl integer := coalesce(cardinality(_pages), 0);
begin
  if _uid is null or not public.is_member(_uid) then
    raise exception 'Nur für Mitglieder.' using errcode = '42501';
  end if;
  if coalesce(trim(_file_key), '') = '' then
    raise exception 'Es fehlt die Datei, zu der der Text gehört.';
  end if;
  if _anzahl > 5000 then
    raise exception 'Mehr als 5000 Seiten nimmt die Suche nicht an.';
  end if;
  if exists (select 1 from unnest(_pages) p where length(p) > 200000) then
    raise exception 'Eine Seite ist zu lang für die Suche.';
  end if;

  if exists (select 1 from public.source_pages where file_key = _file_key)
     and not public.has_permission(_uid, 'system.integrations')
     and exists (select 1 from public.source_pages
                  where file_key = _file_key and created_by is distinct from _uid)
     and not exists (select 1 from public.sources
                      where (drive_item_id = _file_key or file_path = _file_key) and created_by = _uid)
  then
    raise exception 'Den Text dieser Datei hat jemand anderes abgelegt.' using errcode = '42501';
  end if;

  delete from public.source_pages where file_key = _file_key;
  insert into public.source_pages (file_key, page, body, created_by)
  select _file_key, n::integer, coalesce(t, ''), _uid
    from unnest(_pages) with ordinality as x(t, n);
  return _anzahl;
end;
$$;

/**
 * Suche im Text aller Quellen. Eine Zeile je Fundseite, die besten zuerst.
 * Der Ausschnitt markiert die Treffer mit ⟦ und ⟧.
 */
create or replace function public.source_text_search(_q text, _max integer default 60)
returns table (source_id uuid, title text, epoch text, folder_id uuid, page integer, snippet text, rank real)
language sql
stable
set search_path to 'public'
as $$
  with q as (select public.source_text_query(_q) as tq),
  zuordnung as (
    select s.id, s.title, s.epoch, s.folder_id, s.drive_item_id as file_key
      from public.sources s where s.drive_item_id is not null
    union all
    select s.id, s.title, s.epoch, s.folder_id, s.file_path
      from public.sources s where s.drive_item_id is null and s.file_path is not null
  )
  select z.id, z.title, z.epoch, z.folder_id, p.page,
         ts_headline('german', public.source_text_fold(p.body), q.tq,
                     'StartSel=⟦, StopSel=⟧, MaxWords=30, MinWords=12, MaxFragments=2, FragmentDelimiter=" … "'),
         ts_rank(p.doc, q.tq)
    from q
    join public.source_pages p on p.doc @@ q.tq
    join zuordnung z on z.file_key = p.file_key
   where q.tq is not null
   order by 7 desc, z.title, p.page
   limit greatest(1, least(coalesce(_max, 60), 200))
$$;

/** Welche Dateien schon durchsuchbar sind, mit der Zahl ihrer Seiten. */
create or replace function public.source_text_files()
returns table (file_key text, pages integer)
language sql
stable
set search_path to 'public'
as $$
  select file_key, count(*)::integer from public.source_pages group by file_key
$$;

-- Wird eine Quelle gelöscht, geht ihr Text mit – sofern keine andere Quelle
-- dieselbe Datei benutzt.
create or replace function public.source_pages_aufraeumen()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _key text;
begin
  foreach _key in array array_remove(array[old.drive_item_id, old.file_path], null) loop
    if not exists (select 1 from public.sources where drive_item_id = _key or file_path = _key) then
      delete from public.source_pages where file_key = _key;
    end if;
  end loop;
  return old;
end;
$$;

create trigger source_pages_aufraeumen
  after delete on public.sources
  for each row execute function public.source_pages_aufraeumen();

revoke all on function public.source_text_fold(text) from public, anon;
grant execute on function public.source_text_fold(text) to authenticated, service_role;
revoke all on function public.source_text_query(text) from public, anon;
grant execute on function public.source_text_query(text) to authenticated, service_role;
revoke all on function public.source_text_save(text, text[]) from public, anon;
grant execute on function public.source_text_save(text, text[]) to authenticated, service_role;
revoke all on function public.source_text_search(text, integer) from public, anon;
grant execute on function public.source_text_search(text, integer) to authenticated, service_role;
revoke all on function public.source_text_files() from public, anon;
grant execute on function public.source_text_files() to authenticated, service_role;
revoke all on function public.source_pages_aufraeumen() from public, anon, authenticated;
revoke all on function public.source_pages_doc() from public, anon, authenticated;
