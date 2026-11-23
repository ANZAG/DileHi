-- cast_votes(): keine negativen Stimmzahlen, nur Kandidaten dieser Wahl.
--
-- Die Funktion prüfte, dass die SUMME der abgegebenen Stimmen den
-- verbleibenden entspricht – und überging beim Einfügen jeden Eintrag, der
-- nicht über 0 lag. Wer eine Stimme hatte und
--   [{"candidate_id": A, "count": 50}, {"candidate_id": B, "count": -49}]
-- schickte, bestand die Prüfung (Summe 1) und bekam 50 Stimmen für A.
-- Seit 20261123210000 ist cast_votes() der einzige Weg zu einer Stimme;
-- damit muss sie selbst dicht sein.
--
-- Jetzt: Jeder Eintrag braucht eine ganze Zahl ab 0 und einen Kandidaten
-- dieser Wahl. Vorher kam ein fremder Kandidat nur deshalb nicht durch, weil
-- die Policy auf votes ihn abwies – die gilt für eine SECURITY-DEFINER-
-- Funktion nicht.
CREATE OR REPLACE FUNCTION public.cast_votes(_election_id uuid, _voter_id uuid, _votes jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _total integer;
  _allowed integer;
  _used integer;
  _remaining integer;
  _v jsonb;
  _i integer;
BEGIN
  IF auth.uid() IS NULL OR _voter_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Keine Berechtigung: Stimmen können nur für den eigenen Account abgegeben werden';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_election_id::text || ':' || _voter_id::text));

  IF NOT can_vote(_election_id, _voter_id) THEN
    RAISE EXCEPTION 'Abstimmung nicht möglich';
  END IF;

  IF _votes IS NULL OR jsonb_typeof(_votes) <> 'array' THEN
    RAISE EXCEPTION 'Ungültige Stimmabgabe';
  END IF;

  -- Jede Zeile: ganze Zahl ab 0, Kandidat dieser Wahl.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(_votes) v
    WHERE jsonb_typeof(v->'count') IS DISTINCT FROM 'number'
       OR (v->>'count') !~ '^[0-9]{1,6}$'
       OR NOT EXISTS (
         SELECT 1 FROM candidates c
         WHERE c.id::text = v->>'candidate_id' AND c.election_id = _election_id
       )
  ) THEN
    RAISE EXCEPTION 'Ungültige Stimmabgabe';
  END IF;

  SELECT COALESCE(gm.vote_count, 1) INTO _allowed
  FROM elections e
  LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = _voter_id
  WHERE e.id = _election_id;

  SELECT COUNT(*) INTO _used
  FROM votes
  WHERE election_id = _election_id AND voter_id = _voter_id;

  _remaining := GREATEST(_allowed - _used, 0);

  IF _remaining <= 0 THEN
    RAISE EXCEPTION 'Keine weiteren Stimmen verfügbar';
  END IF;

  SELECT COALESCE(SUM((v->>'count')::integer), 0) INTO _total
  FROM jsonb_array_elements(_votes) v;

  IF _total != _remaining THEN
    RAISE EXCEPTION 'Genau % Stimmen erforderlich, % abgegeben', _remaining, _total;
  END IF;

  FOR _v IN SELECT * FROM jsonb_array_elements(_votes)
  LOOP
    FOR _i IN 1..(_v->>'count')::integer
    LOOP
      INSERT INTO votes (election_id, candidate_id, voter_id)
      VALUES (_election_id, (_v->>'candidate_id')::uuid, _voter_id);
    END LOOP;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.cast_votes(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cast_votes(uuid, uuid, jsonb) TO authenticated, service_role;
