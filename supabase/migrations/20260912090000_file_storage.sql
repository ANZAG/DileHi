-- Dateien der Quellensammlung wahlweise in SharePoint.
--
-- Die Scans der Quellensammlung sind gross – bei DileHi 50 bis 466 MB je
-- Datei, zusammen mehr als der kostenlose Supabase-Tarif erlaubt (50 MB je
-- Datei, 1 GB insgesamt). Ein Verein mit Microsoft 365 hat dafür ohnehin
-- SharePoint. Die Datei liegt dann dort, alles andere – Titel, Epoche, Ordner,
-- wer sie angelegt hat, wer sie sehen darf – bleibt in DING.
--
-- Einstellungen:
--   file_storage          wohin neue Dateien gehen: supabase oder sharepoint
--   sharepoint_site_url   die SharePoint-Website, etwa
--                         https://verein.sharepoint.com/sites/Vereinsablage
--
-- Die Zugangsdaten der App-Registrierung stehen nicht hier, sondern in den
-- Geheimnissen der Edge Functions (SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID,
-- SHAREPOINT_CLIENT_SECRET) – aus demselben Grund wie beim Mailversand: Die
-- Sicherung schreibt alle Tabellen nach GitHub.
--
-- An der Quelle:
--   drive_item_id   die Kennung der Datei in SharePoint; gesetzt heisst: die
--                   Datei liegt dort, und file_path ist leer
--   file_name, file_size, mime_type   zum Anzeigen, ohne SharePoint zu fragen
--   file_missing    Die Datei war beim Verschieben nicht auffindbar. Die
--                   Quelle bleibt, damit jemand die Datei nachreichen kann.

ALTER TABLE public.app_settings
  ADD COLUMN file_storage text NOT NULL DEFAULT 'supabase',
  ADD COLUMN sharepoint_site_url text;

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_file_storage_check CHECK (file_storage IN ('supabase', 'sharepoint'));

ALTER TABLE public.sources
  ADD COLUMN drive_item_id text,
  ADD COLUMN file_name text,
  ADD COLUMN file_size bigint,
  ADD COLUMN mime_type text,
  ADD COLUMN file_missing boolean NOT NULL DEFAULT false;
