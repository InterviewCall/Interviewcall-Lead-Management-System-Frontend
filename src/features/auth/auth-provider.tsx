"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";
import { authKeys, fetchMe } from "./api";
import type { SessionUser } from "./types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  /** Ask the API who is signed in again, e.g. after a network failure. */
  retry: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** Keeps "who am I" in React Query and drops everything when the session ends. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    const onExpired = () => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
      queryClient.setQueryData(authKeys.me, null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  const value = useMemo<AuthState>(() => {
    const user = query.data ?? null;
    let status: AuthStatus;
    if (query.isPending) status = "loading";
    else if (query.isError) status = "error";
    else status = user ? "authenticated" : "unauthenticated";
    return { status, user, retry: () => void query.refetch() };
  }, [query]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
