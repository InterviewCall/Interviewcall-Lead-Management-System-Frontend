"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLead, getLead, getLeadDetail, leadKeys, listLeads, logCall, markLost, moveStage, type LeadQuery } from "./api";

export function useLeads(query: LeadQuery) {
  return useQuery({ queryKey: leadKeys.list(query), queryFn: () => listLeads(query), placeholderData: keepPreviousData });
}

export function useLead(id: string) {
  return useQuery({ queryKey: leadKeys.detail(id), queryFn: () => getLead(id) });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createLead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }) });
}

export function useLeadDetail(id: string) {
  return useQuery({ queryKey: leadKeys.full(id), queryFn: () => getLeadDetail(id) });
}

function useLeadMutation<TInput>(fn: (input: TInput) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }) });
}

export const useLogCall = () => useLeadMutation(logCall);
export const useMoveStage = () => useLeadMutation(({ id, stage }: { id: string; stage: Parameters<typeof moveStage>[1] }) => moveStage(id, stage));
export const useMarkLost = () => useLeadMutation(({ id, reason }: { id: string; reason: string }) => markLost(id, reason));
