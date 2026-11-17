import { api } from "@/lib/api/client";

export const adminKeys = {
  audit: (q: AuditFilters) => ["admin", "audit", q] as const,
  actions: ["admin", "audit", "actions"] as const,
  settings: ["admin", "settings"] as const,
};

export interface AuditFilters { action: string; actorId: string; entityId: string; from: string; to: string; page: number }

export interface AuditEntry {
  id: string;
  at: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: Record<string, unknown> | null;
  ip: string | null;
  actor: { id: string; name: string } | null;
}
export interface AuditPage { total: number; page: number; pageSize: number; entries: AuditEntry[] }

export const AUDIT_PAGE_SIZE = 50;

export async function fetchAudit(f: AuditFilters): Promise<AuditPage> {
  const params: Record<string, string | number> = { page: f.page, pageSize: AUDIT_PAGE_SIZE };
  if (f.action) params.action = f.action;
  if (f.actorId) params.actorId = f.actorId;
  if (f.entityId.trim()) params.entityId = f.entityId.trim();
  if (f.from) params.from = f.from;
  if (f.to) params.to = f.to;
  const { data } = await api.get<AuditPage>("/admin/audit", { params });
  return data;
}

export async function fetchAuditActions(): Promise<string[]> {
  const { data } = await api.get<{ actions: string[] }>("/admin/audit/actions");
  return data.actions;
}

export interface SettingRow { key: string; label: string; help: string; unit: string; value: number; default: number; min: number; max: number }

export async function fetchSettings(): Promise<SettingRow[]> {
  const { data } = await api.get<{ settings: SettingRow[] }>("/admin/settings");
  return data.settings;
}

export async function saveSettings(input: Record<string, number>): Promise<SettingRow[]> {
  const { data } = await api.patch<{ settings: SettingRow[] }>("/admin/settings", input);
  return data.settings;
}
