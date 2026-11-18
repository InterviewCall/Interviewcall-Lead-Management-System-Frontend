import { api } from "@/lib/api/client";
import type { BulkResult, CustomValue, SavedFilters, SavedView, Enrolment, Engagement, Lead, LeadDetail, LeadFilters, LeadPage, LeadQuery, LifecycleCode, LogActivityInput, LostReason, Outcome, StageCode } from "./types";

export const leadKeys = {
  list: (q: LeadQuery) => ["leads", "list", q] as const,
  filters: ["leads", "filters"] as const,
  real: (id: string) => ["leads", "real", id] as const,
  full: (id: string) => ["leads", "full", id] as const,
  engagement: (id: string) => ["leads", "engagement", id] as const,
};

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
  if (q.from) params.from = q.from;
  if (q.to) params.to = q.to;
  const { data } = await api.get<LeadPage>("/leads", { params });
  return data;
}

/** The leads these filters match, as a CSV file the browser saves. Managers and admins; at most 5,000 rows. */
export async function exportLeads(q: LeadQuery): Promise<{ blob: Blob; filename: string }> {
  const params: Record<string, string | number> = { view: q.view };
  if (q.search.trim()) params.search = q.search.trim();
  if (q.sourceId !== null) params.sourceId = q.sourceId;
  if (q.temperature) params.temperature = q.temperature;
  if (q.stage) params.stage = q.stage;
  if (q.lifecycle) params.lifecycle = q.lifecycle;
  if (q.ownerId) params.ownerId = q.ownerId;
  if (q.listId) params.listId = q.listId;
  if (q.from) params.from = q.from;
  if (q.to) params.to = q.to;
  const res = await api.get<Blob>("/leads/export", { params, responseType: "blob" });
  const name = /filename="([^"]+)"/.exec(String(res.headers["content-disposition"] ?? ""))?.[1];
  return { blob: res.data, filename: name ?? "leads.csv" };
}

// ---- saved views ----

export const savedViewKeys = { all: ["leads", "saved-views"] as const };

export async function listSavedViews(): Promise<SavedView[]> {
  const { data } = await api.get<{ views: SavedView[] }>("/saved-views");
  return data.views;
}

export async function createSavedView(input: { name: string; filters: SavedFilters; shared: boolean }): Promise<SavedView> {
  const { data } = await api.post<SavedView>("/saved-views", input);
  return data;
}

export async function deleteSavedView(id: string): Promise<void> {
  await api.delete(`/saved-views/${id}`);
}

// ---- custom field values ----

