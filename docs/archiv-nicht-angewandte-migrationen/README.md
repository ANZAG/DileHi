# Nicht angewandte Migrationen

Diese vier Dateien lagen in `supabase/migrations/`, wurden aber nie gegen die
Datenbank ausgeführt. Belegt durch den Abgleich mit
`supabase_migrations.schema_migrations` vom 07.09.2026: keine der vier Versionen
ist dort vermerkt, und die von ihnen angelegten Spalten existieren im Live-Schema
nicht (`event_forms.spacing_m`, `event_form_responses.assigned_member_id`, …).

Sie lagen ohne Zeitstempel-Präfix im Ordner und wären von `supabase db push`
teils gar nicht, teils in falscher Reihenfolge angewandt worden. Deshalb hier
abgelegt statt gelöscht – die fachliche Absicht ist weiterhin lesenswert:

- `20260422_002_settings_columns.sql` beschreibt den Weg vom `settings`-JSONB-Blob
  zu typisierten Spalten. Der Blob ist bis heute die Ursache dafür, dass Formular-
  und Auswertungsseite sich gegenseitig überschreiben können. Der Umbau kommt
  wieder, dann aber als reguläre Migration.
- `20260422_003_assigned_member.sql` wollte `assigned_member_id` einführen. Gelöst
  wurde das Problem stattdessen über die Funktion `assign_response_to_member`,
  die `event_form_responses.user_id` setzt. Die Datei ist damit überholt.
- `20260422_001_rls_edit_policies.sql` und `20240101_membership_applications.sql`
  wurden durch spätere, tatsächlich angewandte Migrationen ersetzt.
