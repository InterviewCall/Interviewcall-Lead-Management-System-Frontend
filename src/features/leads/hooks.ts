"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelTask, changeOwner, updateTask, completeTask, createLead, createTask, editLead, fetchAssignees, fetchEngagement, fetchLeadDetail, fetchLeadFilters, fetchLostReasons,
  fetchOutcomes, leadKeys, listLeads, loseOpportunity, logActivity, markWon, mergeLead, moveOpportunity, reopenOpportunity, savePayment, setContactStage, setDoNotContact, anonymiseLead,
  type LeadEdit, type PaymentInput,
} from "./api";
import type { Engagement, LeadDetail, LeadQuery, LogActivityInput } from "./types";

export function useLeads(query: LeadQuery) {
  return useQuery({ queryKey: leadKeys.list(query), queryFn: () => listLeads(query), placeholderData: keepPreviousData });
}

/** How many leads the signed-in person can see, for the sidebar pill. */
export function useLeadTotal(): number | undefined {
  const query: LeadQuery = { view: "all", search: "", sourceId: null, temperature: "", stage: "", lifecycle: "", ownerId: "", listId: "", page: 1, pageSize: 1 };
  return useQuery({ queryKey: leadKeys.list(query), queryFn: () => listLeads(query), staleTime: 30_000 }).data?.counts.all;
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      for (const key of ["leads", "pipeline", "assignment", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

/** People a lead can be given to. Only managers and admins may ask. */
export function useAssignees(enabled: boolean) {
  return useQuery({ queryKey: ["assignment", "assignees"], queryFn: fetchAssignees, enabled, staleTime: 60_000 });
}

export function useLeadDetail(id: string) {
  return useQuery({ queryKey: leadKeys.real(id), queryFn: () => fetchLeadDetail(id) });
}

export function useLeadFilters() {
  return useQuery({ queryKey: leadKeys.filters, queryFn: fetchLeadFilters, staleTime: 60_000 });
}


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
    doNotContact: useMutation({
      mutationFn: (input: Parameters<typeof setDoNotContact>[1]) => setDoNotContact(id, input),
      onSuccess: (detail: LeadDetail) => {
        onSuccess(detail);
        for (const key of ["my-day", "follow-ups"]) void queryClient.invalidateQueries({ queryKey: [key] });
      },
    }),
    anonymise: useMutation({
      mutationFn: (reason: string) => anonymiseLead(id, reason),
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: leadKeys.real(id) });
        for (const key of ["leads", "pipeline", "assignment", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
      },
    }),
    moveStage: useMutation({ mutationFn: (input: { stage: Parameters<typeof moveOpportunity>[1]; date?: string }) => moveOpportunity(id, input.stage, input.date), onSuccess }),
    lose: useMutation({ mutationFn: (input: Parameters<typeof loseOpportunity>[1]) => loseOpportunity(id, input), onSuccess }),
    reopen: useMutation({ mutationFn: () => reopenOpportunity(id), onSuccess }),
    edit: useMutation({ mutationFn: (input: LeadEdit) => editLead(id, input), onSuccess }),
    won: useMutation({ mutationFn: (input: PaymentInput & { wonOn: string }) => markWon(id, input), onSuccess }),
    payment: useMutation({ mutationFn: (input: PaymentInput) => savePayment(id, input), onSuccess }),
    merge: useMutation({ mutationFn: (duplicateId: string) => mergeLead(id, duplicateId), onSuccess }),
    owner: useMutation({
      mutationFn: (toUserId: string) => changeOwner(id, toUserId),
      onSuccess: () => {
        for (const key of ["leads", "pipeline", "assignment", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
      },
    }),
  };
}

// ---- calls, messages, notes and follow-ups ----

export function useOutcomes() {
  return useQuery({ queryKey: ["leads", "outcomes"], queryFn: fetchOutcomes, staleTime: 5 * 60_000 });
}

/** The lead's logged activities (with notes) and its tasks. */
export function useEngagement(id: string) {
  return useQuery({ queryKey: leadKeys.engagement(id), queryFn: () => fetchEngagement(id) });
}

/**
 * Logging an activity answers with the refreshed lead, which goes straight into the page; the activities and tasks
 * refetch. Task actions answer with the refreshed activities and tasks, and the lead (its timeline, its next
 * follow-up) refetches.
 */
export function useEngagementActions(id: string) {
  const queryClient = useQueryClient();
  const refreshLists = () => {
    void queryClient.invalidateQueries({ queryKey: ["leads", "list"] });
    void queryClient.invalidateQueries({ queryKey: ["my-day"] });
  };
  const onTasks = (data: Engagement) => {
    queryClient.setQueryData(leadKeys.engagement(id), data);
    void queryClient.invalidateQueries({ queryKey: leadKeys.real(id) });
    refreshLists();
  };
  return {
    log: useMutation({
      mutationFn: (input: LogActivityInput) => logActivity(id, input),
      onSuccess: (detail: LeadDetail) => {
        queryClient.setQueryData(leadKeys.real(id), detail);
        void queryClient.invalidateQueries({ queryKey: leadKeys.engagement(id) });
        refreshLists();
      },
    }),
    createTask: useMutation({ mutationFn: (input: { title: string; dueAt: string }) => createTask(id, input), onSuccess: onTasks }),
    complete: useMutation({ mutationFn: (taskId: string) => completeTask(taskId), onSuccess: onTasks }),
    cancel: useMutation({ mutationFn: (taskId: string) => cancelTask(taskId), onSuccess: onTasks }),
    update: useMutation({ mutationFn: (v: { taskId: string; title?: string; dueAt?: string; assigneeId?: string }) => updateTask(v.taskId, { title: v.title, dueAt: v.dueAt, assigneeId: v.assigneeId }), onSuccess: onTasks }),
  };
}
