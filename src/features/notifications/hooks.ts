import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getInbox, markAllRead, markRead } from "./api";

export const inboxKey = ["notifications"] as const;

/** Asks again every minute and when the tab comes back into view: that is also what raises "call starting soon". */
export function useInbox() {
  return useQuery({ queryKey: inboxKey, queryFn: getInbox, refetchInterval: 60_000, refetchOnWindowFocus: true });
}

export function useInboxActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: inboxKey });
  return {
    read: useMutation({ mutationFn: markRead, onSuccess: refresh }),
    readAll: useMutation({ mutationFn: markAllRead, onSuccess: refresh }),
  };
}
