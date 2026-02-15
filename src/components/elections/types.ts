export interface Candidate {
  id: string;
  name: string;
  election_id: string;
  created_at: string;
}

export interface Election {
  id: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  group_id: string | null;
  created_by: string;
  created_at: string;
  closed_at: string | null;
  candidates: Candidate[];
}

export interface ElectionGroup {
  id: string;
  title: string;
  votes_per_member: number;
  created_by: string;
  created_at: string;
}

export interface ElectionResult {
  election_id: string;
  candidate_id: string;
  candidate_name: string;
  vote_count: number;
}

export interface AuditLogEntry {
  id: string;
  election_title: string;
  election_description: string | null;
  group_title: string | null;
  result_snapshot: unknown;
  total_votes: number;
  deleted_by: string;
  deleted_at: string;
}
