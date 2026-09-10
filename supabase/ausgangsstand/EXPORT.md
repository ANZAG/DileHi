# Drei Abfragen, drei Dateien

Alle drei im SQL-Editor der **alten** Datenbank ausführen. Sie geben jeweils **eine
Zelle** zurück, deren Inhalt fertiges SQL ist — kopieren, in die genannte Datei
einfügen, fertig. Nichts abtippen, nichts nacharbeiten.

Die Abfragen ändern nichts. Sie lesen nur.

---

## 1 → `02_rechte.sql`

Wer welche Tabelle und welche Funktion benutzen darf. Der Schema-Abzug kennt
das nicht — ohne diese Datei stünde in einer neuen Datenbank jede Funktion
PUBLIC offen.

```sql
SELECT string_agg(zeile, E'\n' ORDER BY sortierung, zeile) AS sql_datei
FROM (
  -- Funktionen
  SELECT 1 AS sortierung,
         format('GRANT EXECUTE ON FUNCTION public.%s TO %s;',
                p.oid::regprocedure::text,
                string_agg(DISTINCT a.grantee::regrole::text, ', ')) AS zeile
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND a.privilege_type = 'EXECUTE'
    AND a.grantee <> 0
    AND a.grantee::regrole::text IN ('anon', 'authenticated', 'service_role')
  GROUP BY p.oid

  UNION ALL

  -- Funktionen, die niemandem ausdrücklich gehören: PUBLIC entziehen
  SELECT 0,
         format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC;', p.oid::regprocedure::text)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'

  UNION ALL

  -- Tabellen
  SELECT 2,
         format('GRANT %s ON TABLE public.%I TO %s;',
                string_agg(DISTINCT a.privilege_type, ', '),
                c.relname,
                a.grantee::regrole::text)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND a.grantee::regrole::text IN ('anon', 'authenticated', 'service_role')
  GROUP BY c.relname, a.grantee

  UNION ALL

  -- Sequenzen, sonst schlägt jedes INSERT mit laufender Nummer fehl
  SELECT 3,
         format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO %s;',
                c.relname, a.grantee::regrole::text)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('S', c.relowner))) a
  WHERE n.nspname = 'public'
    AND c.relkind = 'S'
    AND a.grantee::regrole::text IN ('anon', 'authenticated', 'service_role')
  GROUP BY c.relname, a.grantee
) t;
```

---

## 2 → `03_startdaten.sql`

Rollen, Rechte, Module, Vorlagen, Menü, Kategorien, Einführung. Ohne diese
Datei gibt es in einer neuen Installation keine Rolle mit `roles.manage` — und
damit keinen Weg in die Verwaltung, auch nicht über die Einrichtungsseite.

Bewusst **nicht** dabei: Mitglieder, Veranstaltungen, Forum, Beiträge, Bilder,
Seiteninhalte. Das sind Daten dieses Vereins und gehören nicht in die
Grundausstattung eines anderen.

```sql
SELECT string_agg(anweisung, E'\n' ORDER BY tabelle, anweisung) AS sql_datei
FROM (
  SELECT
    t.tabelle,
    format(
      'INSERT INTO public.%I (%s) VALUES (%s) ON CONFLICT DO NOTHING;',
      t.tabelle,
      (SELECT string_agg(quote_ident(key), ', ' ORDER BY ord)
         FROM jsonb_each_text(zeile) WITH ORDINALITY AS e(key, wert, ord)),
      (SELECT string_agg(
                CASE WHEN zeile -> key = 'null'::jsonb THEN 'NULL'
                     ELSE quote_literal(wert) END, ', ' ORDER BY ord)
         FROM jsonb_each_text(zeile) WITH ORDINALITY AS e(key, wert, ord))
    ) AS anweisung
  FROM (
    SELECT 'role_catalog' AS tabelle, to_jsonb(x) AS zeile FROM public.role_catalog x
    UNION ALL SELECT 'permission_catalog', to_jsonb(x) FROM public.permission_catalog x
    UNION ALL SELECT 'role_permissions', to_jsonb(x) FROM public.role_permissions x
    UNION ALL SELECT 'app_modules', to_jsonb(x) FROM public.app_modules x
    UNION ALL SELECT 'mail_templates', to_jsonb(x) FROM public.mail_templates x
    UNION ALL SELECT 'pdf_texts', to_jsonb(x) FROM public.pdf_texts x
    UNION ALL SELECT 'application_fields', to_jsonb(x) FROM public.application_fields x
    UNION ALL SELECT 'profile_fields', to_jsonb(x) FROM public.profile_fields x
    UNION ALL SELECT 'form_templates', to_jsonb(x) FROM public.form_templates x
    UNION ALL SELECT 'contribution_categories', to_jsonb(x) FROM public.contribution_categories x
    UNION ALL SELECT 'onboarding_schritte', to_jsonb(x) FROM public.onboarding_schritte x
    UNION ALL SELECT 'onboarding_hilfe', to_jsonb(x) FROM public.onboarding_hilfe x
    UNION ALL SELECT 'site_menu', to_jsonb(x) FROM public.site_menu x
    UNION ALL SELECT 'site_categories', to_jsonb(x) FROM public.site_categories x
  ) t
) q;
```

### Was danach noch von Hand hineingehört

Ans Ende von `03_startdaten.sql`, weil es aus dieser Datenbank nicht sinnvoll
zu übernehmen ist:

```sql
-- Die eine Einstellungszeile. Bewusst leer statt mit unseren Werten: Ein
-- fremder Verein soll seinen Namen eintragen und nicht unseren löschen.
INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Eine Startseite, damit die Website nicht mit einem Fehler beginnt.
INSERT INTO public.site_pages (slug, title, is_published, is_system, content)
VALUES ('startseite', 'Startseite', true, true, '{"content":[],"root":{}}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
```

---

## 3 → `04_speicher.sql`

Die drei Ablagen für Bilder, Dokumente und interne Dateien — samt ihrer
Zugriffsregeln. Die liegen im Schema `storage` und nicht in `public`, deshalb
kennt sie der Schema-Abzug nicht.

```sql
SELECT string_agg(zeile, E'\n' ORDER BY sortierung, zeile) AS sql_datei
FROM (
  SELECT 1 AS sortierung,
         format('INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES (%L, %L, %L, %s, %s) ON CONFLICT (id) DO NOTHING;',
                id, name, public,
                COALESCE(file_size_limit::text, 'NULL'),
                COALESCE(quote_literal(allowed_mime_types::text) || '::text[]', 'NULL')) AS zeile
  FROM storage.buckets

  UNION ALL

  SELECT 2,
         format('CREATE POLICY %I ON storage.objects AS %s FOR %s TO %s%s%s;',
                pol.policyname,
                pol.permissive,
                pol.cmd,
                array_to_string(pol.roles, ', '),
                COALESCE(' USING (' || pol.qual || ')', ''),
                COALESCE(' WITH CHECK (' || pol.with_check || ')', ''))
  FROM pg_policies pol
  WHERE pol.schemaname = 'storage' AND pol.tablename = 'objects'
) t;
```

> Die Dateien selbst kommen damit nicht mit. Die holt der Sicherungslauf
> (`backup-export` mit `withFiles`) als Liste mit befristeten Links; für eine
> neue Installation eines fremden Vereins sind sie ohnehin nicht gewollt.

---

## Danach

Die drei Dateien neben `01_schema.sql` legen, dann melden. Ich baue daraus den
vollständigen Ausgangsstand und die Anleitung zum Einspielen.
