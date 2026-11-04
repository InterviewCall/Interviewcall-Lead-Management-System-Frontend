import { api } from "@/lib/api/client";

export type EventStatus = "Processed" | "Failed" | "Dead" | "Received";
export type EventFilter = "all" | "failed" | "dead" | "processed";

export interface IntakeEvent {
  id: string;
  at: string;
  source: string;
  event: string;
  status: EventStatus;
  tries: number;
  /** Lead name when processed, otherwise the error or queue note. */
  detail: string;
  /** Opens the lead, when the event made or matched one. */
  leadId: string | null;
}

export type SourceSystem = "WORKR" | "VSL_FORM" | "VSL_BOOKING";

export interface SourceHealth {
  id: SourceSystem;
  name: string;
  events: string;
  status: "Healthy" | "Quiet" | "Never";
  lastEvent: string | null;
  today: number;
  /** Events per hour for the last 12 hours, oldest first. */
  spark: number[];
}

export interface IntakeSummary {
  received: number;
  processed: number;
  failed: number;
  dead: number;
  created: number;
  sources: SourceHealth[];
}

export interface SourceKey {
  id: number;
  name: string;
  system: SourceSystem;
  prefix: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export const SYSTEM_LABEL: Record<SourceSystem, string> = {
  WORKR: "WorkR · User-Service",
  VSL_FORM: "VSL · candidate form",
  VSL_BOOKING: "VSL · slot booking",
};

/** The header the sender puts its key in. */
export const KEY_HEADER = "x-intake-key";

export const intakeKeys = {
  events: (filter: EventFilter) => ["intake", "events", filter] as const,
  summary: ["intake", "summary"] as const,
  sourceKeys: ["intake", "source-keys"] as const,
};

export async function listEvents(filter: EventFilter): Promise<IntakeEvent[]> {
  const { data } = await api.get<{ events: IntakeEvent[] }>("/intake/events", { params: { status: filter, limit: 100 } });
  return data.events;
}

export async function fetchSummary(): Promise<IntakeSummary> {
  const { data } = await api.get<IntakeSummary>("/intake/summary");
  return data;
}

export async function retryEvent(id: string): Promise<void> {
  await api.post(`/intake/events/${id}/retry`);
}

export async function listSourceKeys(): Promise<SourceKey[]> {
  const { data } = await api.get<{ keys: SourceKey[] }>("/source-keys");
  return data.keys;
}

/** The returned `key` is shown once; only its hash is kept. */
export async function createSourceKey(input: { name: string; system: SourceSystem }): Promise<{ key: string; sourceKey: SourceKey }> {
  const { data } = await api.post<{ key: string; sourceKey: SourceKey }>("/source-keys", input);
  return data;
}

export async function revokeSourceKey(id: number): Promise<void> {
  await api.post(`/source-keys/${id}/revoke`);
}
