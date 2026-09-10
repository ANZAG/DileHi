
-- Add status column to event_attendees
ALTER TABLE public.event_attendees
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'attending';
