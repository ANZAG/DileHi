-- Wissensbibliothek: Darstellungsrahmen, Gruppen, Bild der Darstellung.
--
-- Umsetzung der Entscheidungen von Z0 vom 10.11.2026 (E3, E5, E6, E7, E8):
--
--   Themenseite  rahmen   – was die Gruppe je nach Lage trägt, mit Status
--                           pflicht | bevorzugt | variante | offen |
--                           nicht-empfohlen; daraus baut sich die Prüfliste.
--                           Eine Prüfliste mit „Mantel M15“ allein behauptete
--                           eine Einheitlichkeit, die es nicht gab.
--                gruppe   – Gruppe innerhalb des Kapitels („Kopf und
--                           Oberkörper“), für die Kapitelübersicht
--   Darstellung  kapitel  – je Kapitel zusätzlich status (bereit, entwurf,
--                           recherche, nicht-relevant) und text
--                bild     – Bildpfad für die Kachel auf der Startseite
--   Seite        haeufig  – Liste „Häufig gesucht“ (seiten/start.md)
--
-- Standard: docs/wissensbibliothek-standard.md. Wiederholbar.

alter table public.library_topics
  add column if not exists frame jsonb,
  add column if not exists grp text;

comment on column public.library_topics.frame is
  '[{lage, gegenstand, status, text, karten[], rollen[], stufe}] – der Darstellungsrahmen (Kopfdaten: rahmen)';
comment on column public.library_topics.grp is 'Gruppe im Kapitel (Kopfdaten: gruppe)';

alter table public.library_presentations
  add column if not exists image text;

comment on column public.library_presentations.image is 'Bildpfad wie in library_images (Kopfdaten: bild)';

alter table public.library_pages
  add column if not exists frequent text[] not null default '{}';

