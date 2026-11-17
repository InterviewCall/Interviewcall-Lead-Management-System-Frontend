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
  /** Added from / to, as days (YYYY-MM-DD). The last day is included. */
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

/** A field an admin added to every lead, and this lead's value for it. */
export type CustomFieldType = "TEXT" | "NUMBER" | "DATE" | "SELECT" | "MULTISELECT" | "BOOLEAN";
export interface CustomFieldDef {
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  required: boolean;
  visibleRoles: string[];
  active: boolean;
}
export type CustomValue = string | number | boolean | string[] | null;
export interface CustomFormField extends CustomFieldDef { value: CustomValue }

/** The filters a saved view remembers. */
export type SavedFilters = Partial<{
  view: LeadView; search: string; sourceId: number; temperature: TemperatureCode; stage: StageCode; lifecycle: LifecycleCode;
  ownerId: string; listId: string; from: string; to: string;
}>;
export interface SavedView { id: string; name: string; filters: SavedFilters; shared: boolean; mine: boolean; by: string }

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
    /** Every custom field this role may see, filled or not, to edit. */
    customForm: CustomFormField[];
  };
  opportunity: {
    stage: StageCode;
    status: "OPEN" | "WON" | "LOST" | "MERGED";
    openedAt: string;
    stageChangedAt: string;
    closedAt: string | null;
    lostReason: string | null;
    lostNote: string | null;
    /** What was agreed and collected, once the deal is won. Null for a win with no payment recorded yet. */
    enrolment: Enrolment | null;
  } | null;
  /** How far the person got on the VSL, with what they answered and the call they booked. Null when they never came through the VSL. */
  vsl: {
    depth: "NONE" | "DETAILS" | "FORM" | "BOOKED";
    score: number | null;
    temperature: "HOT" | "WARM" | "COLD" | null;
    forms: Array<{
      formSlug: string;
      score: number | null;
      temperature: "HOT" | "WARM" | "COLD" | null;
      submittedAt: string;
      answers: Array<{ key: string; question: string; answer: string }>;
    }>;
    bookings: Array<{ slotStartAt: string; slotLabel: string; status: "CONFIRMED" | "COMPLETED" | "CANCELLED"; completedAt: string | null }>;
  } | null;
  scoreEntries: Array<{ id: string; points: number; reason: string; at: string }>;
  events: Array<{ id: string; type: string; title: string; sub: string; at: string; /** The logged activity this event is about, when it is one. */ ref: string | null }>;
}

export interface LostReason {
  id: number;
  name: string;
}

// ---- calls, messages, notes and follow-ups ----

export interface Outcome {
  id: number;
  name: string;
  /** True when the person answered, false when not, null when the outcome does not say. */
  connected: boolean | null;
  /** A real conversation: this is what moves Call 1 Pending to Call 1. */
  conversation: boolean;
  requiresFollowup: boolean;
  /** Logging it ends the sales follow-up, so no next step is asked for. */
  ends: boolean;
}

export type ActivityKind = "CALL" | "WHATSAPP" | "EMAIL" | "NOTE";

export interface Activity {
  id: string;
  kind: ActivityKind;
  outcome: { id: number; name: string } | null;
  connected: boolean | null;
  attemptNo: number | null;
  notes: string | null;
  nextFollowupAt: string | null;
  at: string;
  by: string;
}

export interface LeadTask {
  id: string;
  type: "FOLLOW_UP" | "SCHEDULED_CALL" | "DUPLICATE_REVIEW";
  status: "OPEN" | "DONE" | "CANCELLED";
  title: string;
  dueAt: string;
  overdue: boolean;
  completedAt: string | null;
  assignee: string | null;
}

export interface Engagement {
  activities: Activity[];
  tasks: LeadTask[];
}

export interface LogActivityInput {
  kind: ActivityKind;
  outcomeId?: number;
  notes?: string;
  stage?: StageCode;
  temperature?: TemperatureCode;
  nextStep?: { title: string; dueAt: string };
}

export type PaymentMode = "FULL" | "EMI" | "LOAN" | "PART";

/** The payment of a won deal. Amounts in whole rupees. */
export interface Enrolment {
  program: string | null;
  feeAmount: number;
  amountCollected: number;
  paymentMode: PaymentMode;
  note: string | null;
  updatedAt?: string;
}

/** The answer to a change made to many leads at once. */
export interface BulkResult {
  /** Leads that changed. */
  done: number;
  /** Leads that were already as asked. */
  unchanged: number;
  /** Leads left alone, grouped by the reason. */
  skipped: Array<{ reason: string; count: number }>;
}
