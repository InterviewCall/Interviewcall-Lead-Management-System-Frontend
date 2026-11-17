import type { StageCode } from "@/features/leads/types";

/** Segment colours for the stage mix bar. They follow the stage badge tones. */
export const STAGE_COLOR: Record<StageCode, string> = {
  CALL_1_PENDING: "#8c91ab",
  CALL_1: "#1f73b7",
  TEST: "#7a3be0",
  CALL_2: "#4f46e5",
  PSYCHOMETRIC_SESSION: "#a98bf0",
  DECISION_OBJECTION: "#d9821a",
  PAYMENT_FINANCING: "#e9a23b",
  CLOSED_WON: "#138a48",
};

/** Shorter names for the places that are tight (phone tabs, the legend). */
export const STAGE_SHORT: Record<StageCode, string> = {
  CALL_1_PENDING: "Call 1 Pending",
  CALL_1: "Call 1",
  TEST: "Test",
  CALL_2: "Call 2",
  PSYCHOMETRIC_SESSION: "Psychometric",
  DECISION_OBJECTION: "Decision / Objection",
  PAYMENT_FINANCING: "Payment / Financing",
  CLOSED_WON: "Closed Won",
};
