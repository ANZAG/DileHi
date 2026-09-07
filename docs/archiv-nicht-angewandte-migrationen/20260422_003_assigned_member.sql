-- Migration: Mitglieder-Zuweisung und JSONB-Antworten-Spalte
--
-- Hintergrund:
-- Mitglieder melden sich gelegentlich über das öffentliche Gästeformular an,
-- wodurch ihre hinterlegten Zelte nicht automatisch für die Logistik-Berechnung
-- verwendet werden. Vorstand/Organisator soll nachträglich eine Gast-Antwort
-- einem Mitglied zuweisen können.
--
-- Gleichzeitig wird eine answers-JSONB-Spalte als ergänzende Speicherform
-- vorbereitet. Sie ermöglicht schnellere Updates (ein einziges UPDATE statt
-- DELETE+INSERT vieler Zeilen) und ist die Grundlage für eine spätere
-- schrittweise Migration weg vom EAV-Muster.

-- 1. Mitglieder-Zuweisung
ALTER TABLE public.event_form_responses
  ADD COLUMN IF NOT EXISTS assigned_member_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_form_responses_assigned_member
  ON public.event_form_responses (assigned_member_id)
  WHERE assigned_member_id IS NOT NULL;

-- RLS: Vorstand darf assigned_member_id bei jeder Response setzen
CREATE POLICY "Vorstand can assign member to response"
  ON public.event_form_responses FOR UPDATE TO authenticated
  USING (is_vorstand(auth.uid()));

-- RLS: Organisator darf assigned_member_id bei eigenen Event-Responses setzen
-- (UPDATE-Policy für Organizer existiert bereits aus Migration 001 – deckt das ab)

-- 2. Funktion: Member zuweisen und Zelte der Person in die Antworten übernehmen
--    Beim Zuweisen werden die vorhandenen Zelt-Antworten NICHT überschrieben –
--    die Auswertungslogik entscheidet selbst, ob sie die Mitglied-Zelte oder
--    die Formular-Antworten verwendet (assigned_member_id hat Vorrang).

CREATE OR REPLACE FUNCTION public.assign_member_to_response(
  _response_id uuid,
  _member_id    uuid  -- NULL = Zuweisung aufheben
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sicherheitscheck: Nur Vorstand oder Organisator des zugehörigen Events
  IF NOT (
    is_vorstand(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM event_form_responses r
      JOIN event_forms ef ON ef.id = r.form_id
      JOIN events e ON e.id = ef.event_id
      WHERE r.id = _response_id
        AND e.created_by = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  UPDATE public.event_form_responses
  SET assigned_member_id = _member_id,
      updated_at = now()
  WHERE id = _response_id;
END;
$$;

-- 3. Helper-View: Responses mit Mitglied-Namen für die Auswertung
CREATE OR REPLACE VIEW public.event_form_responses_with_member AS
SELECT
  r.*,
  p.display_name AS assigned_member_name
FROM public.event_form_responses r
LEFT JOIN public.profiles p ON p.id = r.assigned_member_id;

-- View erbt nicht automatisch RLS – Zugriff über die Basis-Tabellen-Policies
