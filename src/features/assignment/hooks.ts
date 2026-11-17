"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { ASSIGN_ROLES } from "@/components/shell/nav";
import { assignmentKeys, distribute, getHistory, getLoads, getQueue, getWaitingCount, setLeave, type QueueQuery } from "./api";

export const useQueue = (q: QueueQuery) => useQuery({ queryKey: assignmentKeys.queue(q), queryFn: () => getQueue(q), placeholderData: keepPreviousData });
export const useBdaLoads = () => useQuery({ queryKey: assignmentKeys.loads, queryFn: getLoads });
export const useAssignmentHistory = (enabled: boolean) => useQuery({ queryKey: assignmentKeys.history, queryFn: getHistory, enabled });

/** How many leads wait for an owner, for the sidebar pill. Only managers and admins may ask. */
export function useWaitingCount(): number | undefined {
  const { user } = useAuth();
  const allowed = Boolean(user && ASSIGN_ROLES.includes(user.role));
  return useQuery({ queryKey: assignmentKeys.summary, queryFn: getWaitingCount, enabled: allowed, staleTime: 30_000, refetchInterval: 60_000 }).data;
}

export function useDistribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distribute,
    onSuccess: () => {
      for (const key of ["assignment", "leads", "pipeline", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

export function useSetLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setLeave,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: assignmentKeys.loads }),
  });
}
