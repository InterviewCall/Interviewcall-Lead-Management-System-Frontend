import { api } from "@/lib/api/client";
import { ROLES, type Role } from "@/lib/roles";
import type { InviteStaffInput, StaffListParams, StaffMember, StaffPage, StaffStatus, UpdateStaffInput } from "./types";

/** The write endpoints return the changed account without the dates. */
type StaffView = Pick<StaffMember, "id" | "name" | "email" | "role" | "status">;

export const staffKeys = {
  all: ["staff"] as const,
  list: (params: StaffListParams) => ["staff", "list", params] as const,
  counts: ["staff", "counts"] as const,
};

export async function listStaff(params: StaffListParams): Promise<StaffPage> {
  const query: Record<string, string | number> = { page: params.page, pageSize: params.pageSize };
  if (params.search) query.search = params.search;
  if (params.role) query.role = params.role;
  if (params.status) query.status = params.status;
  const { data } = await api.get<StaffPage>("/staff", { params: query });
  return data;
}

export async function inviteStaff(input: InviteStaffInput): Promise<StaffView> {
  const { data } = await api.post<{ staff: StaffView }>("/staff", input);
  return data.staff;
}

export async function updateStaff(id: string, input: UpdateStaffInput): Promise<StaffView> {
  const { data } = await api.patch<{ staff: StaffView }>(`/staff/${id}`, input);
  return data.staff;
}

export async function deactivateStaff(id: string): Promise<StaffView> {
  const { data } = await api.post<{ staff: StaffView }>(`/staff/${id}/deactivate`);
  return data.staff;
}

export async function reactivateStaff(id: string): Promise<StaffView> {
  const { data } = await api.post<{ staff: StaffView }>(`/staff/${id}/reactivate`);
  return data.staff;
}

export async function resetStaffPassword(id: string): Promise<StaffView> {
  const { data } = await api.post<{ staff: StaffView }>(`/staff/${id}/reset-password`);
  return data.staff;
}

export interface StaffCounts {
  byRole: Record<Role, number>;
  active: number;
  pending: number;
  total: number;
}

async function totalOf(filter: { role?: Role; status?: StaffStatus }): Promise<number> {
  const page = await listStaff({ ...filter, page: 1, pageSize: 1 });
  return page.total;
}

/** The numbers on the KPI cards and role tabs: small `pageSize=1` requests that only read `total`. */
export async function fetchStaffCounts(): Promise<StaffCounts> {
  const [roleTotals, active, pending] = await Promise.all([
    Promise.all(ROLES.map((role) => totalOf({ role }))),
    totalOf({ status: "ACTIVE" }),
    totalOf({ status: "PENDING" }),
  ]);
  const byRole = Object.fromEntries(ROLES.map((role, i) => [role, roleTotals[i]!])) as Record<Role, number>;
  return { byRole, active, pending, total: roleTotals.reduce((a, b) => a + b, 0) };
}
