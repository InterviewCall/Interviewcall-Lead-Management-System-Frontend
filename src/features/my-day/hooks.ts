import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completeFollowUp, getMyDay, takeLead } from "./api";

export const myDayKey = ["my-day"] as const;

/** The day refreshes itself every minute and whenever the tab comes back into view. */
export function useMyDay(view: "mine" | "team" = "mine") {
  return useQuery({ queryKey: [...myDayKey, view], queryFn: () => getMyDay(view), placeholderData: keepPreviousData, refetchInterval: 60_000, refetchOnWindowFocus: true });
}

export function useMyDayActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    for (const key of ["my-day", "leads", "assignment", "pipeline"]) void queryClient.invalidateQueries({ queryKey: [key] });
  };
  return {
    done: useMutation({ mutationFn: (taskId: string) => completeFollowUp(taskId), onSuccess: refresh }),
    take: useMutation({ mutationFn: (v: { leadId: string; userId: string }) => takeLead(v.leadId, v.userId), onSuccess: refresh }),
  };
}
