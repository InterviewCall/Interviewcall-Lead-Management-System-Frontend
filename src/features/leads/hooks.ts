"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLead, fetchLeadDetail, fetchLeadFilters, fetchLostReasons, getLead, leadKeys, listLeads, loseOpportunity, logCall, markLost,
  moveOpportunity, moveStage, reopenOpportunity, setContactStage,
} from "./api";
import type { LeadDetail, LeadQuery } from "./types";

export function useLeads(query: LeadQuery) {
  return useQuery({ queryKey: leadKeys.list(query), queryFn: () => listLeads(query), placeholderData: keepPreviousData });
}

/** How many leads the signed-in person can see, for the sidebar pill. */
export function useLeadTotal(): number | undefined {
  const query: LeadQuery = { view: "all", search: "", sourceId: null, temperature: "", stage: "", lifecycle: "", ownerId: "", listId: "", page: 1, pageSize: 1 };
  return useQuery({ queryKey: leadKeys.list(query), queryFn: () => listLeads(query), staleTime: 30_000 }).data?.counts.all;
}

export function useLead(id: string) {
  return useQuery({ queryKey: leadKeys.detail(id), queryFn: () => getLead(id) });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createLead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }) });
}

export function useLeadDetail(id: string) {
  return useQuery({ queryKey: leadKeys.real(id), queryFn: () => fetchLeadDetail(id) });
}

export function useLeadFilters() {
  return useQuery({ queryKey: leadKeys.filters, queryFn: fetchLeadFilters, staleTime: 60_000 });
}

function useLeadMutation<TInput>(fn: (input: TInput) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => {
      for (const key of ["leads", "pipeline", "assignment", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

export const useLogCall = () => useLeadMutation(logCall);
export const useMoveStage = () => useLeadMutation(({ id, stage }: { id: string; stage: Parameters<typeof moveStage>[1] }) => moveStage(id, stage));
export const useMarkLost = () => useLeadMutation(({ id, reason }: { id: string; reason: string }) => markLost(id, reason));

export function useLostReasons() {
  return useQuery({ queryKey: ["pipeline", "lost-reasons"], queryFn: fetchLostReasons, staleTime: 5 * 60_000 });
}

/**
 * The marking actions on one lead. Each answers with the refreshed lead, which goes straight into
 * the page. It is not refetched: a closer loses sight of a lead once nothing is open on it, and
 * the answer to their own change is still theirs to see. The lists do refetch.
 */
export function useMarkLead(id: string) {
  const queryClient = useQueryClient();
  const onSuccess = (detail: LeadDetail) => {
    queryClient.setQueryData(leadKeys.real(id), detail);
    void queryClient.invalidateQueries({ queryKey: ["leads", "list"] });
  };
  return {
    contactStage: useMutation({ mutationFn: (stage: Parameters<typeof setContactStage>[1]) => setContactStage(id, stage), onSuccess }),
    moveStage: useMutation({ mutationFn: (stage: Parameters<typeof moveOpportunity>[1]) => moveOpportunity(id, stage), onSuccess }),
    lose: useMutation({ mutationFn: (input: Parameters<typeof loseOpportunity>[1]) => loseOpportunity(id, input), onSuccess }),
    reopen: useMutation({ mutationFn: () => reopenOpportunity(id), onSuccess }),
  };
}
