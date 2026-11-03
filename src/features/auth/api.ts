import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { ChangePasswordInput, LoginInput, SessionUser } from "./types";

export const authKeys = { me: ["auth", "me"] as const };

/** `null` means nobody is signed in (or the sign-in has expired). */
export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const { data } = await api.get<{ user: SessionUser }>("/auth/me");
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function login(input: LoginInput): Promise<SessionUser> {
  const { data } = await api.post<{ user: SessionUser }>("/auth/login", input);
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function changePassword(input: ChangePasswordInput): Promise<SessionUser> {
  const { data } = await api.post<{ user: SessionUser }>("/auth/password", input);
  return data.user;
}
