"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moveStage } from "@/features/leads/api";
import type { Stage } from "@/mock/types";
import { applyMove, type PipelineData } from "./api";

/** Drag a card to another column. The board updates at once and rolls back if the server refuses. */
export function useMoveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) => moveStage(id, stage),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline"] });
      const snapshots = queryClient.getQueriesData<PipelineData>({ queryKey: ["pipeline"] });
      queryClient.setQueriesData<PipelineData>({ queryKey: ["pipeline"] }, (old) => (old ? applyMove(old, id, stage) : old));
      return { snapshots };
    },
    onError: (_error, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      for (const key of ["pipeline", "leads", "assignment", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}
