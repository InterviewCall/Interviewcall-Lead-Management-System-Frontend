import type { Role } from "@/lib/roles";

/** The signed-in user, as `GET /auth/me`, login, refresh and change-password return it. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  /** International form, e.g. +919876543210. Null until the person adds one. */
  phone: string | null;
  role: Role;
  /** True while the account still has the temporary password from its invitation. */
  mustChangePassword: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdatePhoneInput {
  phone: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
