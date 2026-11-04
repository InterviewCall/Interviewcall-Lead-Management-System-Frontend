import { MOCK_LEADS } from "@/mock/leads";
import { STAGES, type MockLead, type Stage, type Temperature } from "@/mock/types";

/**
 * MOCK: built from the sample leads. Swap the body for `api.get("/pipeline", { params })`.
 */
const wait = (ms = 250) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface PipelineQuery {
  temperature: Temperature | "";
  owner: string;
}

export interface PipelineColumn {
  stage: Stage;
  count: number;
  leads: MockLead[];
}

export interface PipelineData {
  columns: PipelineColumn[];
  open: number;
  won: number;
  /** Won as a share of all opportunities, open, won and lost. 0–100. */
  winRate: number;
  owners: string[];
}

export const pipelineKeys = { all: (q: PipelineQuery) => ["pipeline", q] as const };

export async function getPipeline(q: PipelineQuery): Promise<PipelineData> {
  await wait();
  const visible = MOCK_LEADS.filter(
    (l) =>
      l.lifecycle !== "Lost" &&
      (!q.temperature || l.temperature === q.temperature) &&
      (!q.owner || (q.owner === "__none" ? l.owner === null : l.owner === q.owner)),
  );
  const columns = STAGES.map((stage) => {
    // Most recently moved first, so a card you just dropped in is the one you see.
    const leads = visible.filter((l) => l.stage === stage).sort((a, b) => (b.stageChangedAt ?? "").localeCompare(a.stageChangedAt ?? ""));
    return { stage, count: leads.length, leads };
  });
  const won = columns.find((c) => c.stage === "Closed Won")?.count ?? 0;
  const lost = MOCK_LEADS.filter((l) => l.lifecycle === "Lost").length;
  const open = visible.length - won;
  const everything = won + lost + open;
  const owners = Array.from(new Set(MOCK_LEADS.map((l) => l.owner).filter((o): o is string => o !== null))).sort();
  return { columns, open, won, winRate: everything === 0 ? 0 : (won / everything) * 100, owners };
}

/**
 * The board as it will look after `id` moves to `stage`. Used for the optimistic update, so the card
 * lands in its new column straight away instead of after the server answers.
 */
export function applyMove(data: PipelineData, id: string, stage: Stage): PipelineData {
  const lead = data.columns.flatMap((c) => c.leads).find((l) => l.id === id);
  if (!lead || lead.stage === stage) return data;
  const moved: MockLead = { ...lead, stage, stageChangedAt: new Date().toISOString() };
  const columns = data.columns.map((c) => {
    const leads = c.stage === stage ? [moved, ...c.leads.filter((l) => l.id !== id)] : c.leads.filter((l) => l.id !== id);
    return { ...c, leads, count: leads.length };
  });
  const won = columns.find((c) => c.stage === "Closed Won")?.count ?? 0;
  const total = columns.reduce((n, c) => n + c.count, 0);
  return { ...data, columns, won, open: total - won, winRate: total === 0 ? 0 : (won / total) * 100 };
}