comment on column public.library_pages.frequent is 'Häufig gesucht (Kopfdaten: haeufig), nur auf der Seite start';

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
    if exists (select 1 from jsonb_array_elements(coalesce(_d->'kapitel', '[]')) k
               where k->>'status' is not null and k->>'status' not in ('bereit', 'entwurf', 'recherche', 'nicht-relevant')) then
      raise exception 'Darstellung %: Kapitel-status ist bereit, entwurf, recherche oder nicht-relevant.', _id;
    end if;
    if _d ? 'rollen' and jsonb_typeof(_d->'rollen') is distinct from 'array' then
      raise exception 'Darstellung %: rollen ist eine Liste wie [{id: pionier, titel: "Pionier"}, …].', _id;
    end if;
    if exists (select 1 from jsonb_array_elements(coalesce(_d->'rollen', '[]')) r
               where coalesce(r->>'id', '') !~ '^[a-z0-9][a-z0-9_-]*$') then
      raise exception 'Darstellung %: Jede Rolle braucht eine id aus Kleinbuchstaben, Ziffern, - oder _.', _id;
    end if;
    insert into public.library_presentations as t
      (id, title, epoch, period, levels, areas, chapters, roles, image, body, as_of)
    values (
      _id,
      coalesce(_d->>'titel', _id),
      _d->>'epoche',
      _d->>'zeitraum',
      coalesce(array(select jsonb_array_elements_text(_d->'ebenen')), '{}'),
      coalesce(_d->'bereiche', '{}'::jsonb),
      coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('nr', (k->>'nr')::integer, 'titel', k->>'titel',
                                                                     'status', k->>'status', 'text', k->>'text'))
                                 order by (k->>'nr')::integer)
                from jsonb_array_elements(_d->'kapitel') k), '[]'::jsonb),
      coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r->>'id', 'titel', coalesce(r->>'titel', r->>'id'),
                                                                     'text', r->>'text')))
                from jsonb_array_elements(_d->'rollen') r), '[]'::jsonb),
      nullif(trim(coalesce(_d->>'bild', '')), ''),
      _text_rein,
      (_d->>'stand')::date
    )
    on conflict (id) do update set
      title = excluded.title, epoch = excluded.epoch, period = excluded.period, levels = excluded.levels,
      areas = excluded.areas, chapters = excluded.chapters, roles = excluded.roles, image = excluded.image,
      body = excluded.body, as_of = excluded.as_of
    where (t.title, t.epoch, t.period, t.levels, t.areas, t.chapters, t.roles, t.image, t.body, t.as_of)
          is distinct from (excluded.title, excluded.epoch, excluded.period, excluded.levels,
                            excluded.areas, excluded.chapters, excluded.roles, excluded.image, excluded.body,
                            excluded.as_of);
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
    if _d ? 'rahmen' and _d->'rahmen' <> 'null'::jsonb and jsonb_typeof(_d->'rahmen') is distinct from 'array' then
      raise exception 'Themenseite %: rahmen ist eine Liste von Zeilen mit lage, gegenstand und status.', _id;
    end if;
    if exists (select 1 from jsonb_array_elements(case when jsonb_typeof(_d->'rahmen') = 'array' then _d->'rahmen' else '[]' end) r
               where coalesce(trim(r->>'gegenstand'), '') = '') then
      raise exception 'Themenseite %: Jede Zeile im rahmen braucht einen gegenstand.', _id;
    end if;
    if exists (select 1 from jsonb_array_elements(case when jsonb_typeof(_d->'rahmen') = 'array' then _d->'rahmen' else '[]' end) r
               where coalesce(r->>'status', '') not in ('pflicht', 'bevorzugt', 'variante', 'offen', 'nicht-empfohlen')) then
      raise exception 'Themenseite %: status im rahmen ist pflicht, bevorzugt, variante, offen oder nicht-empfohlen.', _id;
    end if;
    if exists (select 1 from jsonb_array_elements(case when jsonb_typeof(_d->'rahmen') = 'array' then _d->'rahmen' else '[]' end) r
               where r->>'stufe' is not null and r->>'stufe' not in ('Q', 'F', 'A')) then
      raise exception 'Themenseite %: stufe im rahmen ist Q, F oder A.', _id;
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
      (id, presentation_id, title, chapter, parent_id, sort_order, grp, keywords, roles, cards, plates, tree,
       frame, summary, body, as_of)
    values (
      _id, _darst.id, trim(_d->>'titel'), _kapitel, nullif(trim(coalesce(_d->>'eltern', '')), ''),
      coalesce(case when (_d->>'reihenfolge') ~ '^-?\d+$' then (_d->>'reihenfolge')::integer end, 0),
      nullif(trim(coalesce(_d->>'gruppe', '')), ''),
      public.library_list(_d->'suchbegriffe'), public.library_list(_d->'rollen'),
      public.library_list(_d->'karten'), public.library_list(_d->'tafeln'),
      case when jsonb_typeof(_d->'baum') = 'array' then _d->'baum' end,
      case when jsonb_typeof(_d->'rahmen') = 'array' then (
        select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                 'lage', nullif(trim(coalesce(r->>'lage', '')), ''),
                 'gegenstand', trim(r->>'gegenstand'),
                 'status', r->>'status',
                 'text', nullif(trim(coalesce(r->>'text', '')), ''),
                 'karten', to_jsonb(public.library_list(r->'karten')),
                 'rollen', to_jsonb(public.library_list(r->'rollen')),
                 'stufe', r->>'stufe')) order by n)
        from jsonb_array_elements(_d->'rahmen') with ordinality as x(r, n)) end,
      public.library_section(_text_rein, 'Kurzantwort'), _text_rein, (_d->>'stand')::date
    )
    on conflict (id) do update set
      presentation_id = excluded.presentation_id, title = excluded.title, chapter = excluded.chapter,
      parent_id = excluded.parent_id, sort_order = excluded.sort_order, grp = excluded.grp,
      keywords = excluded.keywords, roles = excluded.roles, cards = excluded.cards, plates = excluded.plates,
      tree = excluded.tree, frame = excluded.frame, summary = excluded.summary, body = excluded.body,
      as_of = excluded.as_of
    where (t.presentation_id, t.title, t.chapter, t.parent_id, t.sort_order, t.grp, t.keywords, t.roles, t.cards,
           t.plates, t.tree, t.frame, t.summary, t.body, t.as_of)
          is distinct from (excluded.presentation_id, excluded.title, excluded.chapter, excluded.parent_id,
                            excluded.sort_order, excluded.grp, excluded.keywords, excluded.roles, excluded.cards,
                            excluded.plates, excluded.tree, excluded.frame, excluded.summary, excluded.body,
                            excluded.as_of);
    return _id;

  elsif _art = 'seite' then
    _id := coalesce(_id, _d->>'slug');
    if _id is null then
      raise exception 'Seite: Die Kopfdaten haben keine id.';
    end if;
    insert into public.library_pages as t (slug, title, body, sort_order, frequent)
    values (_id, coalesce(_d->>'titel', _id), _text_rein, coalesce((_d->>'reihenfolge')::integer, 0),
            public.library_list(_d->'haeufig'))
    on conflict (slug) do update set title = excluded.title, body = excluded.body, sort_order = excluded.sort_order,
      frequent = excluded.frequent
    where (t.title, t.body, t.sort_order, t.frequent)
          is distinct from (excluded.title, excluded.body, excluded.sort_order, excluded.frequent);
    return _id;
  end if;

  raise exception 'Unbekannte Art „%“ (darstellung, quelle, bild, thema, karte, seite).', _art;
end;
$$;

revoke all on function public.library_import(text, jsonb, text) from public, anon;
grant execute on function public.library_import(text, jsonb, text) to authenticated, service_role;
