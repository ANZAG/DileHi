
-- Create function to check vote allowance based on group's votes_per_member
CREATE OR REPLACE FUNCTION public.can_vote(_election_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT (
    -- User is a member
    is_member(_user_id)
    -- Election is active
    AND EXISTS (SELECT 1 FROM elections WHERE id = _election_id AND status = 'active')
    -- User hasn't exceeded vote limit
    AND (
      SELECT COUNT(*) FROM votes WHERE election_id = _election_id AND voter_id = _user_id
    ) < (
      SELECT COALESCE(eg.votes_per_member, 1)
      FROM elections e
      LEFT JOIN election_groups eg ON eg.id = e.group_id
      WHERE e.id = _election_id
    )
  )
$$;

-- Drop old INSERT policy on votes
DROP POLICY IF EXISTS "Members can cast vote" ON public.votes;

-- Create updated INSERT policy using can_vote function
CREATE POLICY "Members can cast vote"
  ON public.votes FOR INSERT
  WITH CHECK (
    voter_id = auth.uid()
    AND can_vote(election_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = votes.candidate_id
      AND candidates.election_id = votes.election_id
    )
  );

-- Add function to count total members
CREATE OR REPLACE FUNCTION public.count_members()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(DISTINCT user_id) FROM public.user_roles WHERE role IN ('vorstand', 'mitglied')
$$;
