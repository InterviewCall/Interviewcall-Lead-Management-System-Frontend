/**
 * MOCK: figures are fixed sample data scaled by the chosen range and source.
 * Swap for `api.get("/reports/summary", { params: { days, source } })`.
 */
const wait = (ms = 300) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const RANGES = [{ days: 7, label: "Last 7 days" }, { days: 30, label: "Last 30 days" }, { days: 90, label: "Last 90 days" }] as const;
export type RangeDays = (typeof RANGES)[number]["days"];
export const REPORT_SOURCES = ["WorkR", "VSL", "Meta", "Other"] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];

const RANGE_SCALE: Record<RangeDays, number> = { 7: 0.24, 30: 1, 90: 2.9 };

const FUNNEL: Array<[string, number]> = [
  ["Call 1 Pending", 612], ["Call 1", 480], ["Test", 240], ["Call 2", 150],
  ["Psychometric session", 96], ["Decision / Objection", 74], ["Payment / Financing", 52], ["Closed Won", 38],
];
const WEEKLY: Record<ReportSource, number[]> = {
  WorkR: [370, 400, 390, 375],
  VSL: [255, 270, 290, 250],
  Meta: [150, 160, 165, 150],
  Other: [65, 60, 60, 72],
};
const BDA_ROWS = [
  { name: "Aarav Bose", leads: 482, contacted: 71, connect: 43, opps: 84, won: 6 },
  { name: "Sneha Banerjee", leads: 471, contacted: 68, connect: 46, opps: 92, won: 8 },
  { name: "Vikram Singh", leads: 455, contacted: 62, connect: 39, opps: 71, won: 4 },
  { name: "Meera Pillai", leads: 468, contacted: 66, connect: 44, opps: 88, won: 7 },
  { name: "Rahul Sen", leads: 440, contacted: 58, connect: 37, opps: 64, won: 3 },
  { name: "Tanvi Shah", leads: 452, contacted: 63, connect: 41, opps: 79, won: 5 },
];
const LOST: Array<[string, number]> = [
  ["Time constraint", 62], ["Financial constraint", 48], ["Self-preparation", 36], ["Out of target group", 31], ["Wrong number", 22], ["Not applicable", 15],
];

export interface ReportQuery { days: RangeDays; source: ReportSource | "" }

export interface Report {
  kpis: { newLeads: number; contactedPct: number; opps: number; enrolled: number; newLeadsDelta: number; contactedDelta: number };
  funnel: Array<{ stage: string; count: number; fromPrev: number | null }>;
  weeks: Array<{ label: string; values: Record<ReportSource, number> }>;
  sourcesShown: ReportSource[];
  bdas: Array<{ name: string; leads: number; contactedPct: number; connectPct: number; opps: number; won: number }>;
  lost: { total: number; reasons: Array<{ reason: string; count: number }> };
}

export const reportKeys = { summary: (q: ReportQuery) => ["reports", q] as const };

export async function getReport(q: ReportQuery): Promise<Report> {
  await wait();
  const weeklyTotal = (s: ReportSource) => WEEKLY[s].reduce((a, b) => a + b, 0);
  const grand = REPORT_SOURCES.reduce((a, s) => a + weeklyTotal(s), 0);
  const share = q.source ? weeklyTotal(q.source) / grand : 1;
  const k = RANGE_SCALE[q.days] * share;
  const scale = (n: number) => Math.round(n * k);
  const funnel = FUNNEL.map(([stage, count], i) => ({ stage, count: scale(count), fromPrev: i === 0 ? null : Math.round((count / FUNNEL[i - 1]![1]) * 100) }));
  const sourcesShown = q.source ? [q.source] : [...REPORT_SOURCES];
  const lost = LOST.map(([reason, count]) => ({ reason, count: scale(count) }));
  return {
    kpis: {
      newLeads: scale(grand), contactedPct: 64, opps: funnel[0]!.count, enrolled: funnel[7]!.count,
      newLeadsDelta: 12, contactedDelta: 6,
    },
    funnel,
    weeks: [1, 2, 3, 4].map((w) => ({
      label: `Wk ${w}`,
      values: Object.fromEntries(REPORT_SOURCES.map((s) => [s, q.source && q.source !== s ? 0 : Math.round(WEEKLY[s][w - 1]! * RANGE_SCALE[q.days])])) as Record<ReportSource, number>,
    })),
    sourcesShown,
    bdas: BDA_ROWS.map((b) => ({ name: b.name, leads: scale(b.leads), contactedPct: b.contacted, connectPct: b.connect, opps: scale(b.opps), won: scale(b.won) })),
    lost: { total: lost.reduce((a, r) => a + r.count, 0), reasons: lost },
  };
}
