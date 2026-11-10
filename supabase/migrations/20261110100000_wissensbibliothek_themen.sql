-- Wissensbibliothek: Themenseiten über den Belegkarten.
--
-- Mit Karten allein findet man Belege zu langsam: Wer „Helm Bezug" sucht,
-- fand keinen Ort, an dem Stahlhelm, Helmüberzug und Feldmütze mit
-- Vorschrift, Fotobefund und Folgerung für die Darstellung zusammenstehen.
-- Darüber kommt jetzt eine Schicht Themenseiten in zehn festen Kapiteln. Die
-- Themenseite ist Navigation und Lesetext, die Karte bleibt der Beleg.
--
-- Was hier entsteht:
--   library_topics         Themenseiten (themen/<Kürzel>/<id>.md)
--   Darstellung            kapitel (Bezeichnungen der zehn Kapitel), rollen
--   Karte                  thema (Themenseiten, auf die sie zeigt), rollen
--   Bildtafel              jahr, datierung_herkunft, lage, zeigt – für die
--                          Zählung „was sich in der Realität findet"
--   library_import()       neue Art `thema`, neue Felder der übrigen Arten
--   library_search()       Themenseiten zuerst, mit gefalteten Wörtern
--                          („Helm Bezug" findet „Helmbezug" und „Helm-Bezug")
--
-- Die Werte von datierung_herkunft und lage bleiben deutsch, wie im Standard:
-- Es sind Kürzel des Standards, keine Zustände des Programms.
-- Standard: docs/wissensbibliothek-standard.md, Abschnitte 4 und 8–11.
-- Wiederholbar.

-- ── Neue Felder ─────────────────────────────────────────────────────────────

alter table public.library_presentations
  add column if not exists chapters jsonb not null default '[]'::jsonb,
  add column if not exists roles jsonb not null default '[]'::jsonb;

comment on column public.library_presentations.chapters is '[{nr: 1..10, titel}] – Bezeichnungen der Kapitel';
comment on column public.library_presentations.roles is '[{id, titel, text}] – Rollen für „Ich stelle dar"';

alter table public.library_cards
  add column if not exists topics text[] not null default '{}',
  add column if not exists roles text[] not null default '{}';

alter table public.library_plates
  add column if not exists year integer,
  add column if not exists dating_origin text
    check (dating_origin in ('rueckseite', 'aufschrift', 'poststempel', 'beschriftung', 'dateiname', 'objekt', 'keine')),
  add column if not exists situation text
    check (situation in ('front', 'ruhe', 'heimat', 'uebungsplatz', 'atelier', 'unbekannt')),
  add column if not exists shows jsonb not null default '[]'::jsonb;

comment on column public.library_plates.shows is '[{thema, merkmal, anzahl}] – was die Tafel für welche Themenseite zeigt';

-- ── Themenseiten ────────────────────────────────────────────────────────────
--
-- eltern ohne Fremdschlüssel: Eine Unterseite darf vor ihrer Elternseite
-- eingelesen werden, und eine fehlende Elternseite ist eine Warnung, kein
-- Fehler (die Seite steht dann oben im Kapitel). Kreise lehnt
-- library_import() ab. karten und tafeln ebenso ohne Fremdschlüssel: Eine
-- Seite darf auf eine Karte zeigen, die erst noch geschrieben wird.

create table if not exists public.library_topics (
  id text primary key check (id ~ '^[A-Z][A-Z0-9]{1,9}-[a-z0-9][a-z0-9-]*$'),
  presentation_id text not null references public.library_presentations(id) on update cascade,
  title text not null,
  chapter smallint not null check (chapter between 1 and 10),
  parent_id text,
  sort_order integer not null default 0,
  keywords text[] not null default '{}',
  roles text[] not null default '{}',
  cards text[] not null default '{}',
  plates text[] not null default '{}',
  tree jsonb,
  -- „## Kurzantwort", beim Einlesen herausgezogen: für Suche und Prüfliste
  summary text,
  body text,
  as_of date not null,
  updated_at timestamptz not null default now()
);

create index if not exists library_topics_presentation_idx on public.library_topics (presentation_id, chapter, sort_order);

drop trigger if exists library_track on public.library_topics;
create trigger library_track after insert or update or delete on public.library_topics
  for each row execute function public.library_track();
drop trigger if exists library_touch on public.library_topics;
create trigger library_touch before update on public.library_topics
  for each row execute function public.update_updated_at();

alter table public.library_topics enable row level security;
drop policy if exists "Library: read" on public.library_topics;
create policy "Library: read" on public.library_topics for select to authenticated
  using (public.library_reader(auth.uid()));
drop policy if exists "Library: manage" on public.library_topics;
create policy "Library: manage" on public.library_topics for all to authenticated
  using (public.has_permission(auth.uid(), 'library.manage'))
  with check (public.has_permission(auth.uid(), 'library.manage'));
revoke all on public.library_topics from anon;
grant select, insert, update, delete on public.library_topics to authenticated;
grant all on public.library_topics to service_role;

-- ── Hilfen ──────────────────────────────────────────────────────────────────

-- Eine Liste aus den Kopfdaten als text[]; fehlt sie, eine leere.
create or replace function public.library_list(_j jsonb)
returns text[]
language sql
immutable
set search_path to 'public'
as $$
  select case when jsonb_typeof(_j) = 'array'
              then coalesce(array(select trim(e) from jsonb_array_elements_text(_j) e where trim(e) <> ''), '{}')
              when jsonb_typeof(_j) in ('string', 'number') and trim(_j #>> '{}') <> '' then array[trim(_j #>> '{}')]
              else '{}' end
$$;

-- Ein Abschnitt „## <Titel>" aus dem Text einer Themenseite, bis zum nächsten
-- „## ". Ohne regulären Ausdruck: Gemischt gierige und genügsame Ausdrücke
-- verhalten sich in Postgres anders als erwartet.
create or replace function public.library_section(_text text, _titel text)
returns text
language plpgsql
immutable
set search_path to 'public'
as $$
declare
  _t text;
  _kopf text := E'\n## ' || _titel || E'\n';
  _start integer;
  _rest text;
  _ende integer;
begin
  if _text is null then
    return null;
  end if;
  _t := E'\n' || regexp_replace(replace(_text, E'\r', ''), E'[ \t]+\n', E'\n', 'g') || E'\n';
  _start := strpos(_t, _kopf);
  if _start = 0 then
    return null;
  end if;
  _rest := substr(_t, _start + length(_kopf));
  _ende := strpos(_rest, E'\n## ');
  if _ende > 0 then
    _rest := left(_rest, _ende - 1);
  end if;
  return nullif(trim(both E' \n\t' from _rest), '');
end;
$$;

-- Für den Vergleich gefaltet: klein, Umlaute ausgeschrieben, ß als ss, ohne
-- Leerzeichen, Bindestriche und Satzzeichen. „Helm-Überzug", „Helm Ueberzug"
-- und „helmüberzug" werden alle zu „helmueberzug".
create or replace function public.library_fold(_t text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select regexp_replace(
    translate(
      replace(replace(replace(replace(replace(replace(replace(coalesce(_t, ''),
        'Ä', 'ae'), 'Ö', 'oe'), 'Ü', 'ue'), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss')
      , 'ÉÈÊÁÀÂÍÓÔÚÇéèêáàâíóôúç', 'eeeaaaioouceeeaaaioouc')
    , '[^A-Za-z0-9]+', '', 'g')
$$;

-- lower() erst nach dem Ausschreiben: Ob es Umlaute kennt, hängt von der
-- Sortierfolge der Datenbank ab.
create or replace function public.library_fold_lower(_t text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select lower(public.library_fold(_t))
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
  _eltern text;
  _schritte integer := 0;
  _kapitel integer;
begin
  if _id is null and _art <> 'seite' then
    raise exception '%: Die Kopfdaten haben keine id.', _art;
  end if;

  if _art = 'darstellung' then
    if _d ? 'kapitel' and jsonb_typeof(_d->'kapitel') is distinct from 'array' then
      raise exception 'Darstellung %: kapitel ist eine Liste wie [{nr: 1, titel: "Region"}, …].', _id;
    end if;
    if exists (select 1 from jsonb_array_elements(coalesce(_d->'kapitel', '[]')) k
               where coalesce((k->>'nr') ~ '^([1-9]|10)$', false) is not true) then
      raise exception 'Darstellung %: Jedes Kapitel braucht nr von 1 bis 10.', _id;
    end if;
    if _d ? 'rollen' and jsonb_typeof(_d->'rollen') is distinct from 'array' then
      raise exception 'Darstellung %: rollen ist eine Liste wie [{id: pionier, titel: "Pionier"}, …].', _id;
    end if;
    if exists (select 1 from jsonb_array_elements(coalesce(_d->'rollen', '[]')) r
               where coalesce(r->>'id', '') !~ '^[a-z0-9][a-z0-9_-]*$') then
      raise exception 'Darstellung %: Jede Rolle braucht eine id aus Kleinbuchstaben, Ziffern, - oder _.', _id;
    end if;
    insert into public.library_presentations as t
      (id, title, epoch, period, levels, areas, chapters, roles, body, as_of)
    values (
      _id,
      coalesce(_d->>'titel', _id),
      _d->>'epoche',
      _d->>'zeitraum',
      coalesce(array(select jsonb_array_elements_text(_d->'ebenen')), '{}'),
      coalesce(_d->'bereiche', '{}'::jsonb),
      coalesce((select jsonb_agg(jsonb_build_object('nr', (k->>'nr')::integer, 'titel', k->>'titel')
                                 order by (k->>'nr')::integer)
                from jsonb_array_elements(_d->'kapitel') k), '[]'::jsonb),
      coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r->>'id', 'titel', coalesce(r->>'titel', r->>'id'),
                                                                     'text', r->>'text')))
                from jsonb_array_elements(_d->'rollen') r), '[]'::jsonb),
      _text_rein,
      (_d->>'stand')::date
    )
    on conflict (id) do update set
      title = excluded.title, epoch = excluded.epoch, period = excluded.period, levels = excluded.levels,
      areas = excluded.areas, chapters = excluded.chapters, roles = excluded.roles, body = excluded.body,
      as_of = excluded.as_of
    where (t.title, t.epoch, t.period, t.levels, t.areas, t.chapters, t.roles, t.body, t.as_of)
          is distinct from (excluded.title, excluded.epoch, excluded.period, excluded.levels,
                            excluded.areas, excluded.chapters, excluded.roles, excluded.body, excluded.as_of);
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
    if _d->>'jahr' is not null and (_d->>'jahr') !~ '^\d{4}$' then
      raise exception 'Bildtafel %: jahr ist das Aufnahmejahr als Zahl, etwa 1917.', _id;
    end if;
    if _d->>'datierung_herkunft' is not null and _d->>'datierung_herkunft' not in
       ('rueckseite', 'aufschrift', 'poststempel', 'beschriftung', 'dateiname', 'objekt', 'keine') then
      raise exception 'Bildtafel %: datierung_herkunft „%“ ist unbekannt (rueckseite, aufschrift, poststempel, beschriftung, dateiname, objekt, keine).',
        _id, _d->>'datierung_herkunft';
    end if;
    if _d->>'lage' is not null and _d->>'lage' not in ('front', 'ruhe', 'heimat', 'uebungsplatz', 'atelier', 'unbekannt') then
      raise exception 'Bildtafel %: lage „%“ ist unbekannt (front, ruhe, heimat, uebungsplatz, atelier, unbekannt).', _id, _d->>'lage';
    end if;
    if _d ? 'zeigt' and jsonb_typeof(_d->'zeigt') is distinct from 'array' then
      raise exception 'Bildtafel %: zeigt ist eine Liste wie [{thema: …, merkmal: "…"}].', _id;
    end if;
    if exists (select 1 from jsonb_array_elements(coalesce(_d->'zeigt', '[]')) z
               where coalesce(z->>'thema', '') = '' or coalesce(z->>'merkmal', '') = '') then
      raise exception 'Bildtafel %: Jeder Eintrag unter zeigt braucht thema und merkmal.', _id;
    end if;
    insert into public.library_plates as t
      (id, presentation_id, title, file, object, dating, reproduction, readable, not_readable, unit,
       rights, rights_status, year, dating_origin, situation, shows, as_of, body)
    values (
      _id, _d->>'darstellung', coalesce(_d->>'titel', _id), _d->>'datei', _d->>'objekt', _d->>'datierung',
      _d->>'reproduktion', _d->>'ablesbar', _d->>'nicht_ablesbar', _d->>'einheit', _d->>'rechte', _rechte,
      (_d->>'jahr')::integer, _d->>'datierung_herkunft', _d->>'lage',
      coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                  'thema', z->>'thema', 'merkmal', z->>'merkmal',
                  'anzahl', case when (z->>'anzahl') ~ '^\d+$' then (z->>'anzahl')::integer end)))
                from jsonb_array_elements(_d->'zeigt') z), '[]'::jsonb),
      (_d->>'stand')::date, _text_rein
    )
    on conflict (id) do update set
      presentation_id = excluded.presentation_id, title = excluded.title, file = excluded.file,
      object = excluded.object, dating = excluded.dating, reproduction = excluded.reproduction,
      readable = excluded.readable, not_readable = excluded.not_readable, unit = excluded.unit,
      rights = excluded.rights, rights_status = excluded.rights_status, year = excluded.year,
      dating_origin = excluded.dating_origin, situation = excluded.situation, shows = excluded.shows,
      as_of = excluded.as_of, body = excluded.body
    where (t.presentation_id, t.title, t.file, t.object, t.dating, t.reproduction, t.readable,
           t.not_readable, t.unit, t.rights, t.rights_status, t.year, t.dating_origin, t.situation, t.shows,
           t.as_of, t.body)
          is distinct from (excluded.presentation_id, excluded.title, excluded.file, excluded.object,
                            excluded.dating, excluded.reproduction, excluded.readable, excluded.not_readable,
                            excluded.unit, excluded.rights, excluded.rights_status, excluded.year,
                            excluded.dating_origin, excluded.situation, excluded.shows, excluded.as_of,
                            excluded.body);
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
      (id, presentation_id, area, statement, grade, grade_note, level, valid_for, keywords, topics, roles,
       status, as_of, body)
    values (
      _id, _darst.id, (_d->>'bereich')::smallint, coalesce(_d->>'kernsatz', ''), _d->>'stufe',
      _d->>'stufe_hinweis', _d->>'ebene', _d->>'gilt_stand',
      public.library_list(_d->'schlagworte'), public.library_list(_d->'thema'), public.library_list(_d->'rollen'),
      _status, (_d->>'stand')::date, _text_rein
    )
    on conflict (id) do update set
      presentation_id = excluded.presentation_id, area = excluded.area, statement = excluded.statement,
      grade = excluded.grade, grade_note = excluded.grade_note, level = excluded.level,
      valid_for = excluded.valid_for, keywords = excluded.keywords, topics = excluded.topics,
      roles = excluded.roles, status = excluded.status, as_of = excluded.as_of, body = excluded.body
    where (t.presentation_id, t.area, t.statement, t.grade, t.grade_note, t.level, t.valid_for,
           t.keywords, t.topics, t.roles, t.status, t.as_of, t.body)
          is distinct from (excluded.presentation_id, excluded.area, excluded.statement, excluded.grade,
                            excluded.grade_note, excluded.level, excluded.valid_for, excluded.keywords,
                            excluded.topics, excluded.roles, excluded.status, excluded.as_of, excluded.body);
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

  elsif _art = 'thema' then
    select * into _darst from public.library_presentations where id = _d->>'darstellung';
    if not found then
      raise exception 'Themenseite %: Darstellung „%“ gibt es nicht.', _id, _d->>'darstellung';
    end if;
    if _id !~ '^[A-Z][A-Z0-9]{1,9}-[a-z0-9][a-z0-9-]*$' or split_part(_id, '-', 1) <> _darst.id then
      raise exception 'Themenseite %: Die Kennung ist <Kürzel>-<name> in Kleinbuchstaben, etwa %-ausruestung-kopfbedeckung.', _id, _darst.id;
    end if;
    if coalesce(trim(_d->>'titel'), '') = '' then
      raise exception 'Themenseite %: titel fehlt.', _id;
    end if;
    if coalesce(_d->>'stand', '') = '' then
      raise exception 'Themenseite %: stand fehlt.', _id;
    end if;
    if coalesce((_d->>'kapitel') ~ '^([1-9]|10)$', false) is not true then
      raise exception 'Themenseite %: kapitel muss eine Zahl von 1 bis 10 sein.', _id;
    end if;
    _kapitel := (_d->>'kapitel')::integer;
    if jsonb_array_length(_darst.chapters) > 0
       and not exists (select 1 from jsonb_array_elements(_darst.chapters) k where (k->>'nr')::integer = _kapitel) then
      raise exception 'Themenseite %: Kapitel % steht nicht in der Darstellung %.', _id, _kapitel, _darst.id;
    end if;
    if _d ? 'baum' and _d->'baum' <> 'null'::jsonb and jsonb_typeof(_d->'baum') is distinct from 'array' then
      raise exception 'Themenseite %: baum ist eine Liste von Knoten.', _id;
    end if;
    -- Ein Zyklus in eltern liesse die Seite in keinem Kapitel erscheinen.
    _eltern := nullif(trim(coalesce(_d->>'eltern', '')), '');
    while _eltern is not null and _schritte < 50 loop
      if _eltern = _id then
        raise exception 'Themenseite %: eltern bilden einen Kreis – die Seite wäre ihre eigene Elternseite.', _id;
      end if;
      select parent_id into _eltern from public.library_topics where id = _eltern;
      _schritte := _schritte + 1;
    end loop;

    insert into public.library_topics as t
      (id, presentation_id, title, chapter, parent_id, sort_order, keywords, roles, cards, plates, tree,
       summary, body, as_of)
    values (
      _id, _darst.id, trim(_d->>'titel'), _kapitel, nullif(trim(coalesce(_d->>'eltern', '')), ''),
      coalesce(case when (_d->>'reihenfolge') ~ '^-?\d+$' then (_d->>'reihenfolge')::integer end, 0),
      public.library_list(_d->'suchbegriffe'), public.library_list(_d->'rollen'),
      public.library_list(_d->'karten'), public.library_list(_d->'tafeln'),
      case when jsonb_typeof(_d->'baum') = 'array' then _d->'baum' end,
      public.library_section(_text_rein, 'Kurzantwort'), _text_rein, (_d->>'stand')::date
    )
    on conflict (id) do update set
      presentation_id = excluded.presentation_id, title = excluded.title, chapter = excluded.chapter,
      parent_id = excluded.parent_id, sort_order = excluded.sort_order, keywords = excluded.keywords,
      roles = excluded.roles, cards = excluded.cards, plates = excluded.plates, tree = excluded.tree,
      summary = excluded.summary, body = excluded.body, as_of = excluded.as_of
    where (t.presentation_id, t.title, t.chapter, t.parent_id, t.sort_order, t.keywords, t.roles, t.cards,
           t.plates, t.tree, t.summary, t.body, t.as_of)
          is distinct from (excluded.presentation_id, excluded.title, excluded.chapter, excluded.parent_id,
                            excluded.sort_order, excluded.keywords, excluded.roles, excluded.cards,
                            excluded.plates, excluded.tree, excluded.summary, excluded.body, excluded.as_of);
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

  raise exception 'Unbekannte Art „%“ (darstellung, quelle, bild, thema, karte, seite).', _art;
