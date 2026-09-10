# Der Ausgangsstand: eine Abfrage, eine Datei

Eine leere Datenbank soll mit **einem** Knopfdruck zu einer lauffähigen
DING-Installation werden. Dafür braucht es einen Ausgangsstand, der alles
enthält — und zwar aus **einem** Moment.

## Warum aus einem Moment

Beim ersten Anlauf kamen die vier Teile aus zwei verschiedenen Momenten: der
Aufbau von 18:55, die Rechte von 22:42. Dazwischen liefen zwei Migrationen. Das
Ergebnis wäre eine Datei gewesen, die Rechte auf eine Funktion vergibt, die im
selben Stand gar nicht angelegt wird — und die beim Einspielen mittendrin
abbricht.

Ein Abzug ist eine Momentaufnahme. Vier Momentaufnahmen aus vier Momenten sind
keine.

## Vorher: die letzten Migrationen einspielen

Damit der Ausgangsstand vollständig ist und danach **nichts** mehr nachkommt:

```
20260909350000_roles_english.sql
20260909360000_role_help.sql
20260909370000_persona_names.sql
20260909380000_setup_state.sql
```

Erst danach exportieren. Sonst fehlen dem Ausgangsstand die freien Rollen, die
Namen an den Darstellungen und die Einrichtungsseite — also genau das, was die
Installation braucht.

## Die Abfrage

Eine einzige, im SQL-Editor der **alten** Datenbank. Sie gibt eine Zelle
zurück; deren Inhalt ist die fertige Datei. Sie liest nur und ändert nichts.

