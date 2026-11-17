import { api } from "@/lib/api/client";

export const outcomeKeys = { outcomes: ["outcomes", "admin"] as const, reasons: ["lost-reasons", "admin"] as const };

export type OutcomeLifecycle = "ENGAGED_LEAD" | "PROSPECT" | "NOT_INTERESTED";

export interface OutcomeRow {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  requiresFollowup: boolean;
  connected: boolean | null;
  conversation: boolean;
  countsAsAttempt: boolean;
  lifecycle: OutcomeLifecycle | null;
  lostReason: string | null;
  used: number;
}

export interface OutcomeInput {
  name: string;
  requiresFollowup: boolean;
  connected: boolean | null;
  conversation: boolean;
  countsAsAttempt: boolean;
  lifecycle: OutcomeLifecycle | null;
  lostReason: string | null;
}

export interface ReasonRow { id: number; name: string; isActive: boolean; sortOrder: number; used: number }

export const LIFECYCLE_LABEL: Record<OutcomeLifecycle, string> = {
  ENGAGED_LEAD: "Engaged lead",
  PROSPECT: "Prospect",
  NOT_INTERESTED: "Not interested",
};

export async function listOutcomes(): Promise<OutcomeRow[]> {
  const { data } = await api.get<OutcomeRow[]>("/engagement/outcomes/all");
  return data;
}
export async function createOutcome(input: OutcomeInput): Promise<OutcomeRow[]> {
  const { data } = await api.post<OutcomeRow[]>("/engagement/outcomes", input);
  return data;
}
export async function updateOutcome(id: number, input: Partial<OutcomeInput> & { isActive?: boolean; sortOrder?: number }): Promise<OutcomeRow[]> {
  const { data } = await api.patch<OutcomeRow[]>(`/engagement/outcomes/${id}`, input);
  return data;
}
export async function listReasons(): Promise<ReasonRow[]> {
  const { data } = await api.get<ReasonRow[]>("/pipeline/lost-reasons/all");
  return data;
}
export async function createReason(name: string): Promise<ReasonRow[]> {
  const { data } = await api.post<ReasonRow[]>("/pipeline/lost-reasons", { name });
  return data;
}
export async function updateReason(id: number, input: { name?: string; isActive?: boolean; sortOrder?: number }): Promise<ReasonRow[]> {
  const { data } = await api.patch<ReasonRow[]>(`/pipeline/lost-reasons/${id}`, input);
  return data;
}
