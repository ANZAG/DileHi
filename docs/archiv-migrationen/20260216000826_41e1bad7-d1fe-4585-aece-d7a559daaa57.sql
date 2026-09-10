
-- 1. Add status and closed_at to election_groups
ALTER TABLE public.election_groups 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

-- 2. Group members table (per-topic member list with vote counts)
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.election_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote_count integer NOT NULL DEFAULT 1,
  represented_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group members" ON public.group_members
FOR SELECT USING (is_member(auth.uid()));

CREATE POLICY "Vorstand can insert group members" ON public.group_members
FOR INSERT WITH CHECK (is_vorstand(auth.uid()));

CREATE POLICY "Vorstand can update group members" ON public.group_members
FOR UPDATE USING (is_vorstand(auth.uid()));

CREATE POLICY "Vorstand can delete group members" ON public.group_members
FOR DELETE USING (is_vorstand(auth.uid()));

-- 3. Representation change log
CREATE TABLE public.representation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.election_groups(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.representation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vorstand can view representation log" ON public.representation_log
FOR SELECT USING (is_vorstand(auth.uid()));

CREATE POLICY "Vorstand can insert representation log" ON public.representation_log
FOR INSERT WITH CHECK (is_vorstand(auth.uid()));

-- 4. Update can_vote: check group_members vote_count, ensure user hasn't voted yet
CREATE OR REPLACE FUNCTION public.can_vote(_election_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    is_member(_user_id)
    AND EXISTS (SELECT 1 FROM elections WHERE id = _election_id AND status = 'active')
    AND NOT EXISTS (SELECT 1 FROM votes WHERE election_id = _election_id AND voter_id = _user_id)
    AND COALESCE(
      (SELECT gm.vote_count FROM elections e
       JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = _user_id
       WHERE e.id = _election_id),
      1
    ) > 0
  )
$$;

-- 5. Get user's allocated vote count for an election
CREATE OR REPLACE FUNCTION public.get_user_vote_count(_election_id uuid, _user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT gm.vote_count FROM elections e
     JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = _user_id
     WHERE e.id = _election_id),
    1
  )
$$;

-- 6. Atomic vote casting function (validates exact vote count)
CREATE OR REPLACE FUNCTION public.cast_votes(
  _election_id uuid,
  _voter_id uuid,
  _votes jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total integer;
  _allowed integer;
  _v jsonb;
  _i integer;
BEGIN
  IF NOT can_vote(_election_id, _voter_id) THEN
    RAISE EXCEPTION 'Abstimmung nicht möglich';
  END IF;

  SELECT COALESCE(gm.vote_count, 1) INTO _allowed
  FROM elections e
  LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = _voter_id
  WHERE e.id = _election_id;

  SELECT COALESCE(SUM((v->>'count')::integer), 0) INTO _total
  FROM jsonb_array_elements(_votes) v;

  IF _total != _allowed THEN
    RAISE EXCEPTION 'Genau % Stimmen erforderlich, % abgegeben', _allowed, _total;
  END IF;

  FOR _v IN SELECT * FROM jsonb_array_elements(_votes)
  LOOP
    IF (_v->>'count')::integer > 0 THEN
      FOR _i IN 1..(_v->>'count')::integer
      LOOP
        INSERT INTO votes (election_id, candidate_id, voter_id)
        VALUES (_election_id, (_v->>'candidate_id')::uuid, _voter_id);
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- 7. Enable realtime for group_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
