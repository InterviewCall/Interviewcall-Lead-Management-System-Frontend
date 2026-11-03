"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignLeads, assignmentKeys, getBdaLoads, getHistory, getQueue, type QueueQuery } from "./api";

export const useQueue = (q: QueueQuery) => useQuery({ queryKey: assignmentKeys.queue(q), queryFn: () => getQueue(q), placeholderData: keepPreviousData });
export const useBdaLoads = () => useQuery({ queryKey: assignmentKeys.bdas, queryFn: getBdaLoads });
export const useAssignmentHistory = (enabled: boolean) => useQuery({ queryKey: assignmentKeys.history, queryFn: getHistory, enabled });

export function useAssign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignLeads,
    onSuccess: () => {
      for (const key of ["assignment", "leads", "pipeline", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}
