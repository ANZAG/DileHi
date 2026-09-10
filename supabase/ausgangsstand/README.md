# Ausgangsstand

Eine leere Datenbank zu einer lauffähigen DileHi-Instanz machen — in vier
Dateien statt in achtzig Migrationsschritten.

## Warum es das gibt

Die Migrationen unter `../migrations/` sind lückenhaft. `role_catalog` und
`permission_catalog` werden dort befüllt, verändert und abgefragt, aber
nirgends angelegt. Fünf Funktionen fehlten ebenfalls; die sind inzwischen
nachgetragen.

Für die laufende Installation ist das folgenlos — sie steht ja. Für eine
zweite nicht: Wer die Migrationen der Reihe nach einspielt, bekommt eine
Datenbank, in der die Rechteverwaltung nicht lädt.

Das ist zugleich die Antwort auf die Frage nach dem „Squash". Beides ist
dieselbe Aufgabe, und der Anlass ist nicht die Zahl der Dateien, sondern dass
sie nicht ausreichen.

## Stand

| Datei | Inhalt | Stand |
| --- | --- | --- |
| `01_schema.sql` | Typen, Tabellen, Bedingungen, Indizes, Funktionen, Trigger, RLS-Regeln | **da** |
| `02_rechte.sql` | GRANT und REVOKE auf Tabellen und Funktionen | fehlt |
| `03_startdaten.sql` | Rollen, Rechte, Module, Vorlagen, Menü, Seiten, Kategorien | fehlt |
| `04_speicher.sql` | Storage-Buckets und ihre Regeln | fehlt |

`01_schema.sql` stammt wörtlich aus `SELECT public.backup_schema_ddl()` der
laufenden Datenbank. Nichts davon ist nachgebaut.

## Warum das hier liegt und nicht in `migrations/`

Weil beides zusammen nicht funktionieren würde: Eine neue Installation liefe
erst den Ausgangsstand und danach alle Migrationen, die dasselbe noch einmal
anlegen wollen.

Der Tausch passiert also in einem Zug — und erst, wenn er bewiesen ist. Eine
unvollständige Datei, die vollständig aussieht, ist schlechter als eine
unvollständige Historie, von der man es weiss.

## Was noch zu tun ist

**1. Rechte exportieren.** Der Schema-Dump kennt sie nicht. Ohne sie steht in
einer neuen Datenbank jede Funktion PUBLIC offen — genau der Fehler, der
gerade behoben wurde.

```sql
SELECT string_agg(zeile, E'\n' ORDER BY zeile) FROM (
  -- Funktionen
  SELECT format('GRANT EXECUTE ON FUNCTION public.%s TO %s;',
                p.oid::regprocedure::text,
                string_agg(DISTINCT a.grantee::regrole::text, ', ')) AS zeile
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
  WHERE n.nspname = 'public' AND a.privilege_type = 'EXECUTE'
    AND a.grantee <> 0 AND a.grantee::regrole::text IN ('anon','authenticated','service_role')
  GROUP BY p.oid
  UNION ALL
  -- Tabellen
  SELECT format('GRANT %s ON TABLE public.%I TO %s;',
                string_agg(DISTINCT a.privilege_type, ', '),
                c.relname,
                a.grantee::regrole::text)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND a.grantee::regrole::text IN ('anon','authenticated','service_role')
  GROUP BY c.relname, a.grantee
) t;
```

**2. Startdaten exportieren.** Ohne sie gibt es keine Rolle mit
`roles.manage` — und damit keinen Weg in die Verwaltung, auch nicht über
`setup-first-admin`.

Betroffen sind die Tabellen, die Einrichtung und nicht Vereinsleben enthalten:
`role_catalog`, `permission_catalog`, `role_permissions`, `app_modules`,
`app_settings`, `mail_templates`, `pdf_texts`, `application_fields`,
`profile_fields`, `site_menu`, `site_categories`, `form_templates`,
`contribution_categories`, `onboarding_schritte`, `onboarding_hilfe`.

Die Seiten (`site_pages`) gehören nur als leeres Gerüst hinein — die Inhalte
sind unsere, nicht die eines fremden Vereins.

**3. Auf einer leeren Datenbank durchspielen.** Ein zweites, leeres
Supabase-Projekt, die vier Dateien der Reihe nach, dann `setup-first-admin`.
Erst danach ist der Ausgangsstand mehr als eine gut aussehende Behauptung.

**4. Tauschen.** Die bisherigen Migrationen nach `docs/archiv-migrationen/`,
den Ausgangsstand nach `migrations/`.
