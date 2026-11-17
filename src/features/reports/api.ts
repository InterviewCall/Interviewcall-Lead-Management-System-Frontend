import { api } from "@/lib/api/client";
import type { StageCode } from "@/features/leads/types";

export const RANGES = [{ days: 7, label: "Last 7 days" }, { days: 30, label: "Last 30 days" }, { days: 90, label: "Last 90 days" }] as const;
export type RangeDays = (typeof RANGES)[number]["days"];

export type SourceGroup = "WORKR" | "VSL" | "META" | "ORGANIC" | "IMPORT" | "REFERRAL" | "OTHER";

export const SOURCE_GROUP: Record<SourceGroup, { label: string; color: string }> = {
  WORKR: { label: "WorkR", color: "#4f46e5" },
  VSL: { label: "VSL", color: "#0284c7" },
  META: { label: "Meta ads", color: "#d97706" },
  ORGANIC: { label: "Organic", color: "#16a34a" },
  IMPORT: { label: "CSV import", color: "#9ca3af" },
  REFERRAL: { label: "Referral", color: "#a78bfa" },
  OTHER: { label: "Other", color: "#64748b" },
};

export interface ReportQuery { days: RangeDays; source: SourceGroup | "" }

/** Shape of `GET /api/v1/reports/summary`. */
export interface Report {
  days: RangeDays;
  kpis: {
    newLeads: number;
    /** Percent against the period of the same length before. Null when there was nothing before. */
    newLeadsChange: number | null;
    /** Share of leads first called within an hour of arriving. Null when no lead can be judged yet. */
    contactedPct: number | null;
    /** Points against the period before. */
    contactedChange: number | null;
    opps: number;
    enrolled: number;
  };
  funnel: Array<{ stage: StageCode; count: number; fromPrev: number | null }>;
  /** Monday-to-Sunday weeks, oldest first; the last is this week so far. */
  weeks: Array<{ weekStart: string; values: Record<SourceGroup, number> }>;
  /** The source groups to offer in the picker. */
  sources: SourceGroup[];
  bdas: Array<{ id: string; name: string; leads: number; contactedPct: number | null; connectPct: number | null; opps: number; won: number; revenue: number }>;
  lost: { total: number; reasons: Array<{ reason: string; count: number }> };
  /** Money from the deals won in the period. Amounts in whole rupees. */
  revenue: {
    booked: number;
    collected: number;
    pending: number;
    averageFee: number | null;
    /** Wins with no payment recorded yet. */
    unrecorded: number;
    byMode: Array<{ mode: "FULL" | "EMI" | "LOAN" | "PART"; deals: number; booked: number }>;
  };
}

export const reportKeys = { summary: (q: ReportQuery) => ["reports", "summary", q] as const };

export async function getReport(q: ReportQuery): Promise<Report> {
  const params: Record<string, string | number> = { days: q.days };
  if (q.source) params.source = q.source;
  const { data } = await api.get<Report>("/reports/summary", { params });
  return data;
}

/** Shape of `GET /api/v1/reports/operations`. */
export interface OperationsReport {
  days: RangeDays;
  firstResponse: {
    targetMinutes: number;
    leads: number;
    judged: number;
    withinTarget: number;
    pct: number | null;
    medianMinutes: number | null;
    /** Leads past the target that nobody has touched. */
    waiting: number;
    buckets: Array<{ key: string; label: string; count: number }>;
    byGroup: Array<{ group: SourceGroup; leads: number; pct: number | null; medianMinutes: number | null }>;
  };
  stageAging: {
    staleDays: number;
    stages: Array<{ stage: StageCode; open: number; avgDays: number; maxDays: number; stale: number }>;
    longest: Array<{ leadId: string; name: string; stage: StageCode; days: number; ownerName: string | null }>;
  };
  /** Null for a BDA. */
  fairness: null | {
    total: number;
    expectedEach: number;
    tolerancePct: number;
    judgeable: boolean;
    people: Array<{ id: string; name: string; assigned: number; hot: number; deepVsl: number; sharePct: number; hotPct: number | null; deepVslPct: number | null; deviationPct: number | null; flag: "over" | "under" | null }>;
  };
}

export const operationsKeys = { all: (q: ReportQuery) => ["reports", "operations", q] as const };

export async function getOperations(q: ReportQuery): Promise<OperationsReport> {
  const params: Record<string, string | number> = { days: q.days };
  if (q.source) params.source = q.source;
  const { data } = await api.get<OperationsReport>("/reports/operations", { params });
  return data;
}
