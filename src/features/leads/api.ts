import { api } from "@/lib/api/client";
import { addMockEvent, mockDetailFor, type LeadDetail as MockLeadDetail } from "@/mock/lead-detail";
import { MOCK_LEADS, findMockLead } from "@/mock/leads";
import type { MockLead, Stage, Temperature } from "@/mock/types";
import type { LeadDetail, LeadFilters, LeadPage, LeadQuery, LifecycleCode, LostReason, StageCode } from "./types";

/**
 * MOCK: the leads API does not exist yet. When it does, replace the bodies with
 * `api.get("/leads", { params })` and keep the signatures.
 */
const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const leadKeys = {
  list: (q: LeadQuery) => ["leads", "list", q] as const,
  filters: ["leads", "filters"] as const,
  real: (id: string) => ["leads", "real", id] as const,
  detail: (id: string) => ["leads", "detail", id] as const,
  full: (id: string) => ["leads", "full", id] as const,
};

export async function getLead(id: string): Promise<MockLead | null> {
  await wait(150);
  return findMockLead(id) ?? null;
}

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

export interface LeadWithDetail { lead: MockLead; detail: MockLeadDetail }

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
  if (lead.stage !== input.stage) lead.stageChangedAt = new Date().toISOString();
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
  lead.stageChangedAt = new Date().toISOString();
  if (stage === "Closed Won") lead.lifecycle = "Customer";
  addMockEvent(id, { id: `stage-${Date.now()}`, title: `Moved to ${stage}`, sub: "Opportunity stage changed by you", when: "Just now", tone: "primary", kind: "system" });
}

export async function markLost(id: string, reason: string): Promise<void> {
  await wait(250);
  const lead = findMockLead(id);
  if (!lead) throw new Error("Lead not found");
  lead.lifecycle = "Lost";
  addMockEvent(id, { id: `lost-${Date.now()}`, title: "Marked as lost", sub: reason || "No reason given", when: "Just now", tone: "danger", kind: "system" });
}

// ---- the real leads API ----

export async function listLeads(q: LeadQuery): Promise<LeadPage> {
  const params: Record<string, string | number> = { view: q.view, page: q.page, pageSize: q.pageSize };
  if (q.search.trim()) params.search = q.search.trim();
  if (q.sourceId !== null) params.sourceId = q.sourceId;
  if (q.temperature) params.temperature = q.temperature;
  if (q.stage) params.stage = q.stage;
  if (q.lifecycle) params.lifecycle = q.lifecycle;
  if (q.ownerId) params.ownerId = q.ownerId;
  if (q.listId) params.listId = q.listId;
  const { data } = await api.get<LeadPage>("/leads", { params });
  return data;
}

export async function fetchLeadFilters(): Promise<LeadFilters> {
  const { data } = await api.get<LeadFilters>("/leads/filters");
  return data;
}

export async function fetchLeadDetail(id: string): Promise<LeadDetail> {
  const { data } = await api.get<LeadDetail>(`/leads/${id}`);
  return data;
}

// ---- marking: each call answers with the refreshed lead ----

export async function setContactStage(id: string, stage: LifecycleCode): Promise<LeadDetail> {
  const { data } = await api.post<LeadDetail>(`/leads/${id}/contact-stage`, { stage });
  return data;
}

export async function moveOpportunity(id: string, stage: StageCode): Promise<LeadDetail> {
  const { data } = await api.post<LeadDetail>(`/leads/${id}/opportunity/stage`, { stage });
  return data;
}

export async function loseOpportunity(id: string, input: { reasonId: number; note: string }): Promise<LeadDetail> {
  const { data } = await api.post<LeadDetail>(`/leads/${id}/opportunity/lost`, { reasonId: input.reasonId, note: input.note.trim() || null });
  return data;
}

export async function reopenOpportunity(id: string): Promise<LeadDetail> {
  const { data } = await api.post<LeadDetail>(`/leads/${id}/opportunity/reopen`);
  return data;
}

export async function fetchLostReasons(): Promise<LostReason[]> {
  const { data } = await api.get<LostReason[]>("/pipeline/lost-reasons");
  return data;
}
