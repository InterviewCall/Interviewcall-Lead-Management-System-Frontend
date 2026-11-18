"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moveOpportunity } from "@/features/leads/api";
import type { StageCode } from "@/features/leads/types";
import { applyMove, pipelineKeys } from "./api";
import type { PipelineData } from "./types";

/** Drag a card to another column. The board updates at once and rolls back if the server refuses. */
export function useMoveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, date }: { id: string; stage: StageCode; date?: string }) => moveOpportunity(id, stage, date),
    onMutate: async ({ id, stage, date }) => {
      await queryClient.cancelQueries({ queryKey: pipelineKeys.board });
      const snapshots = queryClient.getQueriesData<PipelineData>({ queryKey: pipelineKeys.board });
      queryClient.setQueriesData<PipelineData>({ queryKey: pipelineKeys.board }, (old) => (old ? applyMove(old, id, stage, date ?? null) : old));
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
