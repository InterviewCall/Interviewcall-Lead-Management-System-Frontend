export type FollowUpType = "FOLLOW_UP" | "SCHEDULED_CALL" | "DUPLICATE_REVIEW";

export interface DayFollowUp {
  id: string;
  leadId: string;
  name: string;
  type: FollowUpType;
  kind: "call" | "other";
  title: string;
  dueAt: string;
  overdue: boolean;
  /** Calls since the last connected one that nobody picked. */
  attempts: number;
  /** Who has to make the call; shown when a manager opens the whole team's list. */
  owner: string | null;
  mine: boolean;
}

export interface DayBookedCall {
  id: string;
  leadId: string;
  name: string;
  detail: string;
  startAt: string;
  owner: string | null;
  mine: boolean;
}

export interface DayBar {
  day: string;
  date: string;
  total: number;
  connected: number;
  today: boolean;
}

export interface MyDay {
  /** "team" for managers, admin and ops; "mine" for the people who work leads. */
  scope: "team" | "mine";
  /** Whose follow-ups are listed: yours, or (managers only) everyone's. */
  view: "team" | "mine";
  generatedAt: string;
  kpis: {
    due: number;
    overdue: number;
    booked: number;
    /** Only managers see this; null for everyone else. */
    unassigned: number | null;
    newLeads: number;
    newLeadsChange: number | null;
    connectRate: number | null;
    connectRateChange: number | null;
  };
  followUps: DayFollowUp[];
  booked: DayBookedCall[];
  week: DayBar[];
  weekTotal: number;
}
