-- Migration: event_forms.settings JSONB → echte Spalten
-- Bisher wurden alle Logistik-Einstellungen in einem JSONB-Blob gespeichert.
-- Bekannte, stabile Felder werden in typisierte Spalten überführt.
-- Das settings-Feld bleibt zunächst erhalten (für Abwärtskompatibilität),
-- kann in einer späteren Migration entfernt werden.

ALTER TABLE public.event_forms
  ADD COLUMN IF NOT EXISTS spacing_m        numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS club_tents       text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kitchen_lead     text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_lead_id    uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pool_tent_ids    uuid[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS program_items    jsonb   NOT NULL DEFAULT '[]';

-- Daten aus JSONB in die neuen Spalten migrieren
UPDATE public.event_forms
SET
  spacing_m     = COALESCE((settings->>'spacing_m')::numeric, 0),
  club_tents    = COALESCE(
                    ARRAY(SELECT jsonb_array_elements_text(settings->'club_tents')),
                    '{}'::text[]
                  ),
  kitchen_lead  = COALESCE(settings->>'kitchen_lead', ''),
  event_lead_id = NULLIF(settings->>'event_lead_id', '')::uuid,
  pool_tent_ids = COALESCE(
                    ARRAY(
                      SELECT (elem#>>'{}')::uuid
                      FROM jsonb_array_elements(COALESCE(settings->'pool_tent_ids', '[]'::jsonb)) AS elem
                      WHERE elem#>>'{}' ~ '^[0-9a-f-]{36}$'
                    ),
                    '{}'::uuid[]
                  ),
  program_items = COALESCE(settings->'program_items', '[]'::jsonb)
WHERE settings IS NOT NULL AND settings != '{}'::jsonb;

-- Kommentar für spätere Bereinigung
COMMENT ON COLUMN public.event_forms.settings IS
  'Legacy JSONB – Felder wurden in spacing_m, club_tents, kitchen_lead, event_lead_id, pool_tent_ids, program_items überführt. Kann nach Frontend-Migration entfernt werden.';
