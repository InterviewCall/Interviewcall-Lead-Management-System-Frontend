"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deactivateStaff, fetchStaffCounts, inviteStaff, listStaff, reactivateStaff, resetStaffPassword,
  staffKeys, updateStaff,
} from "./api";
import type { StaffListParams, UpdateStaffInput } from "./types";

export function useStaffList(params: StaffListParams) {
  return useQuery({
    queryKey: staffKeys.list(params),
    queryFn: () => listStaff(params),
    placeholderData: keepPreviousData,
  });
}

export function useStaffCounts() {
  return useQuery({ queryKey: staffKeys.counts, queryFn: fetchStaffCounts });
}

/** Every change reloads the list and the counts: they are cheap and always right. */
function useStaffMutation<TInput, TOutput>(fn: (input: TInput) => Promise<TOutput>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export const useInviteStaff = () => useStaffMutation(inviteStaff);
export const useUpdateStaff = () =>
  useStaffMutation(({ id, ...input }: { id: string } & UpdateStaffInput) => updateStaff(id, input));
export const useDeactivateStaff = () => useStaffMutation(deactivateStaff);
export const useReactivateStaff = () => useStaffMutation(reactivateStaff);
export const useResetStaffPassword = () => useStaffMutation(resetStaffPassword);
