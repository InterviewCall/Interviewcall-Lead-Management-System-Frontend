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
    const leads = visible.filter((l) => l.stage === stage);
    return { stage, count: leads.length, leads };
  });
  const won = columns.find((c) => c.stage === "Closed Won")?.count ?? 0;
  const lost = MOCK_LEADS.filter((l) => l.lifecycle === "Lost").length;
  const open = visible.length - won;
  const everything = won + lost + open;
  const owners = Array.from(new Set(MOCK_LEADS.map((l) => l.owner).filter((o): o is string => o !== null))).sort();
  return { columns, open, won, winRate: everything === 0 ? 0 : (won / everything) * 100, owners };
}
