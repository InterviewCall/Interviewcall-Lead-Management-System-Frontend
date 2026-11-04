"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { downloadText, toCsv } from "@/lib/download";
import { formatNumber } from "@/lib/format";
import { EASE_OUT, STAGGER } from "@/lib/motion";
import { getReport, RANGES, reportKeys, REPORT_SOURCES, type RangeDays, type ReportSource } from "./api";

const SOURCE_COLOR: Record<ReportSource, string> = { WorkR: "#4f46e5", VSL: "#0284c7", Meta: "#d97706", Other: "#9ca3af" };

export function ReportsScreen() {
  const { user } = useAuth();
  const [days, setDays] = useState<RangeDays>(30);
  const [source, setSource] = useState<ReportSource | "">("");
  const query = { days, source };
  const report = useQuery({ queryKey: reportKeys.summary(query), queryFn: () => getReport(query), placeholderData: keepPreviousData });
  const data = report.data;
  const rangeLabel = RANGES.find((r) => r.days === days)?.label.toLowerCase() ?? "";
  const ownOnly = user?.role === "BDA";
  const bdaRows = data ? (ownOnly ? data.bdas.filter((b) => b.name === user?.name) : data.bdas) : [];
  const mine = ownOnly ? bdaRows[0] : undefined;

  function exportCsv() {
    if (!data) return;
    downloadText(
      `bda-performance-${days}d.csv`,
      toCsv([["BDA", "Leads", "Contacted in 1 h %", "Connect %", "Opportunities", "Won"], ...bdaRows.map((b) => [b.name, String(b.leads), String(b.contactedPct), String(b.connectPct), String(b.opps), String(b.won)])]),
    );
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="How leads move from first touch to enrolment. A BDA only sees their own numbers."
        actions={
          <>
            <Select aria-label="Date range" value={days} onChange={(e) => setDays(Number(e.target.value) as RangeDays)} className="h-9 w-auto min-w-36">
              {RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
            </Select>
            <Select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value as ReportSource | "")} className="h-9 w-auto min-w-32">
              <option value="">All sources</option>
              {REPORT_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
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
            {ownOnly ? (
              <>
                <KpiCard label="My leads" value={formatNumber(mine?.leads ?? 0)} icon="users" tone="primary" />
                <KpiCard label="Contacted in 1 hour" value={`${mine?.contactedPct ?? 0}%`} icon="clock" tone="info" />
                <KpiCard label="Opportunities opened" value={formatNumber(mine?.opps ?? 0)} icon="target" tone="violet" />
                <KpiCard label="Enrolled" value={formatNumber(mine?.won ?? 0)} icon="check" tone="success" />
              </>
            ) : (
              <>
                <KpiCard label="New leads" value={formatNumber(data.kpis.newLeads)} icon="users" tone="primary" hint={`+${data.kpis.newLeadsDelta}% vs prior ${days} days`} />
                <KpiCard label="Contacted in 1 hour" value={`${data.kpis.contactedPct}%`} icon="clock" tone="info" hint={`+${data.kpis.contactedDelta} pts`} />
                <KpiCard label="Opportunities opened" value={formatNumber(data.kpis.opps)} icon="target" tone="violet" hint={`${data.kpis.newLeads ? ((data.kpis.opps / data.kpis.newLeads) * 100).toFixed(1) : "0"}% of leads`} />
                <KpiCard label="Enrolled" value={formatNumber(data.kpis.enrolled)} icon="check" tone="success" hint={`${data.kpis.opps ? ((data.kpis.enrolled / data.kpis.opps) * 100).toFixed(1) : "0"}% of opportunities`} />
              </>
            )}
          </div>

          {ownOnly ? null : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader title="Opportunity funnel" subtitle="Opportunities that reached each stage" />
                <ul className="flex flex-col gap-2 p-5">
                  {data.funnel.map((f, i) => {
                    const top = data.funnel[0]!.count || 1;
                    return (
                      <li key={f.stage} className="flex items-center gap-3">
                        <span className="w-[110px] shrink-0 text-small text-text sm:w-[150px] sm:text-body">{f.stage}</span>
                        <span className="h-8 min-w-0 flex-1">
                          <m.span
                            className={cn("flex h-full min-w-10 items-center rounded-md px-2.5 text-small font-semibold text-white", i === data.funnel.length - 1 ? "bg-ok" : "bg-primary")}
                            style={{ opacity: i === data.funnel.length - 1 ? 1 : 1 - i * 0.08 }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(8, (f.count / top) * 100)}%` }}
                            transition={{ duration: 0.6, ease: EASE_OUT, delay: i * STAGGER }}
                          >
                            {formatNumber(f.count)}
                          </m.span>
                        </span>
                        <span className="w-10 shrink-0 text-right text-small text-text-2">{f.fromPrev === null ? "" : `${f.fromPrev}%`}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <Card>
                <CardHeader title="Leads by source" subtitle="Weekly · last 4 weeks" />
                <div className="flex flex-col gap-4 p-5">
                  <div className="flex h-[220px] items-end gap-4 border-b border-border px-2" role="img" aria-label="Leads by source for each of the last four weeks">
                    {data.weeks.map((w) => {
                      const total = data.sourcesShown.reduce((a, s) => a + w.values[s], 0);
                      const max = Math.max(1, ...data.weeks.map((x) => data.sourcesShown.reduce((a, s) => a + x.values[s], 0)));
                      return (
                        <div key={w.label} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                          <span className="text-center text-small font-medium text-text-2">{formatNumber(total)}</span>
                          <m.div
                            className="flex flex-col-reverse gap-0.5 overflow-hidden rounded-t-md"
                            initial={{ height: 0 }}
                            animate={{ height: `${(total / max) * 85}%` }}
                            transition={{ duration: 0.6, ease: EASE_OUT, delay: data.weeks.indexOf(w) * STAGGER }}
                          >
                            {data.sourcesShown.map((s) => <span key={s} style={{ flexGrow: w.values[s], backgroundColor: SOURCE_COLOR[s] }} />)}
                          </m.div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 px-2">{data.weeks.map((w) => <span key={w.label} className="flex-1 text-center text-small text-text-2">{w.label}</span>)}</div>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {data.sourcesShown.map((s) => (
                      <li key={s} className="flex items-center gap-1.5 text-small text-text-2"><span className="size-2 rounded-full" style={{ backgroundColor: SOURCE_COLOR[s] }} />{s}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          )}

          <div className={cn("grid grid-cols-1 gap-4", ownOnly ? "" : "xl:grid-cols-[1fr_380px]")}>
            <Card className="min-w-0 overflow-hidden">
              <CardHeader title="BDA performance" subtitle={`Leads received vs outcomes · ${rangeLabel}`} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead>
                    <tr className="h-10 border-b border-border bg-surface-alt">
                      {["BDA", "Leads", "Contacted 1 h", "Connect %", "Opps", "Won"].map((h) => (
                        <th key={h} className="px-4 text-cap font-semibold tracking-[0.5px] text-text-2 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bdaRows.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-body text-text-2">Your numbers appear here once leads are assigned to you.</td></tr>
                    ) : bdaRows.map((b) => (
                      <tr key={b.name} className="h-14 border-b border-border last:border-b-0">
                        <td className="px-4"><span className="flex items-center gap-2.5"><Avatar name={b.name} size={28} /><span className="text-body font-medium text-text">{b.name}</span></span></td>
                        <td className="px-4 text-body text-text">{formatNumber(b.leads)}</td>
                        <td className="px-4 text-body text-text">{b.contactedPct}%</td>
                        <td className="px-4">
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-bg"><m.span className="block h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${b.connectPct}%` }} transition={{ duration: 0.6, ease: EASE_OUT }} /></span>
                            <span className="text-body text-text-2">{b.connectPct}%</span>
                          </span>
                        </td>
                        <td className="px-4 text-body text-text">{formatNumber(b.opps)}</td>
                        <td className="px-4 text-body font-semibold text-ok">{formatNumber(b.won)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {ownOnly ? null : (
              <Card>
                <CardHeader title="Why opportunities were lost" subtitle={`Closed as lost · ${formatNumber(data.lost.total)} this period`} />
                <ul className="flex flex-col gap-3 p-5">
                  {data.lost.reasons.map((r, i) => {
                    const max = Math.max(1, ...data.lost.reasons.map((x) => x.count));
                    return (
                      <li key={r.reason} className="flex flex-col gap-1.5">
                        <span className="flex items-baseline justify-between text-body"><span className="text-text">{r.reason}</span><span className="font-medium text-text">{formatNumber(r.count)}</span></span>
                        <span className="h-2 overflow-hidden rounded-full bg-bg"><m.span className="block h-full rounded-full bg-bad/70" initial={{ width: 0 }} animate={{ width: `${(r.count / max) * 100}%` }} transition={{ duration: 0.6, ease: EASE_OUT, delay: i * STAGGER }} /></span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>
          <p className="text-small text-muted">Report figures are sample data until the reports API is connected.</p>
        </>
      ) : null}
    </>
  );
}
