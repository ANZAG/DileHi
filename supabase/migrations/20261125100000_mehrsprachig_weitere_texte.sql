-- Was auf den übersetzten Seiten noch deutsch dastand, obwohl es in der
-- Verwaltung gepflegt wird: die Quellen einer Darstellung, die Aufzählung „Für
-- Besucher", die Beschreibungen der Seiten- und Galeriebilder.
--
-- Diese Texte gehören zu keiner Seite – sie liegen in eigenen Tabellen und
-- erscheinen über Bausteine. Sie bekommen deshalb keine eigene
-- Übersetzungstabelle, sondern weitere Arten in site_text_translations: ein
-- Schlüssel, ein kurzer Text je Sprache, wie bei Menüpunkten.
--
--   kind = 'source'   ref = epoch_sources.id        (text)
--   kind = 'visitor'  ref = epoch_visitor_items.id  (text)
--   kind = 'image'    ref = site_images.slot        (alt_text)
--   kind = 'gallery'  ref = gallery_images.id       (alt_text)
--
-- Fehlt die Übersetzung, steht weiter das Deutsche da. Bei Quellen ist das
-- oft richtig: Eine Literaturangabe übersetzt man nicht.

alter table public.site_text_translations
  drop constraint site_text_translations_kind_check;
alter table public.site_text_translations
  add constraint site_text_translations_kind_check
  check (kind in ('menu', 'settings', 'source', 'visitor', 'image', 'gallery'));

comment on table public.site_text_translations is
  'Übersetzungen der kurzen öffentlichen Texte ausserhalb der Seiten (en, fr): Menüpunkte, Vereinsangaben, Quellen, Besucherhinweise, Bildbeschreibungen.';

-- ── Wer darf was ────────────────────────────────────────────────────────────

-- Wer das Deutsche pflegt, pflegt auch die Übersetzung. Bisher brauchte es
-- für alles das Recht am Seitenaufbau; wer nur die Quellen oder die Galerie
-- betreut, hätte seine eigenen Texte nicht übersetzen können.
create or replace function public.site_text_translation_editable(_kind text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.has_permission(auth.uid(), 'site.layout_edit')
    or (_kind = 'source' and public.has_permission(auth.uid(), 'epoch_sources.manage'))
    or (_kind = 'visitor' and public.has_permission(auth.uid(), 'visitor_highlights.manage'))
    or (_kind = 'image' and public.has_permission(auth.uid(), 'site_images.manage'))
    or (_kind = 'gallery' and public.has_permission(auth.uid(), 'gallery.manage'));
$$;

revoke all on function public.site_text_translation_editable(text) from public, anon;
grant execute on function public.site_text_translation_editable(text) to authenticated, service_role;

drop policy "Manage text translations" on public.site_text_translations;
create policy "Manage text translations" on public.site_text_translations
  for all to authenticated
  using (public.site_text_translation_editable(kind))
  with check (public.site_text_translation_editable(kind));

-- ── Stand halten ────────────────────────────────────────────────────────────

-- Ein Trigger für alle vier Tabellen. Die Argumente sagen, um welche Art es
-- geht, in welcher Spalte der Schlüssel steht und in welcher der Text:
-- Ändert sich der deutsche Text, ist die Übersetzung veraltet; verschwindet
-- die Zeile, verschwinden ihre Übersetzungen (ref ist Text, es gibt keinen
-- Fremdschlüssel, der das täte).
create or replace function public.site_text_translations_follow()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _kind text := tg_argv[0];
  _alt jsonb := to_jsonb(old);
  _neu jsonb;
begin
  if tg_op = 'DELETE' then
    delete from public.site_text_translations where kind = _kind and ref = _alt ->> tg_argv[1];
    return null;
  end if;
  _neu := to_jsonb(new);
  if (_neu ->> tg_argv[2]) is distinct from (_alt ->> tg_argv[2]) then
    update public.site_text_translations set is_stale = true
    where kind = _kind and ref = _neu ->> tg_argv[1] and not is_stale;
  end if;
  return null;
end;
$$;

revoke all on function public.site_text_translations_follow() from public, anon, authenticated;

create trigger epoch_sources_translations_trg
  after update or delete on public.epoch_sources
  for each row execute function public.site_text_translations_follow('source', 'id', 'text');

create trigger epoch_visitor_items_translations_trg
  after update or delete on public.epoch_visitor_items
  for each row execute function public.site_text_translations_follow('visitor', 'id', 'text');

create trigger site_images_translations_trg
  after update or delete on public.site_images
  for each row execute function public.site_text_translations_follow('image', 'slot', 'alt_text');

create trigger gallery_images_translations_trg
  after update or delete on public.gallery_images
  for each row execute function public.site_text_translations_follow('gallery', 'id', 'alt_text');
