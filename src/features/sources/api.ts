import { api } from "@/lib/api/client";

/** Kinds of source an admin may choose; WorkR, VSL and CSV import belong to the CRM's own sources. */
export type SourceGroup = "WORKR" | "VSL" | "META" | "ORGANIC" | "IMPORT" | "REFERRAL" | "OTHER";
export const MANUAL_GROUPS = ["REFERRAL", "ORGANIC", "META", "OTHER"] as const;
export type ManualGroup = (typeof MANUAL_GROUPS)[number];

export const GROUP_LABEL: Record<SourceGroup, string> = {
  WORKR: "WorkR",
  VSL: "VSL",
  META: "Meta ads",
  ORGANIC: "Organic",
  IMPORT: "CSV import",
  REFERRAL: "Referral",
  OTHER: "Other",
};

export interface LeadSource {
  id: number;
  name: string;
  group: SourceGroup;
  isActive: boolean;
  /** Used by the CRM itself: cannot be renamed or switched off. */
  system: boolean;
  leads: number;
  createdAt: string;
}

export const sourceKeys = { all: ["sources"] as const };

export async function listSources(): Promise<LeadSource[]> {
  const { data } = await api.get<{ sources: LeadSource[] }>("/sources");
  return data.sources;
}

export async function createSource(input: { name: string; group: ManualGroup }): Promise<LeadSource> {
  const { data } = await api.post<LeadSource>("/sources", input);
  return data;
}

export async function updateSource(id: number, input: { name?: string; group?: ManualGroup; isActive?: boolean }): Promise<LeadSource> {
  const { data } = await api.patch<LeadSource>(`/sources/${id}`, input);
  return data;
}
