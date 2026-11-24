-- Die öffentliche Seite auf Englisch und Französisch.
--
-- Deutsch bleibt das Original und liegt weiter in site_pages, site_menu und
-- app_settings. Hier kommen nur die Übersetzungen dazu – je Seite und Sprache
-- eine Zeile mit Titel, Suchmaschinenangaben und einer übersetzten Kopie der
-- Bausteine. Fehlt die Zeile, zeigt die Seite das Deutsche.
--
-- Zwei Merker je Zeile:
--   is_machine  – die Fassung stammt aus der Maschine (DeepL) und wurde seither
--                 nicht von Hand gesichert.
--   reviewed_at – jemand hat sie durchgesehen und für gut befunden.
--   is_stale    – das deutsche Original wurde danach geändert. Das setzt die
--                 Datenbank selbst (Trigger unten), damit es nicht davon
--                 abhängt, über welchen Weg die Seite geändert wurde.
--
-- Mitgliederbereich, Anmeldung und E-Mails bleiben deutsch.

create table public.site_page_translations (
  page_id uuid not null references public.site_pages(id) on delete cascade,
  lang text not null check (lang in ('en', 'fr')),
  title text not null,
  content jsonb,
  seo_title text,
  seo_description text,
  is_machine boolean not null default false,
  is_stale boolean not null default false,
  reviewed_at timestamptz,
  reviewed_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (page_id, lang)
);

comment on table public.site_page_translations is
  'Übersetzungen der Baukastenseiten (en, fr). Deutsch steht in site_pages.';

-- Die kurzen Texte ausserhalb der Seiten: Menüpunkte und was aus den
-- Vereinsangaben im Kopf und Fuss jeder öffentlichen Seite steht.
--   kind = 'menu'      ref = site_menu.id
--   kind = 'settings'  ref = Spalte in app_settings
-- Eine Tabelle für beides, weil es dieselbe Sache ist: ein Schlüssel, ein
-- kurzer Text je Sprache.
create table public.site_text_translations (
  kind text not null check (kind in ('menu', 'settings')),
  ref text not null,
  lang text not null check (lang in ('en', 'fr')),
  value text not null,
  is_machine boolean not null default false,
  is_stale boolean not null default false,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (kind, ref, lang),
  -- Nur was öffentlich im Rahmen der Seite steht. Eine Liste und kein freier
  -- Text, damit hier niemand Spalten einträgt, die nicht öffentlich sind.
  constraint site_text_translations_ref_check check (
    kind <> 'settings'
    or ref in ('org_tagline', 'seo_description', 'footer_navigation_label', 'footer_legal_label')
  )
);

comment on table public.site_text_translations is
  'Übersetzungen der Menüpunkte und der öffentlichen Texte aus den Vereinsangaben (en, fr).';

-- ── Wer darf was ────────────────────────────────────────────────────────────

alter table public.site_page_translations enable row level security;
alter table public.site_text_translations enable row level security;

-- Lesen wie die Seite selbst: Besucher nur, was veröffentlicht ist. Die
-- Unterabfrage läuft mit den Rechten des Lesers – was site_pages ihm nicht
-- zeigt, zeigt auch diese Tabelle nicht.
create policy "Read translations of published pages" on public.site_page_translations
  for select to anon, authenticated
  using (
    exists (select 1 from public.site_pages p where p.id = page_id and p.is_published)
    or public.has_permission(auth.uid(), 'site.content_edit')
    or public.has_permission(auth.uid(), 'site.layout_edit')
  );

