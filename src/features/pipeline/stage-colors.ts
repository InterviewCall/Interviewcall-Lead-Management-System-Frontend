import type { Stage } from "@/mock/types";

/** Segment colours for the stage mix bar. They follow the stage badge tones. */
export const STAGE_COLOR: Record<Stage, string> = {
  "Call 1 Pending": "#9ca3af",
  "Call 1": "#0284c7",
  Test: "#7c3aed",
  "Call 2": "#4f46e5",
  "Psychometric session": "#a78bfa",
  "Decision / Objection": "#d97706",
  "Payment / Financing": "#f59e0b",
  "Closed Won": "#16a34a",
};

export const STAGE_SHORT: Record<Stage, string> = {
  "Call 1 Pending": "Call 1 Pending",
  "Call 1": "Call 1",
  Test: "Test",
  "Call 2": "Call 2",
  "Psychometric session": "Psychometric",
  "Decision / Objection": "Decision / Objection",
  "Payment / Financing": "Payment / Financing",
  "Closed Won": "Closed Won",
};
