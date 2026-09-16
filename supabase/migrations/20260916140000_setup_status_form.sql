-- Der Einrichtungsassistent muss wissen, welche Form der Verein hat
--
-- Sonst fragt er eine Interessengemeinschaft nach Vorstand und
-- Registernummer und zeigt ihr Gelb für etwas, das es bei ihr nicht gibt.
--
-- Nur die eine Zeile mehr; der Rest der Abfrage ist unverändert.

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
        'org_form', s.org_form,
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

  if ergebnis -> 'verein' ->> 'name' = 'Mein Verein e. V.' then
    ergebnis := jsonb_set(ergebnis, '{verein,name}', 'null'::jsonb);
  end if;

  return ergebnis;
end;
$$;

revoke all on function public.setup_status() from public, anon;
grant execute on function public.setup_status() to authenticated, service_role;
