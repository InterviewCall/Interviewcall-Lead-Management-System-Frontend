import { addMockEvent, mockDetailFor, type LeadDetail } from "@/mock/lead-detail";
import { MOCK_LEADS, findMockLead } from "@/mock/leads";
import type { MockLead, Stage, Temperature } from "@/mock/types";

/**
 * MOCK: the leads API does not exist yet. When it does, replace the bodies with
 * `api.get("/leads", { params })` and keep the signatures.
 */
const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type LeadView = "all" | "mine" | "unassigned" | "booked" | "hot" | "due";

export interface LeadQuery {
  view: LeadView;
  search: string;
  source: string;
  temperature: Temperature | "";
  stage: Stage | "";
  owner: string;
  page: number;
  pageSize: number;
  /** Name of the signed-in user, for the "My leads" view. */
  me: string;
}

export interface LeadPage {
  leads: MockLead[];
  total: number;
  counts: Record<LeadView, number>;
}

function matchesView(lead: MockLead, view: LeadView, me: string): boolean {
  switch (view) {
    case "mine": return lead.owner === me || lead.owner === "Aarav Bose";
    case "unassigned": return lead.owner === null;
    case "booked": return lead.next.kind === "booked";
    case "hot": return lead.temperature === "Hot";
    case "due": return lead.next.kind === "task";
    default: return true;
  }
}

export const leadKeys = {
  list: (q: LeadQuery) => ["leads", "list", q] as const,
  detail: (id: string) => ["leads", "detail", id] as const,
  full: (id: string) => ["leads", "full", id] as const,
};

export async function listLeads(q: LeadQuery): Promise<LeadPage> {
  await wait();
  const needle = q.search.trim().toLowerCase();
  const filtered = MOCK_LEADS.filter(
    (l) =>
      matchesView(l, q.view, q.me) &&
      (!q.source || l.source === q.source) &&
      (!q.temperature || l.temperature === q.temperature) &&
      (!q.stage || l.stage === q.stage) &&
      (!q.owner || (q.owner === "__none" ? l.owner === null : l.owner === q.owner)) &&
      (!needle || l.name.toLowerCase().includes(needle) || l.email.toLowerCase().includes(needle) || l.phone.replace(/\s/g, "").includes(needle.replace(/\s/g, ""))),
  );
  const views: LeadView[] = ["all", "mine", "unassigned", "booked", "hot", "due"];
  const counts = Object.fromEntries(views.map((v) => [v, MOCK_LEADS.filter((l) => matchesView(l, v, q.me)).length])) as Record<LeadView, number>;
  const start = (q.page - 1) * q.pageSize;
  return { leads: filtered.slice(start, start + q.pageSize), total: filtered.length, counts };
}

export async function getLead(id: string): Promise<MockLead | null> {
  await wait(150);
  return findMockLead(id) ?? null;
}

export const LEAD_SOURCES = Array.from(new Set(MOCK_LEADS.map((l) => l.source))).sort();

export const LEAD_OWNERS = Array.from(new Set(MOCK_LEADS.map((l) => l.owner).filter((o): o is string => o !== null))).sort();

export interface NewLeadInput { name: string; email: string; phone: string; source: string }

export async function createLead(input: NewLeadInput): Promise<MockLead> {
  await wait(300);
  const lead: MockLead = {
    id: `lead-new-${MOCK_LEADS.length + 1}`,
    name: input.name,
    email: input.email,
    phone: input.phone,
    source: input.source,
    lifecycle: "Marketing Lead",
    stage: "Call 1 Pending",
    temperature: "Cold",
    owner: null,
    next: { text: "Not contacted yet", kind: "none" },
    createdAt: new Date().toISOString(),
  };
  MOCK_LEADS.unshift(lead);
  return lead;
}

export interface LeadWithDetail { lead: MockLead; detail: LeadDetail }

export async function getLeadDetail(id: string): Promise<LeadWithDetail | null> {
  await wait(200);
  const lead = findMockLead(id);
  return lead ? { lead, detail: mockDetailFor(lead) } : null;
}

export interface LogCallInput {
  leadId: string;
  outcome: "Connected" | "No answer" | "Busy" | "Wrong number";
  stage: Stage;
  temperature: Temperature;
  notes: string;
  action: string;
  due: string;
}

export async function logCall(input: LogCallInput): Promise<void> {
  await wait(350);
  const lead = findMockLead(input.leadId);
  if (!lead) throw new Error("Lead not found");
  lead.stage = input.stage;
  lead.temperature = input.temperature;
  lead.next = { text: `${input.action} · ${input.due}`, kind: "task" };
  addMockEvent(input.leadId, {
    id: `call-${Date.now()}`,
    title: "You logged a call",
    sub: input.outcome,
    detail: input.notes || undefined,
    when: "Just now",
    tone: "info",
    kind: "call",
  });
}

export async function moveStage(id: string, stage: Stage): Promise<void> {
  await wait(250);
  const lead = findMockLead(id);
  if (!lead) throw new Error("Lead not found");
  lead.stage = stage;
  addMockEvent(id, { id: `stage-${Date.now()}`, title: `Moved to ${stage}`, sub: "Opportunity stage changed by you", when: "Just now", tone: "primary", kind: "system" });
}

export async function markLost(id: string, reason: string): Promise<void> {
  await wait(250);
  const lead = findMockLead(id);
  if (!lead) throw new Error("Lead not found");
  lead.lifecycle = "Lost";
  addMockEvent(id, { id: `lost-${Date.now()}`, title: "Marked as lost", sub: reason || "No reason given", when: "Just now", tone: "danger", kind: "system" });
}
