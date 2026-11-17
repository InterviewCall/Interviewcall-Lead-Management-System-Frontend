import { api } from "@/lib/api/client";
import type { CustomFieldDef, CustomFieldType } from "@/features/leads/types";

export const fieldKeys = { all: ["custom-fields"] as const };

export const TYPE_LABEL: Record<CustomFieldType, string> = {
  TEXT: "Short text",
  NUMBER: "Number",
  DATE: "Date",
  SELECT: "Pick one",
  MULTISELECT: "Pick several",
  BOOLEAN: "Yes or no",
};

export const FIELD_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "SALES_MANAGER", label: "Sales manager" },
  { value: "BDA", label: "BDA" },
  { value: "CLOSER", label: "Closer" },
  { value: "OPS", label: "Ops" },
] as const;

export async function listFields(): Promise<CustomFieldDef[]> {
  const { data } = await api.get<{ fields: CustomFieldDef[] }>("/custom-fields");
  return data.fields;
}

export interface NewField { label: string; type: CustomFieldType; options: string[]; isRequired: boolean; visibleRoles: string[] }

export async function createField(input: NewField): Promise<CustomFieldDef> {
  const { data } = await api.post<CustomFieldDef>("/custom-fields", input);
  return data;
}

export async function updateField(key: string, input: Partial<Pick<NewField, "label" | "options" | "isRequired" | "visibleRoles">> & { isActive?: boolean }): Promise<CustomFieldDef> {
  const { data } = await api.patch<CustomFieldDef>(`/custom-fields/${key}`, input);
  return data;
}