```sql
SELECT
  '-- DING: Ausgangsstand, erzeugt am ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || E'\n' ||
  '-- Eine leere Datenbank wird damit zu einer lauffaehigen Installation.' || E'\n' ||
  'SET check_function_bodies = off;' || E'\n\n' ||

  -- 1. Aufbau: Typen, Tabellen, Bedingungen, Indizes, Funktionen, Trigger, Regeln
  public.backup_schema_ddl() || E'\n\n' ||

  -- 1a. Trigger ausserhalb von public, die auf unsere Funktionen zeigen.
  --     backup_schema_ddl() sieht nur public. Im ersten Abzug fehlte deshalb
  --     on_auth_user_created, und neue Konten bekamen kein Profil.
  E'-- == Trigger ausserhalb von public ==\n' || COALESCE((
    SELECT string_agg(
             format('DROP TRIGGER IF EXISTS %I ON %s;', t.tgname, t.tgrelid::regclass) || E'\n' ||
             pg_get_triggerdef(t.oid) || ';', E'\n' ORDER BY t.tgname)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal
      AND c.relnamespace::regnamespace::text <> 'public'
      AND p.pronamespace::regnamespace::text = 'public'
  ), '') || E'\n\n' ||

  -- 2. Rechte
  E'-- == Rechte ==\n' || COALESCE((
    SELECT string_agg(zeile, E'\n' ORDER BY rang, zeile) FROM (
      SELECT 0 AS rang,
             format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC;', p.oid::regprocedure::text) AS zeile
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prokind = 'f'
      UNION ALL
      SELECT 1,
             format('GRANT EXECUTE ON FUNCTION public.%s TO %s;',
                    p.oid::regprocedure::text,
                    string_agg(DISTINCT a.grantee::regrole::text, ', '))
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
      WHERE n.nspname = 'public' AND p.prokind = 'f'
        AND a.privilege_type = 'EXECUTE' AND a.grantee <> 0
        AND a.grantee::regrole::text IN ('anon','authenticated','service_role')
      GROUP BY p.oid
      UNION ALL
      SELECT 2,
             format('GRANT %s ON TABLE public.%I TO %s;',
                    string_agg(DISTINCT a.privilege_type, ', '), c.relname,
                    a.grantee::regrole::text)
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND a.grantee::regrole::text IN ('anon','authenticated','service_role')
      GROUP BY c.relname, a.grantee
    ) t
  ), '') || E'\n\n' ||

  -- 3. Ablagen für Bilder und Dokumente
  E'-- == Speicher ==\n' || COALESCE((
    SELECT string_agg(zeile, E'\n' ORDER BY rang, zeile) FROM (
      SELECT 1 AS rang,
             format('INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES (%L, %L, %L, %s, %s) ON CONFLICT (id) DO NOTHING;',
                    id, name, public,
                    COALESCE(file_size_limit::text, 'NULL'),
                    COALESCE(quote_literal(allowed_mime_types::text) || '::text[]', 'NULL')) AS zeile
      FROM storage.buckets
      UNION ALL
      SELECT 2,
             format('CREATE POLICY %I ON storage.objects AS %s FOR %s TO %s%s%s;',
                    policyname, permissive, cmd, array_to_string(roles, ', '),
                    COALESCE(' USING (' || qual || ')', ''),
                    COALESCE(' WITH CHECK (' || with_check || ')', ''))
      FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
    ) t
  ), '') || E'\n\n' ||

  -- 4. Startdaten. Reihenfolge zählt: Kataloge vor dem, was auf sie zeigt.
  E'-- == Startdaten ==\n' || COALESCE((
    SELECT string_agg(anweisung, E'\n' ORDER BY rang, anweisung) FROM (
      SELECT q.rang,
             format('INSERT INTO public.%I (%s) VALUES (%s) ON CONFLICT DO NOTHING;',
               q.tabelle,
               (SELECT string_agg(quote_ident(key), ', ' ORDER BY ord)
                  FROM jsonb_each_text(q.zeile) WITH ORDINALITY AS e(key, wert, ord)),
               (SELECT string_agg(CASE WHEN q.zeile -> key = 'null'::jsonb
                                       THEN 'NULL' ELSE quote_literal(wert) END, ', ' ORDER BY ord)
                  FROM jsonb_each_text(q.zeile) WITH ORDINALITY AS e(key, wert, ord))
             ) AS anweisung
      FROM (
        SELECT 1 AS rang, 'role_catalog' AS tabelle, to_jsonb(x) AS zeile FROM public.role_catalog x
        UNION ALL SELECT 1, 'permission_catalog', to_jsonb(x) FROM public.permission_catalog x
        UNION ALL SELECT 2, 'role_permissions', to_jsonb(x) FROM public.role_permissions x
        UNION ALL SELECT 3, 'app_modules', to_jsonb(x) FROM public.app_modules x
        UNION ALL SELECT 3, 'mail_templates', to_jsonb(x) FROM public.mail_templates x
        UNION ALL SELECT 3, 'pdf_texts', to_jsonb(x) FROM public.pdf_texts x
        UNION ALL SELECT 3, 'application_fields', to_jsonb(x) FROM public.application_fields x
        UNION ALL SELECT 3, 'profile_fields', to_jsonb(x) FROM public.profile_fields x
        UNION ALL SELECT 3, 'form_templates', to_jsonb(x) FROM public.form_templates x
        UNION ALL SELECT 3, 'contribution_categories', to_jsonb(x) FROM public.contribution_categories x
        UNION ALL SELECT 3, 'onboarding_schritte', to_jsonb(x) FROM public.onboarding_schritte x
        UNION ALL SELECT 3, 'onboarding_hilfe', to_jsonb(x) FROM public.onboarding_hilfe x
        UNION ALL SELECT 3, 'site_categories', to_jsonb(x) FROM public.site_categories x
        UNION ALL SELECT 4, 'site_menu', to_jsonb(x) FROM public.site_menu x
      ) q
    ) t
  ), '') || E'\n\n' ||

  -- 5. Was nicht aus dieser Datenbank kommen soll
  E'-- == Leeres Gerüst ==\n' ||
  E'-- Die eine Einstellungszeile, bewusst ohne unsere Werte: Ein fremder Verein\n' ||
  E'-- traegt seinen Namen ein und loescht nicht unseren.\n' ||
  E'INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;\n' ||
  E'-- Eine Startseite, damit die Website nicht mit einem Fehler beginnt.\n' ||
  E'INSERT INTO public.site_pages (slug, title, is_published, is_system, content)\n' ||
  E'VALUES (''startseite'', ''Startseite'', true, true, ''{"content":[],"root":{}}''::jsonb)\n' ||
  E'ON CONFLICT (slug) DO NOTHING;\n' ||
  E'RESET check_function_bodies;\n'
  AS ausgangsstand;
```

## Was nicht mitkommt, und warum

| Nicht dabei | Grund |
| --- | --- |
| Mitglieder, Profile, Rollen**zuordnungen** | Personen eines bestimmten Vereins |
| Veranstaltungen, Forum, Abstimmungen, Beiträge | Vereinsleben |
| Seiteninhalte ausser einer leeren Startseite | unsere Texte |
| Bilder und Dokumente | die Ablagen entstehen leer |
| `app_settings` mit Werten | ein fremder Verein trägt seinen Namen ein |

## Danach

Den Inhalt der Zelle in `supabase/migrations/00000000000000_ausgangsstand.sql`
legen und melden. Ich räume dann die bisherigen Migrationen ins Archiv — ab da
ist eine neue Installation ein Knopfdruck und kein SQL-Editor mehr.
