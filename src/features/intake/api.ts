/**
 * MOCK: the intake service has no read API yet. Swap for `api.get("/intake/events")`,
 * `api.post("/intake/events/:id/retry")` and `api.post("/intake/reconcile")`.
 */
const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type EventStatus = "Processed" | "Failed" | "Dead" | "Received";

export interface IntakeEvent {
  id: string;
  at: string;
  source: string;
  event: string;
  status: EventStatus;
  tries: number;
  /** Lead name when processed, otherwise the error or queue note. */
  detail: string;
}

export interface SourceHealth {
  id: string;
  name: string;
  events: string;
  status: "Healthy" | "Quiet";
  lastEvent: string;
  nightly: string;
  /** Events per hour for the last 12 hours. */
  spark: number[];
}

const events: IntakeEvent[] = [
  { id: "e1", at: "2026-11-02T22:42:18+05:30", source: "WorkR", event: "workr.signup", status: "Processed", tries: 1, detail: "Rohan Mehta" },
  { id: "e2", at: "2026-11-02T22:41:55+05:30", source: "VSL · slot-booking", event: "vsl.slot_booked", status: "Processed", tries: 1, detail: "Ishita Roy" },
  { id: "e3", at: "2026-11-02T22:41:02+05:30", source: "VSL · form-details", event: "vsl.form_submitted", status: "Failed", tries: 2, detail: "Phone could not be read: phone" },
  { id: "e4", at: "2026-11-02T22:39:47+05:30", source: "WorkR", event: "workr.signup", status: "Processed", tries: 1, detail: "Priya Sharma" },
  { id: "e5", at: "2026-11-02T22:38:20+05:30", source: "VSL · slot-booking", event: "vsl.booking_cancelled", status: "Received", tries: 0, detail: "Waiting in queue" },
  { id: "e6", at: "2026-11-02T22:36:09+05:30", source: "VSL · form-details", event: "vsl.details_submitted", status: "Dead", tries: 5, detail: "Database timeout after 5 tries" },
  { id: "e7", at: "2026-11-02T22:33:41+05:30", source: "WorkR", event: "workr.signup", status: "Failed", tries: 3, detail: "Email is not valid: email" },
  { id: "e8", at: "2026-11-02T22:30:12+05:30", source: "VSL · form-details", event: "vsl.form_submitted", status: "Processed", tries: 1, detail: "Karthik Nair" },
  { id: "e9", at: "2026-11-02T22:27:50+05:30", source: "VSL · slot-booking", event: "vsl.slot_booked", status: "Failed", tries: 1, detail: "Lead not found for slot" },
  { id: "e10", at: "2026-11-02T22:24:03+05:30", source: "WorkR", event: "workr.signup", status: "Processed", tries: 1, detail: "Ananya Iyer" },
  { id: "e11", at: "2026-11-02T22:19:36+05:30", source: "VSL · form-details", event: "vsl.details_submitted", status: "Dead", tries: 5, detail: "Payload failed validation 5 times" },
  { id: "e12", at: "2026-11-02T22:15:58+05:30", source: "WorkR", event: "workr.signup", status: "Processed", tries: 1, detail: "Aditya Verma" },
];

const sources: SourceHealth[] = [
  { id: "s1", name: "WorkR · User-Service", events: "workr.signup", status: "Healthy", lastEvent: "12 s ago", nightly: "Last night 2:00 AM · 0 missing", spark: [22, 30, 41, 38, 52, 60, 48, 55, 71, 66, 58, 63] },
  { id: "s2", name: "VSL · candidate-form-details", events: "details_submitted, form_submitted", status: "Healthy", lastEvent: "48 s ago", nightly: "Last night 2:03 AM · 0 missing", spark: [14, 18, 25, 22, 31, 35, 29, 33, 40, 37, 34, 36] },
  { id: "s3", name: "VSL · slot-booking", events: "slot_booked, cancelled", status: "Quiet", lastEvent: "42 min ago", nightly: "Last night 2:05 AM · 1 recovered", spark: [9, 12, 15, 11, 14, 17, 12, 10, 8, 5, 2, 0] },
];

export const intakeKeys = { events: ["intake", "events"] as const, health: ["intake", "health"] as const };

export async function listEvents(): Promise<IntakeEvent[]> {
  await wait();
  return events.map((e) => ({ ...e }));
}

export async function listSources(): Promise<SourceHealth[]> {
  await wait(200);
  return sources.map((s) => ({ ...s }));
}

export async function retryEvent(id: string): Promise<IntakeEvent> {
  await wait(500);
  const e = events.find((x) => x.id === id);
  if (!e) throw new Error("That event no longer exists.");
  e.tries += 1;
  e.status = "Processed";
  e.detail = "Processed on retry";
  return { ...e };
}

export async function runReconciliation(): Promise<{ checked: number; recovered: number }> {
  await wait(900);
  return { checked: 1284, recovered: 0 };
}
