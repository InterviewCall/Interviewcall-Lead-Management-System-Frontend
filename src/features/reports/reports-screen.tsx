"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/auth-provider";
import { STAGE } from "@/features/leads/lead-display";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { downloadText, toCsv } from "@/lib/download";
import { formatNumber, formatRupees } from "@/lib/format";
import { EASE_OUT, STAGGER } from "@/lib/motion";
import { OperationsCards } from "./operations-cards";
import { getReport, RANGES, reportKeys, SOURCE_GROUP, type RangeDays, type Report, type SourceGroup } from "./api";

const SOURCE_ORDER = Object.keys(SOURCE_GROUP) as SourceGroup[];
const weekFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

export function ReportsScreen() {
  const { user } = useAuth();
  const [days, setDays] = useState<RangeDays>(30);
  const [source, setSource] = useState<SourceGroup | "">("");
  const query = { days, source };
  const report = useQuery({ queryKey: reportKeys.summary(query), queryFn: () => getReport(query), placeholderData: keepPreviousData, refetchOnWindowFocus: true });
  const data = report.data;
  const rangeLabel = RANGES.find((r) => r.days === days)?.label.toLowerCase() ?? "";
  const ownOnly = user?.role === "BDA";
  // Keep the chosen source in the picker even if the list is still loading.
  const sources = data ? SOURCE_ORDER.filter((g) => data.sources.includes(g) || g === source) : source ? [source] : [];
  const bdaRows = data?.bdas ?? [];

  function exportCsv() {
    if (!data) return;
    downloadText(
      `bda-performance-${days}d.csv`,
      toCsv([
        ["BDA", "Leads", "Contacted in 1 h %", "Connect %", "Opportunities", "Won", "Revenue (Rs)"],
        ...bdaRows.map((b) => [b.name, String(b.leads), b.contactedPct === null ? "" : String(b.contactedPct), b.connectPct === null ? "" : String(b.connectPct), String(b.opps), String(b.won), String(b.revenue)]),
      ]),
    );
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={ownOnly ? "How your leads move from first touch to enrolment. Only your own numbers are shown." : "How leads move from first touch to enrolment. A BDA only sees their own numbers."}
        actions={
          <>
            <Select aria-label="Date range" value={days} onChange={(e) => setDays(Number(e.target.value) as RangeDays)} className="h-9 w-auto min-w-36">
              {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
            </Select>
            <Select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value as SourceGroup | "")} className="h-9 w-auto min-w-32">
              <option value="">All sources</option>
              {sources.map((s) => <option key={s} value={s}>{SOURCE_GROUP[s].label}</option>)}
            </Select>
            <Button variant="secondary" icon="download" onClick={exportCsv} disabled={!data || bdaRows.length === 0}>Export</Button>
          </>
        }
      />

      {report.isError ? <Alert>{errorMessage(report.error)}</Alert> : null}
      {report.isPending ? <div className="flex justify-center py-20"><Spinner className="text-primary" /></div> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <KpiCard
              label={ownOnly ? "My leads" : "New leads"}
              value={formatNumber(data.kpis.newLeads)}
              icon="users"
              tone="primary"
              hint={data.kpis.newLeadsChange === null ? undefined : `${signed(data.kpis.newLeadsChange)}% vs prior ${days} days`}
            />
            <KpiCard
              label="Contacted in 1 hour"
              value={pct(data.kpis.contactedPct)}
              icon="clock"
              tone="info"
              hint={data.kpis.contactedChange === null ? undefined : `${signed(data.kpis.contactedChange)} pts`}
            />
            <KpiCard
              label="Opportunities opened"
              value={formatNumber(data.kpis.opps)}
              icon="target"
              tone="violet"
              hint={data.kpis.newLeads > 0 ? `${((data.kpis.opps / data.kpis.newLeads) * 100).toFixed(1)}% of leads` : undefined}
            />
            <KpiCard
              label="Enrolled"
              value={formatNumber(data.kpis.enrolled)}
              icon="check"
              tone="success"
              hint={data.kpis.opps > 0 && data.kpis.enrolled <= data.kpis.opps ? `${((data.kpis.enrolled / data.kpis.opps) * 100).toFixed(1)}% of opportunities` : undefined}
            />
          </div>

          <RevenueCard data={data} rangeLabel={rangeLabel} />

          <OperationsCards query={query} ownOnly={ownOnly} rangeLabel={rangeLabel} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Opportunity funnel" subtitle={`Opened ${rangeLabel}, by the furthest stage each reached`} />
              {data.kpis.opps === 0 ? (
                <p className="px-5 py-12 text-center text-body text-text-2">No opportunities were opened in this period.</p>
              ) : (
                <ul className="flex flex-col gap-2 p-5">
                  {data.funnel.map((f, i) => {
                    const top = data.funnel[0]!.count || 1;
                    const last = i === data.funnel.length - 1;
                    return (
                      <li key={f.stage} className="flex items-center gap-3">
                        <span className="w-[110px] shrink-0 text-small text-text sm:w-[150px] sm:text-body">{STAGE[f.stage].label}</span>
                        <span className="h-8 min-w-0 flex-1">
                          <m.span
                            className={cn("flex h-full min-w-10 items-center rounded-md px-2.5 text-small font-semibold text-white", last ? "bg-ok" : "bg-primary")}
                            style={{ opacity: last ? 1 : 1 - i * 0.08 }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(8, (f.count / top) * 100)}%` }}
                            transition={{ duration: 0.6, ease: EASE_OUT, delay: i * STAGGER }}
                          >
                            {formatNumber(f.count)}
                          </m.span>
                        </span>
                        <span className="w-10 shrink-0 text-right text-small text-text-2" title="Of those that reached the stage before">{f.fromPrev === null ? "" : `${f.fromPrev}%`}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <SourceChart data={data} />
          </div>

          <div className={cn("grid grid-cols-1 gap-4", "xl:grid-cols-[1fr_380px]")}>
            <Card className="min-w-0 overflow-hidden">
              <CardHeader title={ownOnly ? "Your performance" : "BDA performance"} subtitle={`Leads received vs outcomes · ${rangeLabel}`} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="h-10 border-b border-border bg-surface-alt">
                      {["BDA", "Leads", "Contacted 1 h", "Connect %", "Opps", "Won", "Revenue"].map((h) => (
                        <th key={h} className="px-4 text-small font-medium text-text-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bdaRows.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-body text-text-2">No BDA has leads or calls in this period.</td></tr>
                    ) : bdaRows.map((b) => (
                      <tr key={b.id} className="h-14 border-b border-border last:border-b-0">
                        <td className="px-4"><span className="flex items-center gap-2.5"><Avatar name={b.name} size={28} /><span className="text-body font-medium text-text">{b.name}</span></span></td>
                        <td className="px-4 text-body text-text">{formatNumber(b.leads)}</td>
                        <td className="px-4 text-body text-text">{pct(b.contactedPct)}</td>
                        <td className="px-4">
                          {b.connectPct === null ? (
                            <span className="text-body text-muted">—</span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-bg"><m.span className="block h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${b.connectPct}%` }} transition={{ duration: 0.6, ease: EASE_OUT }} /></span>
                              <span className="text-body text-text-2">{b.connectPct}%</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 text-body text-text">{formatNumber(b.opps)}</td>
                        <td className="px-4 text-body font-semibold text-ok">{formatNumber(b.won)}</td>
                        <td className="px-4 text-body whitespace-nowrap text-text">{b.revenue > 0 ? formatRupees(b.revenue) : <span className="text-muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader title="Why opportunities were lost" subtitle={`Closed as lost · ${formatNumber(data.lost.total)} · ${rangeLabel}`} />
              {data.lost.reasons.length === 0 ? (
                <p className="px-5 py-12 text-center text-body text-text-2">Nothing was closed as lost in this period.</p>
              ) : (
                <ul className="flex flex-col gap-3 p-5">
                  {data.lost.reasons.map((r, i) => {
                    const max = Math.max(1, ...data.lost.reasons.map((x) => x.count));
                    return (
                      <li key={r.reason} className="flex flex-col gap-1.5">
                        <span className="flex items-baseline justify-between gap-3 text-body"><span className="text-text">{r.reason}</span><span className="font-medium text-text">{formatNumber(r.count)}</span></span>
                        <span className="h-2 overflow-hidden rounded-full bg-bg"><m.span className="block h-full rounded-full bg-bad/70" initial={{ width: 0 }} animate={{ width: `${(r.count / max) * 100}%` }} transition={{ duration: 0.6, ease: EASE_OUT, delay: i * STAGGER }} /></span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </>
  );
}

/** Leads per week, stacked by where they came from. It always covers the last four weeks, whatever the date range. */
function SourceChart({ data }: { data: Report }) {
  const shown = SOURCE_ORDER.filter((g) => data.weeks.some((w) => w.values[g] > 0));
  const totals = data.weeks.map((w) => shown.reduce((n, g) => n + w.values[g], 0));
  const max = Math.max(1, ...totals);
  return (
    <Card>
      <CardHeader title="Leads by source" subtitle="Weekly · last 4 weeks" />
      {shown.length === 0 ? (
        <p className="px-5 py-12 text-center text-body text-text-2">No leads arrived in the last four weeks.</p>
      ) : (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex h-[220px] items-end gap-4 border-b border-border px-2" role="img" aria-label="Leads by source for each of the last four weeks">
            {data.weeks.map((w, i) => (
              <div key={w.weekStart} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                <span className="text-center text-small font-medium text-text-2">{formatNumber(totals[i]!)}</span>
                <m.div
                  className="flex flex-col-reverse gap-0.5 overflow-hidden rounded-t-md"
                  initial={{ height: 0 }}
                  animate={{ height: `${(totals[i]! / max) * 85}%` }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: i * STAGGER }}
                >
                  {shown.map((g) => <span key={g} title={`${SOURCE_GROUP[g].label}: ${w.values[g]}`} style={{ flexGrow: w.values[g], backgroundColor: SOURCE_GROUP[g].color }} />)}
                </m.div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 px-2">
            {data.weeks.map((w) => <span key={w.weekStart} className="flex-1 text-center text-small text-text-2">{weekFormat.format(new Date(`${w.weekStart}T00:00:00Z`))}</span>)}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {shown.map((g) => (
              <li key={g} className="flex items-center gap-1.5 text-small text-text-2"><span className="size-2 rounded-full" style={{ backgroundColor: SOURCE_GROUP[g].color }} />{SOURCE_GROUP[g].label}</li>
            ))}
          </ul>
          <p className="px-2 text-small text-muted">Each bar is a week starting on the Monday shown; the last is this week so far.</p>
        </div>
      )}
    </Card>
  );
}

const MODE_LABEL = { FULL: "Paid in full", EMI: "EMI", LOAN: "Loan / financing", PART: "Part paid" } as const;

/** What the won deals are worth: fees agreed, collected, still to collect, and how people pay. */
function RevenueCard({ data, rangeLabel }: { data: Report; rangeLabel: string }) {
  const r = data.revenue;
  const maxMode = Math.max(1, ...r.byMode.map((row) => row.booked));
  const tiles: Array<{ label: string; value: string; tone: string }> = [
    { label: "Fees booked", value: formatRupees(r.booked), tone: "text-text" },
    { label: "Collected", value: formatRupees(r.collected), tone: "text-ok" },
    { label: "Still to collect", value: formatRupees(r.pending), tone: r.pending > 0 ? "text-warn" : "text-text" },
    { label: "Average fee", value: r.averageFee === null ? "—" : formatRupees(r.averageFee), tone: "text-text" },
  ];
  return (
    <Card>
      <CardHeader title="Revenue" subtitle={`From deals won ${rangeLabel}`} />
      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="flex flex-col gap-1 rounded-lg bg-surface-alt px-3.5 py-3">
                <span className="text-small text-text-2">{t.label}</span>
                <span className={cn("text-h2 font-bold whitespace-nowrap", t.tone)}>{t.value}</span>
              </div>
            ))}
          </div>
          {r.unrecorded > 0 ? (
            <p className="flex items-center gap-2 text-small text-warn">
              <Icon name="warn" size={14} />
              {r.unrecorded === 1 ? "1 won deal has" : `${formatNumber(r.unrecorded)} won deals have`} no payment recorded, so it is not counted here. Add it on the lead page.
            </p>
          ) : null}
        </div>
        <ul className="flex flex-col gap-2.5">
          {r.byMode.map((row, i) => (
            <li key={row.mode} className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between gap-3 text-small">
                <span className="text-text">{MODE_LABEL[row.mode]} <span className="text-text-2">· {formatNumber(row.deals)}</span></span>
                <span className="font-medium text-text">{formatRupees(row.booked)}</span>
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-bg">
                <m.span className="block h-full rounded-full bg-ok/80" initial={{ width: 0 }} animate={{ width: `${(row.booked / maxMode) * 100}%` }} transition={{ duration: 0.6, ease: EASE_OUT, delay: i * STAGGER }} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
