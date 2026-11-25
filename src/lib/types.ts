// The parts of Athena's REST answers this extension reads. Athena sends more;
// anything not listed here is ignored.

export interface PersonRef {
  id: string;
  name: string;
}

export type CommitmentKind = "todo" | "i_owe" | "waiting_on" | "decision";

export interface Commitment {
  id: string;
  title: string;
  kind: CommitmentKind;
  status: "open" | "done" | "dropped";
  /** "YYYY-MM-DD" or null. */
  due_on: string | null;
  notes: string;
  person: PersonRef | null;
  /** 0 none, 1 low, 2 medium, 3 high. */
  priority: number;
}

/** GET /api/today */
export interface Today {
  today: string;
  due: Commitment[];
  open_loops: Commitment[];
}

export interface Occurrence {
  event: { id: string; title: string; kind: string; notes?: string };
  occurs_on: string;
  days_until: number;
  /** Local "HH:MM", or null when it's all day. */
  time: string | null;
  /** Age turned or anniversary number, when the year is known. */
  years: number | null;
}

/** GET /api/upcoming */
export interface Upcoming {
  today: string;
  tz: string;
  events: Occurrence[];
  catch_ups: Array<{ id: string; name: string; relationship?: string | null; last_contacted_at?: string | null }>;
}

export type MentionKind = "person" | "place" | "organisation" | "event" | "note" | "project" | "record" | "saved" | "todo" | "watch";

/** GET /api/mentions */
export interface Mention {
  kind: MentionKind;
  id: string;
  title: string;
  subtitle: string;
  updated_at: string;
  /** A record's type. */
  kind_id?: string;
}

export type RecallKind = "note" | "commitment" | "interaction" | "fact" | "person" | "reading" | "record" | "day";

/** GET /api/recall */
export interface RecallHit {
  kind: RecallKind;
  /** A day's id is its date. */
  id: string;
  title: string;
  snippet: string;
  at: string;
  person: PersonRef | null;
  custom_kind?: { id: string; one: string };
}

export interface Habit {
  id: string;
  name: string;
  target: number | null;
  unit: string | null;
  per_week: number | null;
  archived_at: string | null;
}

export interface HabitDay {
  id: string;
  progress: number;
  done: boolean;
  shows: boolean;
  week_done?: number;
  streak: number;
  streak_unit: "day" | "week";
}

/** GET /api/habits */
export interface Habits {
  today: string;
  habits: Habit[];
  on: HabitDay[];
}

/** POST /api/saved */
export interface Saved {
  id: string;
  url: string;
  item: { title: string | null; kind: string };
}

/** POST /api/assistant/capture?format=json */
export interface Captured {
  reply: string;
  changes: Array<{ kind: string; id: string }>;
}
