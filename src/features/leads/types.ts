/** Shapes returned by the leads API (`/api/v1/leads`). */

export type LifecycleCode =
  | "MARKETING_LEAD" | "ENGAGED_LEAD" | "PROSPECT" | "ENROLLED" | "LEARNER_ONBOARDED" | "NOT_INTERESTED" | "EXHAUSTED_NOT_CONNECTED";
export type StageCode =
  | "CALL_1_PENDING" | "CALL_1" | "TEST" | "CALL_2" | "PSYCHOMETRIC_SESSION" | "DECISION_OBJECTION" | "PAYMENT_FINANCING" | "CLOSED_WON";
export type TemperatureCode = "HOT" | "WARM" | "COLD";
export type LeadView = "all" | "mine" | "unassigned" | "booked" | "hot" | "due";

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  sourceId: number;
  lifecycle: LifecycleCode;
  stage: StageCode | null;
  opportunityStatus: "OPEN" | "WON" | "LOST" | null;
  temperature: TemperatureCode | null;
  score: number;
  owner: { id: string; name: string } | null;
  next: { kind: "booked" | "task" | "none"; at: string | null };
  createdAt: string;
}

export interface LeadPage {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<LeadView, number>;
}

export interface LeadQuery {
  view: LeadView;
  search: string;
  sourceId: number | null;
  temperature: TemperatureCode | "";
  stage: StageCode | "";
  lifecycle: LifecycleCode | "";
  /** A staff id, `none` for unassigned, or empty for everyone. */
  ownerId: string;
  listId: string;
  page: number;
  pageSize: number;
}

export interface LeadFilters {
  sources: Array<{ id: number; name: string; group: string }>;
  lists: Array<{ id: string; name: string; members: number }>;
  owners: Array<{ id: string; name: string }>;
}

export interface LeadDetail {
  lead: Lead & {
    company: string | null;
    ctc: string | null;
    graduationYear: string | null;
    domain: string | null;
    userType: "WORKING_PROFESSIONAL" | "STUDENT" | "UNKNOWN";
    doNotContact: boolean;
    lastActivityAt: string | null;
    lists: Array<{ id: string; name: string }>;
    customFields: Array<{ label: string; value: string }>;
  };
  opportunity: {
    stage: StageCode;
    status: "OPEN" | "WON" | "LOST";
    openedAt: string;
    stageChangedAt: string;
    closedAt: string | null;
    lostReason: string | null;
    lostNote: string | null;
  } | null;
  scoreEntries: Array<{ id: string; points: number; reason: string; at: string }>;
  events: Array<{ id: string; type: string; title: string; sub: string; at: string }>;
}

export interface LostReason {
  id: number;
  name: string;
}