end;
$$;

-- ── Suche ───────────────────────────────────────────────────────────────────
--
-- Reihenfolge der Treffer: zuerst eine Kennung, wenn genau danach gesucht
-- wurde („0042", „T27"), dann Themenseiten, dann Karten, Tafeln und Quellen.
-- Eine Themenseite, deren Suchbegriff passt, steht vor jeder anderen.
--
-- Zwei Wege zum Treffer: die deutsche Volltextsuche (Wortanfänge, gebeugte
-- Formen) und der gefaltete Vergleich (Schreibweisen, Zusammenschreibung).

drop function if exists public.library_search(text);

create or replace function public.library_search(_q text)
returns table (kind text, id text, presentation_id text, title text, summary text, rank real)
language sql
stable
set search_path to 'public'
as $$
  with q as (
    select public.library_query(_q) as tq,
           case when length(public.library_fold_lower(_q)) >= 3 then public.library_fold_lower(_q) else '' end as ganz,
           array(select public.library_fold_lower(w)
                   from regexp_split_to_table(coalesce(_q, ''), '[\s\-–/,;]+') w
                  where length(public.library_fold_lower(w)) >= 4) as woerter,
           case when trim(coalesce(_q, '')) ~ '^[A-Za-z0-9-]{2,}$' and trim(_q) ~ '[0-9]'
                then upper(trim(_q)) end as kennung
  ),
  themen as (
    select t.id, t.presentation_id, t.title, t.summary,
           setweight(to_tsvector('german', t.title), 'A')
           || setweight(to_tsvector('german', array_to_string(t.keywords, ' ')), 'A')
           || setweight(to_tsvector('german', coalesce(t.body, '')), 'C') as doc,
           public.library_fold_lower(t.title) as f_titel,
           array(select public.library_fold_lower(k) from unnest(t.keywords) k) as f_begriffe,
           public.library_fold_lower(t.title || ' ' || array_to_string(t.keywords, ' ') || ' ' || coalesce(t.body, '')) as f_alles
    from public.library_topics t
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
                where f.card_id = c.id), '')), 'B') as doc,
           public.library_fold_lower(c.statement || ' ' || array_to_string(c.keywords, ' ')) as f_alles
    from public.library_cards c
  ),
  quellen as (
    select s.id, s.title,
           setweight(to_tsvector('german', s.title), 'A')
           || setweight(to_tsvector('german', concat_ws(' ', s.kind, s.place_publisher, s.year, s.note,
                                                        s.evaluated, s.level, s.body)), 'C') as doc,
           public.library_fold_lower(s.title) as f_alles
    from public.library_sources s
  ),
  tafeln as (
    select p.id, p.presentation_id, p.title,
           setweight(to_tsvector('german', p.title), 'A')
           || setweight(to_tsvector('german', concat_ws(' ', p.object, p.dating, p.readable, p.not_readable,
                                                        p.unit, p.body)), 'B') as doc,
           public.library_fold_lower(concat_ws(' ', p.title, p.readable, p.object)) as f_alles
    from public.library_plates p
  ),
  treffer as (
    select 'topic'::text as kind, t.id, t.presentation_id, t.title, t.summary,
           (case when q.ganz <> '' and q.ganz = any (t.f_begriffe) then 1000
                 when q.ganz <> '' and exists (select 1 from unnest(t.f_begriffe) b where b like '%' || q.ganz || '%') then 800
                 when q.ganz <> '' and t.f_titel like '%' || q.ganz || '%' then 500
                 else 0 end
            + coalesce(ts_rank(t.doc, q.tq), 0) * 10)::real as rank,
           false as kennung
    from themen t, q
    where (q.tq is not null and t.doc @@ q.tq)
       or (q.ganz <> '' and exists (select 1 from unnest(t.f_begriffe) b where b like '%' || q.ganz || '%'))
       or (q.ganz <> '' and t.f_titel like '%' || q.ganz || '%')
       or (cardinality(q.woerter) > 0
           and not exists (select 1 from unnest(q.woerter) w where t.f_alles not like '%' || w || '%'))
    union all
    select 'card', k.id, k.presentation_id, k.statement, null,
           (coalesce(ts_rank(k.doc, q.tq), 0)
            + case when q.ganz <> '' and k.f_alles like '%' || q.ganz || '%' then 0.5 else 0 end)::real,
           q.kennung is not null and k.id like '%' || q.kennung || '%'
    from karten k, q
    where (q.tq is not null and k.doc @@ q.tq)
       or (q.kennung is not null and k.id like '%' || q.kennung || '%')
       or (length(q.ganz) >= 4 and k.f_alles like '%' || q.ganz || '%')
    union all
    select 'plate', t.id, t.presentation_id, t.title, null,
           (coalesce(ts_rank(t.doc, q.tq), 0)
            + case when q.ganz <> '' and t.f_alles like '%' || q.ganz || '%' then 0.5 else 0 end)::real,
           q.kennung is not null and t.id like '%' || q.kennung || '%'
    from tafeln t, q
    where (q.tq is not null and t.doc @@ q.tq)
       or (q.kennung is not null and t.id like '%' || q.kennung || '%')
       or (length(q.ganz) >= 4 and t.f_alles like '%' || q.ganz || '%')
    union all
    select 'source', s.id, null, s.title, null,
           (coalesce(ts_rank(s.doc, q.tq), 0)
            + case when q.ganz <> '' and s.f_alles like '%' || q.ganz || '%' then 0.5 else 0 end)::real,
           q.kennung is not null and upper(s.id) = q.kennung
    from quellen s, q
    where (q.tq is not null and s.doc @@ q.tq)
       or (q.kennung is not null and upper(s.id) = q.kennung)
       or (length(q.ganz) >= 4 and s.f_alles like '%' || q.ganz || '%')
  )
  select kind, id, presentation_id, title, summary, rank
  from treffer
  order by kennung desc, (kind = 'topic') desc, rank desc, id
  limit 60
$$;

-- ── Wer die Funktionen aufrufen darf ────────────────────────────────────────

revoke all on function public.library_list(jsonb) from public, anon;
grant execute on function public.library_list(jsonb) to authenticated, service_role;
revoke all on function public.library_section(text, text) from public, anon;
grant execute on function public.library_section(text, text) to authenticated, service_role;
revoke all on function public.library_fold(text) from public, anon;
grant execute on function public.library_fold(text) to authenticated, service_role;
revoke all on function public.library_fold_lower(text) from public, anon;
grant execute on function public.library_fold_lower(text) to authenticated, service_role;
revoke all on function public.library_import(text, jsonb, text) from public, anon;
grant execute on function public.library_import(text, jsonb, text) to authenticated, service_role;
revoke all on function public.library_search(text) from public, anon;
grant execute on function public.library_search(text) to authenticated, service_role;
