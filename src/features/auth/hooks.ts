"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys, changePassword, login, logout } from "./api";
import type { SessionUser } from "./types";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (user: SessionUser) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: changePassword,
    onSuccess: (user: SessionUser) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

/** Signs out on the server, then forgets everything this tab knows. A failure still signs out locally. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}
