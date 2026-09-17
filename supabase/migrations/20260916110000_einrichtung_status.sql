-- Was in dieser Installation schon steht: die Auskunft aus der Datenbank
--
-- Der Einrichtungsassistent soll einem Verein sagen, was fehlt, bevor er
-- darüber stolpert. Die Hälfte der Antwort steht in der Datenbank: Sind die
-- Migrationen eingespielt? Gibt es einen ersten Zugang? Sind die Vereinsdaten
-- ausgefüllt, aus denen Impressum, Mails und der Aufnahmeantrag ihre Angaben
-- ziehen? Steht hinter den Links im Fuss eine Seite?
--
-- Alles in einer Abfrage, damit es ein Bild aus einem Moment ist und nicht
-- vier Momente, die sich widersprechen.
--
-- `supabase_migrations.schema_migrations` liegt in einem Schema, das PostgREST
-- nicht ausliefert – ohne diese Funktion käme die Oberfläche nicht heran. Das
-- ist auch der Grund für SECURITY DEFINER, und deshalb steht die
-- Rechteprüfung gleich in der ersten Zeile.

create or replace function public.setup_status()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  ergebnis jsonb;
begin
  if not public.has_permission(auth.uid(), 'system.settings') then
    raise exception 'Keine Berechtigung für die Einstellungen';
  end if;

  select jsonb_build_object(
    'migrationen', (
      select coalesce(jsonb_agg(version order by version), '[]'::jsonb)
      from supabase_migrations.schema_migrations
    ),
    'rollen_vergeben', (select count(*) from public.user_roles),
    'mitglieder', (select count(*) from public.profiles),
    'module', (select count(*) from public.app_modules),
    'verein', (
      select jsonb_build_object(
        'name', nullif(btrim(coalesce(s.org_name, '')), ''),
        'anschrift', nullif(btrim(coalesce(s.org_street, '')), '') is not null
                 and nullif(btrim(coalesce(s.org_zip, '')), '') is not null
                 and nullif(btrim(coalesce(s.org_city, '')), '') is not null,
        'email', nullif(btrim(coalesce(s.org_email, '')), ''),
        'web', nullif(btrim(coalesce(s.website_url, '')), ''),
        'vorstand', nullif(btrim(coalesce(s.board_members, '')), '') is not null,
        'register', nullif(btrim(coalesce(s.register_court, '')), '') is not null
                and nullif(btrim(coalesce(s.register_number, '')), '') is not null,
        'mail_weg', s.mail_transport,
        'absender', nullif(btrim(coalesce(s.mail_from_address, '')), ''),
        'ablage', s.file_storage,
        'sharepoint_site', nullif(btrim(coalesce(s.sharepoint_site_url, '')), '')
      )
      from public.app_settings s
      limit 1
    ),
    'seiten', (
      select jsonb_object_agg(slug, is_published)
      from public.site_pages
      where slug in ('startseite', 'impressum', 'datenschutz')
    ),
    'menue', (
      select jsonb_build_object(
        'kopf', count(*) filter (where area = 'header'),
        'fuss', count(*) filter (where area = 'footer_legal')
      )
      from public.site_menu
      where is_visible
    )
  )
  into ergebnis;

  -- Ein Standardname ist kein ausgefüllter Name: „Mein Verein e. V." steht so
  -- im Ausgangsstand. Wer ihn stehen lässt, hat die Vereinsdaten nicht
  -- angefasst, und genau das soll der Assistent sagen.
  if ergebnis -> 'verein' ->> 'name' = 'Mein Verein e. V.' then
    ergebnis := jsonb_set(ergebnis, '{verein,name}', 'null'::jsonb);
  end if;

  return ergebnis;
end;
$$;

revoke all on function public.setup_status() from public, anon;
grant execute on function public.setup_status() to authenticated, service_role;