-- Schreiben, wer auch die Seite bearbeiten darf (Policy „Edit pages").
create policy "Edit translations" on public.site_page_translations
  for all to authenticated
  using (public.has_permission(auth.uid(), 'site.content_edit') or public.has_permission(auth.uid(), 'site.layout_edit'))
  with check (public.has_permission(auth.uid(), 'site.content_edit') or public.has_permission(auth.uid(), 'site.layout_edit'));

create policy "Read text translations" on public.site_text_translations
  for select to anon, authenticated
  using (true);

-- Menü und Rahmen gehören zum Aufbau der Seite (Policy „Manage menu").
create policy "Manage text translations" on public.site_text_translations
  for all to authenticated
  using (public.has_permission(auth.uid(), 'site.layout_edit'))
  with check (public.has_permission(auth.uid(), 'site.layout_edit'));

grant select on public.site_page_translations, public.site_text_translations to anon;
grant select, insert, update, delete on public.site_page_translations, public.site_text_translations to authenticated;
grant all on public.site_page_translations, public.site_text_translations to service_role;

-- ── Stand halten ────────────────────────────────────────────────────────────

create or replace function public.site_translations_touch()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger site_page_translations_touch_trg
  before update on public.site_page_translations
  for each row execute function public.site_translations_touch();

create trigger site_text_translations_touch_trg
  before update on public.site_text_translations
  for each row execute function public.site_translations_touch();

-- Ändert sich das Deutsche, sind die Übersetzungen nicht mehr auf dem Stand.
-- Nur bei dem, was übersetzt wird: Wer bloss den Entwurf sichert oder die
-- Seite zurückzieht, macht keine Übersetzung alt.
--
-- Mit den Rechten des Eigentümers, weil die Zeilen auch dann markiert werden
-- müssen, wenn jemand die Seite ändert, der die Übersetzungen nicht anfassen
-- darf (Dienstschlüssel, künftige Rollen).
create or replace function public.site_pages_mark_translations_stale()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.title is distinct from old.title
     or new.content is distinct from old.content
     or new.seo_title is distinct from old.seo_title
     or new.seo_description is distinct from old.seo_description then
    update public.site_page_translations set is_stale = true
    where page_id = new.id and not is_stale;
  end if;
  return null;
end;
$$;

create trigger site_pages_translations_stale_trg
  after update on public.site_pages
  for each row execute function public.site_pages_mark_translations_stale();

create or replace function public.site_menu_translations_sync()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    -- Kein Fremdschlüssel (ref ist Text, für zwei Arten von Zielen), also
    -- räumt der Trigger auf.
    delete from public.site_text_translations where kind = 'menu' and ref = old.id::text;
    return null;
  end if;
  if new.label is distinct from old.label then
    update public.site_text_translations set is_stale = true
    where kind = 'menu' and ref = new.id::text and not is_stale;
  end if;
  return null;
end;
$$;

create trigger site_menu_translations_sync_trg
  after update or delete on public.site_menu
  for each row execute function public.site_menu_translations_sync();

create or replace function public.app_settings_mark_translations_stale()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.site_text_translations t set is_stale = true
  where t.kind = 'settings' and not t.is_stale
    and (
      (t.ref = 'org_tagline' and new.org_tagline is distinct from old.org_tagline)
      or (t.ref = 'seo_description' and new.seo_description is distinct from old.seo_description)
      or (t.ref = 'footer_navigation_label' and new.footer_navigation_label is distinct from old.footer_navigation_label)
      or (t.ref = 'footer_legal_label' and new.footer_legal_label is distinct from old.footer_legal_label)
    );
  return null;
end;
$$;

create trigger app_settings_translations_stale_trg
  after update on public.app_settings
  for each row execute function public.app_settings_mark_translations_stale();

revoke all on function public.site_pages_mark_translations_stale() from public, anon, authenticated;
revoke all on function public.site_menu_translations_sync() from public, anon, authenticated;
revoke all on function public.app_settings_mark_translations_stale() from public, anon, authenticated;

-- ── Welche Sprachen die Seite anbietet ──────────────────────────────────────

-- Eine Sprache gibt es, sobald eine veröffentlichte Seite in ihr vorliegt.
-- Danach richtet sich, ob die Sprachwahl im Kopf erscheint und ob ein
-- Besucher mit englischem Browser dorthin geführt wird. Eine Installation,
-- die nichts übersetzt, bleibt damit einsprachig, ohne dass jemand etwas
-- einstellen muss.
create or replace function public.site_languages()
returns text[]
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(array_agg(distinct t.lang order by t.lang), '{}')
  from public.site_page_translations t
  join public.site_pages p on p.id = t.page_id and p.is_published;
$$;

grant execute on function public.site_languages() to anon, authenticated, service_role;
