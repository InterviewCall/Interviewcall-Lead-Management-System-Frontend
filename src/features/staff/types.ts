import type { Role } from "@/lib/roles";

export type StaffStatus = "PENDING" | "ACTIVE" | "DEACTIVATED";

/** A row of `GET /staff`. */
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  /** International form, or null for an account made before phone numbers were required. */
  phone: string | null;
  role: Role;
  status: StaffStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface StaffPage {
  staff: StaffMember[];
  page: number;
  pageSize: number;
  total: number;
}

export interface StaffListParams {
  search?: string;
  role?: Role;
  status?: StaffStatus;
  page: number;
  pageSize: number;
}

export interface InviteStaffInput {
  name: string;
  email: string;
  phone: string;
  role: Role;
}

export interface UpdateStaffInput {
  name?: string;
  phone?: string;
  role?: Role;
}
