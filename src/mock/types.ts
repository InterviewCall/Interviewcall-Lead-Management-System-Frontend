import type { Tone } from "@/lib/roles";

export type Lifecycle = "Marketing Lead" | "Engaged Lead" | "Prospect" | "Customer" | "Lost";
export type Temperature = "Hot" | "Warm" | "Cold";
export const STAGES = [
  "Call 1 Pending", "Call 1", "Test", "Call 2", "Psychometric session", "Decision / Objection", "Payment / Financing", "Closed Won",
] as const;
export type Stage = (typeof STAGES)[number];

export const LIFECYCLE_TONE: Record<Lifecycle, Tone> = {
  "Marketing Lead": "neutral", "Engaged Lead": "info", Prospect: "primary", Customer: "success", Lost: "danger",
};
export const TEMP_TONE: Record<Temperature, Tone> = { Hot: "danger", Warm: "warning", Cold: "info" };
export const STAGE_TONE: Record<Stage, Tone> = {
  "Call 1 Pending": "neutral", "Call 1": "info", Test: "violet", "Call 2": "primary",
  "Psychometric session": "violet", "Decision / Objection": "warning", "Payment / Financing": "warning", "Closed Won": "success",
};

export interface MockLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  lifecycle: Lifecycle;
  stage: Stage;
  temperature: Temperature;
  owner: string | null;
  /** Short text for the "Next step" column. */
  next: { text: string; kind: "booked" | "task" | "none" };
  createdAt: string;
  /** When the opportunity last changed stage. Used to show recent moves first on the board. */
  stageChangedAt?: string;
}
