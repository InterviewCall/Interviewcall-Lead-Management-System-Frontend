import type { LeadDetail, StageCode } from "./types";

/** The stages that need a day when a lead is moved into them. */
export type DatedStage = "TEST" | "PSYCHOMETRIC_SESSION" | "CLOSED_WON";

export const isDatedStage = (stage: StageCode | "" | null | undefined): stage is DatedStage => stage === "TEST" || stage === "PSYCHOMETRIC_SESSION" || stage === "CLOSED_WON";

/** The scheduled stages: the date is when it will happen, so it can be ahead. Closed Won is when it happened. */
export const isScheduledStage = (stage: StageCode | "" | null | undefined): stage is "TEST" | "PSYCHOMETRIC_SESSION" => stage === "TEST" || stage === "PSYCHOMETRIC_SESSION";

export const STAGE_DATE_LABEL: Record<DatedStage, string> = {
  TEST: "Test date",
  PSYCHOMETRIC_SESSION: "Psychometric session date",
  CLOSED_WON: "Won on",
};

/** India's calendar day, YYYY-MM-DD, whatever the browser's time zone. */
export const todayIst = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

export const addDays = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** The days the server accepts: scheduled stages from 60 days back to a year ahead, a win from 2020 up to today. */
export function dayBounds(stage: DatedStage): { min: string; max: string } {
  const today = todayIst();
  return stage === "CLOSED_WON" ? { min: "2020-01-01", max: today } : { min: addDays(today, -60), max: addDays(today, 365) };
}

/** "24 Nov 2026" from YYYY-MM-DD, without the browser's time zone moving the day. */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Shorter, for a card: "24 Nov". */
export function formatDayShort(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

type Opportunity = NonNullable<LeadDetail["opportunity"]>;

/** The day saved for a dated stage on this opportunity, or null. */
export function savedDay(opportunity: Pick<Opportunity, "testOn" | "psychometricOn" | "wonOn"> | null | undefined, stage: StageCode): string | null {
  if (!opportunity) return null;
  return stage === "TEST" ? opportunity.testOn : stage === "PSYCHOMETRIC_SESSION" ? opportunity.psychometricOn : stage === "CLOSED_WON" ? opportunity.wonOn : null;
}
