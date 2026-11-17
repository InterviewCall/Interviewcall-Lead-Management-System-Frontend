import { api } from "@/lib/api/client";

/** The real assignment API: the waiting queue, the BDAs' loads, equal distribution, leave days and history. */

export type VslDepth = "BOOKED" | "FORM" | "DETAILS" | "NONE";
export const VSL_DEPTHS: VslDepth[] = ["BOOKED", "FORM", "DETAILS", "NONE"];
export const DEPTH_LABEL: Record<VslDepth, string> = { BOOKED: "Booked slot", FORM: "Full form", DETAILS: "Details", NONE: "Signup only" };

export type Temperature = "HOT" | "WARM" | "COLD";
export const TEMPERATURES: Temperature[] = ["HOT", "WARM", "COLD"];
export const TEMPERATURE_LABEL: Record<Temperature, string> = { HOT: "Hot", WARM: "Warm", COLD: "Cold" };

export type QueueTab = "all" | "booked" | "hot";
export type WaitBucket = "" | "lt6" | "6to24" | "gt24";

export interface QueueItem {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  domain: string | null;
  depth: VslDepth;
  temperature: Temperature | null;
  source: string;
  /** Whole hours since the person first came in. */
  waitingHours: number;
  /** When the booked call is, if there is one. */
  bookedAt: string | null;
}

export interface QueueQuery {
  tab: QueueTab;
  sourceId: number | null;
  depth: VslDepth | "";
  temperature: Temperature | "";
  wait: WaitBucket;
  limit: number;
}

export interface QueueData {
  items: QueueItem[];
  /** Everything that matches the filters (up to 2,000), for "select all". */
  matchingIds: string[];
  total: number;
  counts: Record<QueueTab, number>;
  sources: Array<{ id: number; name: string }>;
}

export interface BdaLoad {
  id: string;
  name: string;
  /** BDAs are in the round robin by default; sales managers can be added to it. */
  role: "SALES_MANAGER" | "BDA";
  /** Leads they hold that are still in play. */
  open: number;
  /** Hot leads given to them in the last 7 days. */
  hotReceived: number;
  /** Last day away (YYYY-MM-DD), when on leave today. */
  leaveUntil: string | null;
}

export interface LoadsData {
  bdas: BdaLoad[];
  /** The BDA who got the last lead of the last equal distribution; the next one continues after them. */
  cursorUserId: string | null;
}

export interface DistributeResult {
  assigned: number;
  skipped: number;
  perPerson: Array<{ id: string; name: string; count: number }>;
}

export interface HistoryEntry {
  id: string;
  at: string;
  by: string;
  count: number;
  method: "BULK" | "EQUAL_DISTRIBUTION";
  people: string[];
}

export const assignmentKeys = {
  queue: (q: QueueQuery) => ["assignment", "queue", q] as const,
  loads: ["assignment", "loads"] as const,
  history: ["assignment", "history"] as const,
  summary: ["assignment", "summary"] as const,
};

export async function getQueue(q: QueueQuery): Promise<QueueData> {
  const params: Record<string, string | number> = { tab: q.tab, limit: q.limit };
  if (q.sourceId !== null) params.sourceId = q.sourceId;
  if (q.depth) params.depth = q.depth;
  if (q.temperature) params.temperature = q.temperature;
  if (q.wait) params.wait = q.wait;
  const { data } = await api.get<QueueData>("/assignment/queue", { params });
  return data;
}

export async function getWaitingCount(): Promise<number> {
  const { data } = await api.get<{ waiting: number }>("/assignment/summary");
  return data.waiting;
}

export async function getLoads(): Promise<LoadsData> {
  const { data } = await api.get<LoadsData>("/assignment/loads");
  return data;
}

export async function distribute(input: { leadIds: string[]; toUserIds: string[] }): Promise<DistributeResult> {
  const { data } = await api.post<DistributeResult>("/assignment/distribute", input);
  return data;
}

/** `until` is the last day away (YYYY-MM-DD); null brings the person back. */
export async function setLeave(input: { userId: string; until: string | null }): Promise<void> {
  await api.post("/assignment/leave", input);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const { data } = await api.get<{ history: HistoryEntry[] }>("/assignment/history");
  return data.history;
}

/**
 * The same round robin the API runs: lead i goes to people[(start + i) % people.length], where the first
 * person is whoever comes after the last person to get a lead.
 */
export function planShares(count: number, people: string[], cursorUserId: string | null): { shares: Record<string, number>; lastId: string | null } {
  const shares: Record<string, number> = Object.fromEntries(people.map((p) => [p, 0]));
  if (people.length === 0 || count === 0) return { shares, lastId: null };
  const after = cursorUserId ? people.indexOf(cursorUserId) : -1;
  const start = after === -1 ? 0 : (after + 1) % people.length;
  for (let i = 0; i < count; i++) shares[people[(start + i) % people.length]!]! += 1;
  return { shares, lastId: people[(start + count - 1) % people.length]! };
}
