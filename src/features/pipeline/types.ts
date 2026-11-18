import type { Lead, StageCode, TemperatureCode } from "@/features/leads/types";

/** Shapes returned by the board API (`GET /api/v1/pipeline`). */
export interface BoardCard {
  /** The lead's id: the card opens `/leads/:id`. */
  id: string;
  name: string;
  company: string | null;
  domain: string | null;
  source: string;
  temperature: TemperatureCode | null;
  owner: { id: string; name: string } | null;
  next: Lead["next"];
  stageChangedAt: string;
  /** The day the stage is about: when the test or session is scheduled, or when the deal was won. Null for the other stages. */
  stageOn: string | null;
}

export interface BoardColumn {
  stage: StageCode;
  /** Every opportunity at this stage. The cards are only the newest few. */
  count: number;
  cards: BoardCard[];
}

export interface PipelineData {
  columns: BoardColumn[];
  /** Open opportunities across all stages before Closed Won. */
  open: number;
  wonThisMonth: number;
  lostThisMonth: number;
  /** Won over won plus lost this month, 0 to 100. Null when nothing has closed yet. */
  winRate: number | null;
  /** Who can be filtered by. Empty for a BDA, who only sees their own leads. */
  owners: Array<{ id: string; name: string }>;
}

export interface PipelineQuery {
  temperature: TemperatureCode | "";
  /** A staff id, `none` for unassigned, or empty for everyone. */
  ownerId: string;
  /** Cards to load for each stage. */
  perColumn: number;
}
