
-- Events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view events" ON public.events FOR SELECT USING (is_member(auth.uid()));
CREATE POLICY "Members can create events" ON public.events FOR INSERT WITH CHECK (is_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Creator or Vorstand can update events" ON public.events FOR UPDATE USING (created_by = auth.uid() OR is_vorstand(auth.uid()));
CREATE POLICY "Creator or Vorstand can delete events" ON public.events FOR DELETE USING (created_by = auth.uid() OR is_vorstand(auth.uid()));

-- Event attendees table
CREATE TABLE public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view attendees" ON public.event_attendees FOR SELECT USING (is_member(auth.uid()));
CREATE POLICY "Members can RSVP" ON public.event_attendees FOR INSERT WITH CHECK (is_member(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Members can remove own RSVP" ON public.event_attendees FOR DELETE USING (user_id = auth.uid());
