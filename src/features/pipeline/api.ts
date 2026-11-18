import { api } from "@/lib/api/client";
import type { StageCode } from "@/features/leads/types";
import type { PipelineData, PipelineQuery } from "./types";

export const pipelineKeys = {
  board: ["pipeline", "board"] as const,
  query: (q: PipelineQuery) => ["pipeline", "board", q] as const,
};

export async function getPipeline(q: PipelineQuery): Promise<PipelineData> {
  const params: Record<string, string | number> = { perColumn: q.perColumn };
  if (q.temperature) params.temperature = q.temperature;
  if (q.ownerId) params.ownerId = q.ownerId;
  const { data } = await api.get<PipelineData>("/pipeline", { params });
  return data;
}

/**
 * The board as it will look after `id` moves to `stage`. Used for the optimistic update, so the card
 * lands in its new column straight away instead of after the server answers.
 */
export function applyMove(data: PipelineData, id: string, stage: StageCode, date: string | null = null): PipelineData {
  const from = data.columns.find((c) => c.cards.some((card) => card.id === id));
  const card = from?.cards.find((c) => c.id === id);
  if (!from || !card || from.stage === stage) return data;
  const moved = { ...card, stageChangedAt: new Date().toISOString(), stageOn: stage === "TEST" || stage === "PSYCHOMETRIC_SESSION" || stage === "CLOSED_WON" ? date : null };
  const columns = data.columns.map((c) => {
    if (c.stage === from.stage) return { ...c, count: c.count - 1, cards: c.cards.filter((x) => x.id !== id) };
    if (c.stage === stage) return { ...c, count: c.count + 1, cards: [moved, ...c.cards] };
    return c;
  });
  const won = columns.find((c) => c.stage === "CLOSED_WON")?.count ?? data.wonThisMonth;
  const open = columns.reduce((n, c) => (c.stage === "CLOSED_WON" ? n : n + c.count), 0);
  return { ...data, columns, open, wonThisMonth: won };
}
