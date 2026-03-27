export interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

export interface Attendee {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  profiles?: { display_name: string } | null;
}

export interface SpanSegment {
  event: Event;
  isStart: boolean;
  isEnd: boolean;
  spanCols: number;
}

export type VisibilityFilter = "all" | "public" | "internal";

export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