export async function setCustomValues(id: string, values: Record<string, CustomValue>): Promise<LeadDetail> {
  const { data } = await api.patch<LeadDetail>(`/leads/${id}/custom`, { values });
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

export async function setDoNotContact(id: string, input: { value: boolean; reason?: string }): Promise<LeadDetail> {
  const { data } = await api.post<LeadDetail>(`/leads/${id}/do-not-contact`, input);
  return data;
}

export async function anonymiseLead(id: string, reason: string): Promise<{ id: string; anonymised: true }> {
  const { data } = await api.post<{ id: string; anonymised: true }>(`/leads/${id}/anonymise`, { reason });
  return data;
}

/** Moves the open opportunity. Test, Psychometric session and Closed Won each need `date` (the day it is scheduled, or the day it was won). */
export async function moveOpportunity(id: string, stage: StageCode, date?: string): Promise<LeadDetail> {
  const { data } = await api.post<LeadDetail>(`/leads/${id}/opportunity/stage`, date ? { stage, date } : { stage });
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

// ---- calls, messages, notes and follow-ups ----

export async function fetchOutcomes(): Promise<Outcome[]> {
  const { data } = await api.get<Outcome[]>("/engagement/outcomes");
  return data;
}

export async function fetchEngagement(id: string): Promise<Engagement> {
  const { data } = await api.get<Engagement>(`/leads/${id}/engagement`);
  return data;
}

/** Answers with the refreshed lead, like the other markings. */
export async function logActivity(id: string, input: LogActivityInput): Promise<LeadDetail> {
  const { data } = await api.post<LeadDetail>(`/leads/${id}/activities`, input);
  return data;
}

export async function createTask(id: string, input: { title: string; dueAt: string }): Promise<Engagement> {
  const { data } = await api.post<Engagement>(`/leads/${id}/tasks`, input);
  return data;
}

export async function updateTask(taskId: string, input: { title?: string; dueAt?: string; assigneeId?: string }): Promise<Engagement> {
  const { data } = await api.patch<Engagement>(`/tasks/${taskId}`, input);
  return data;
}

export async function completeTask(taskId: string): Promise<Engagement> {
  const { data } = await api.post<Engagement>(`/tasks/${taskId}/complete`);
  return data;
}

export async function cancelTask(taskId: string): Promise<Engagement> {
  const { data } = await api.post<Engagement>(`/tasks/${taskId}/cancel`);
  return data;
}

// ---- adding and editing leads ----

export interface NewLeadInput {
  fullName: string;
  phone: string | null;
  email: string | null;
  sourceId: number;
  /** Managers and admins only; a BDA always owns what they add. Null leaves it for the Assignment queue. */
  ownerId: string | null;
  currentCompany: string | null;
  currentCtc: string | null;
  graduationYear: string | null;
  domain: string | null;
}

/** A person already in the CRM, as a 409 LEAD_EXISTS describes them. `id` is null when you may not open the lead. */
export interface ExistingLead {
  id: string | null;
  name: string | null;
  owner: { id: string; name: string } | null;
  canOpen: boolean;
}

export async function createLead(input: NewLeadInput): Promise<{ id: string }> {
  const { data } = await api.post<{ id: string }>("/leads", input);
  return data;
}

export type LeadEdit = Partial<Pick<NewLeadInput, "fullName" | "phone" | "email" | "currentCompany" | "currentCtc" | "graduationYear" | "domain">>;

export async function editLead(id: string, input: LeadEdit): Promise<LeadDetail> {
  const { data } = await api.patch<LeadDetail>(`/leads/${id}`, input);
  return data;
}

export async function fetchAssignees(): Promise<Array<{ id: string; name: string; role: string }>> {
  const { data } = await api.get<{ assignees: Array<{ id: string; name: string; role: string }> }>("/assignment/assignees");
  return data.assignees;
}

export async function changeOwner(id: string, toUserId: string): Promise<void> {
  await api.post("/assignment/bulk", { leadIds: [id], toUserId });
}

// ---- winning, payments and merging ----

export type PaymentInput = Omit<Enrolment, "updatedAt">;

/** Closes the open opportunity as won, with the payment agreed. */
export async function markWon(id: string, input: PaymentInput & { wonOn: string }): Promise<LeadDetail> {
  const { data } = await api.post<LeadDetail>(`/leads/${id}/opportunity/won`, input);
  return data;
}

/** Records or updates the payment of the latest won deal. */
export async function savePayment(id: string, input: PaymentInput): Promise<LeadDetail> {
  const { data } = await api.put<LeadDetail>(`/leads/${id}/enrolment`, input);
  return data;
}

/** Leads with the same name: likely duplicates. */
export async function fetchDuplicates(id: string): Promise<Lead[]> {
  const { data } = await api.get<{ leads: Lead[] }>(`/leads/${id}/duplicates`);
  return data.leads;
}

/** Merges `duplicateId` into this lead, which is kept. */
export async function mergeLead(id: string, duplicateId: string): Promise<LeadDetail> {
  const { data } = await api.post<LeadDetail>(`/leads/${id}/merge`, { duplicateId });
  return data;
}

// ---- bulk actions on the leads list ----

export async function bulkContactStage(leadIds: string[], stage: LifecycleCode): Promise<BulkResult> {
  const { data } = await api.post<BulkResult>("/leads/contact-stage/bulk", { leadIds, stage });
  return data;
}

export async function bulkAddFollowUp(leadIds: string[], input: { title: string; dueAt: string }): Promise<BulkResult> {
  const { data } = await api.post<BulkResult>("/leads/tasks/bulk", { leadIds, ...input });
  return data;
}
