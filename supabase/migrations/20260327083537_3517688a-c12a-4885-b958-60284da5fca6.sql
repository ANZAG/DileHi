
-- Allow members to update their own attendee status
CREATE POLICY "Members can update own RSVP"
ON public.event_attendees
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
