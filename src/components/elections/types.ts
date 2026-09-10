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
  status: string;
  closed_at: string | null;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  vote_count: number;
  represented_by: string | null;
  created_at: string;
}

export interface RepresentationLogEntry {
  id: string;
  group_id: string;
  action: string;
  details: string;
  changed_by: string;
  changed_at: string;
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
