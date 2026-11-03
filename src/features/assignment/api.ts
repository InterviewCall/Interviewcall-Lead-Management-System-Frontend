import { BDAS } from "@/mock/people";
import { stableHash, companyRole } from "@/mock/people";
import { MOCK_LEADS } from "@/mock/leads";
import type { MockLead, Temperature } from "@/mock/types";

/**
 * MOCK: assignment changes the sample leads in memory, so Leads and Pipeline reflect them.
 * Swap the bodies for `api.get("/assignment/queue")` and `api.post("/assignment/distribute")`.
 */
const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type VslDepth = "Booked slot" | "Full form" | "Details" | "Signup only";
export const VSL_DEPTHS: VslDepth[] = ["Booked slot", "Full form", "Details", "Signup only"];
export type QueueTab = "all" | "booked" | "hot";
export type WaitBucket = "" | "lt6" | "6to24" | "gt24";

export interface QueueItem {
  lead: MockLead;
  depth: VslDepth;
  waitingHours: number;
  /** Second line under the name: the booked slot, or role and company. */
  subtitle: string;
}

function depthOf(lead: MockLead): VslDepth {
  if (lead.next.kind === "booked") return "Booked slot";
  if (lead.source.startsWith("VSL")) return stableHash(lead.id) % 2 === 0 ? "Full form" : "Details";
  if (lead.source === "Meta ads") return "Details";
  return "Signup only";
}

function toItem(lead: MockLead): QueueItem {
  const depth = depthOf(lead);
  const { company, role } = companyRole(lead);
  return {
    lead,
    depth,
    waitingHours: 1 + (stableHash(lead.id) % 36),
    subtitle: depth === "Booked slot" ? lead.next.text : `${role} · ${company}`,
  };
}

const DEPTH_RANK: Record<VslDepth, number> = { "Booked slot": 0, "Full form": 1, Details: 2, "Signup only": 3 };
const TEMP_RANK: Record<Temperature, number> = { Hot: 0, Warm: 1, Cold: 2 };

export interface QueueQuery {
  tab: QueueTab;
  source: string;
  depth: VslDepth | "";
  temperature: Temperature | "";
  wait: WaitBucket;
  limit: number;
}

export interface QueueData {
  items: QueueItem[];
  /** Everything that matches the filters, for "select all". */
  matchingIds: string[];
  total: number;
  counts: Record<QueueTab, number>;
  sources: string[];
}

export interface BdaLoad {
  name: string;
  open: number;
  hotReceived: number;
  leaveUntil?: string;
}

export interface HistoryEntry {
  id: string;
  at: string;
  by: string;
  count: number;
  bdas: string[];
}

const history: HistoryEntry[] = [
  { id: "h-seed-1", at: "2026-11-02T09:14:00.000Z", by: "Sunyul Hossen", count: 24, bdas: ["Aarav Bose", "Sneha Banerjee", "Vikram Singh", "Meera Pillai"] },
  { id: "h-seed-2", at: "2026-11-01T06:02:00.000Z", by: "Sunyul Hossen", count: 3, bdas: ["Tanvi Shah"] },
];

/** Where the round robin carries on from, so the next batch starts after the last person. */
let cursor = 0;

export const assignmentKeys = {
  queue: (q: QueueQuery) => ["assignment", "queue", q] as const,
  bdas: ["assignment", "bdas"] as const,
  history: ["assignment", "history"] as const,
};

export async function getQueue(q: QueueQuery): Promise<QueueData> {
  await wait();
  const all = MOCK_LEADS.filter((l) => l.owner === null && l.lifecycle !== "Lost" && l.stage !== "Closed Won").map(toItem);
  const counts: Record<QueueTab, number> = {
    all: all.length,
    booked: all.filter((i) => i.depth === "Booked slot").length,
    hot: all.filter((i) => i.lead.temperature === "Hot").length,
  };
  const filtered = all
    .filter((i) => (q.tab === "booked" ? i.depth === "Booked slot" : q.tab === "hot" ? i.lead.temperature === "Hot" : true))
    .filter((i) => !q.source || i.lead.source === q.source)
    .filter((i) => !q.depth || i.depth === q.depth)
    .filter((i) => !q.temperature || i.lead.temperature === q.temperature)
    .filter((i) => (q.wait === "lt6" ? i.waitingHours < 6 : q.wait === "6to24" ? i.waitingHours >= 6 && i.waitingHours < 24 : q.wait === "gt24" ? i.waitingHours >= 24 : true))
    .sort((a, b) => DEPTH_RANK[a.depth] - DEPTH_RANK[b.depth] || TEMP_RANK[a.lead.temperature] - TEMP_RANK[b.lead.temperature] || b.waitingHours - a.waitingHours);
  return {
    items: filtered.slice(0, q.limit),
    matchingIds: filtered.map((i) => i.lead.id),
    total: filtered.length,
    counts,
    sources: Array.from(new Set(all.map((i) => i.lead.source))).sort(),
  };
}

export async function getBdaLoads(): Promise<{ bdas: BdaLoad[]; cursorAfter: string | null }> {
  await wait(150);
  const bdas = BDAS.map((b) => ({
    name: b.name,
    leaveUntil: b.leaveUntil,
    open: MOCK_LEADS.filter((l) => l.owner === b.name && l.stage !== "Closed Won" && l.lifecycle !== "Lost").length,
    hotReceived: MOCK_LEADS.filter((l) => l.owner === b.name && l.temperature === "Hot").length,
  }));
  const available = BDAS.filter((b) => !b.leaveUntil);
  return { bdas, cursorAfter: available.length ? available[(cursor - 1 + available.length) % available.length]!.name : null };
}

/** The same round robin the API will run: lead i goes to people[(cursor + i) % people.length]. */
export function planShares(count: number, people: string[], start: number): Record<string, number> {
  const shares: Record<string, number> = Object.fromEntries(people.map((p) => [p, 0]));
  if (people.length === 0) return shares;
  for (let i = 0; i < count; i++) shares[people[(start + i) % people.length]!]! += 1;
  return shares;
}

export function currentCursor(): number {
  return cursor;
}

export interface AssignInput {
  leadIds: string[];
  /** BDAs to share the leads between, in the order they appear in the panel. */
  bdas: string[];
  by: string;
}

export async function assignLeads(input: AssignInput): Promise<{ assigned: number }> {
  await wait(450);
  if (input.bdas.length === 0) throw new Error("Pick at least one BDA.");
  const byId = new Map(MOCK_LEADS.map((l) => [l.id, l]));
  // Booked calls first, as the queue promises.
  const leads = input.leadIds
    .map((id) => byId.get(id))
    .filter((l): l is MockLead => l !== undefined && l.owner === null)
    .sort((a, b) => Number(b.next.kind === "booked") - Number(a.next.kind === "booked"));
  leads.forEach((lead, i) => {
    lead.owner = input.bdas[(cursor + i) % input.bdas.length]!;
    if (lead.next.kind === "none") lead.next = { text: "Call within 1 hour", kind: "task" };
  });
  cursor = (cursor + leads.length) % input.bdas.length;
  history.unshift({ id: `h-${Date.now()}`, at: new Date().toISOString(), by: input.by, count: leads.length, bdas: input.bdas });
  return { assigned: leads.length };
}

export async function getHistory(): Promise<HistoryEntry[]> {
  await wait(150);
  return [...history];
}
