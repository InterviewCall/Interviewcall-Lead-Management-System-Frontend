"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { STAGE } from "@/features/leads/lead-display";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { EASE_OUT, STAGGER } from "@/lib/motion";
import { getOperations, operationsKeys, SOURCE_GROUP, type OperationsReport, type ReportQuery } from "./api";
import Link from "next/link";

const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

/** A wait in minutes, as people say it: "12 min", "3.5 h", "2 days". */
function wait(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 1440) return `${Math.round((minutes / 60) * 10) / 10} h`;
  return `${Math.round((minutes / 1440) * 10) / 10} days`;
}

function target(minutes: number): string {
  return minutes % 60 === 0 && minutes >= 60 ? `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}` : `${minutes} minutes`;
}

/**
 * First response, stage aging and how evenly leads were handed out. The first and the last follow the date range;
 * stage aging is how things stand now. A BDA sees their own first-response and aging, and no fairness card.
 */
export function OperationsCards({ query, ownOnly, rangeLabel }: { query: ReportQuery; ownOnly: boolean; rangeLabel: string }) {
  const ops = useQuery({ queryKey: operationsKeys.all(query), queryFn: () => getOperations(query), placeholderData: keepPreviousData });
  if (ops.isError) return <Alert>{errorMessage(ops.error)}</Alert>;
  if (!ops.data) return <div className="flex justify-center py-10"><Spinner className="text-primary" /></div>;
  const data = ops.data;
  return (
    <>
      <FirstResponseCard data={data} rangeLabel={rangeLabel} />
      <AgingCard data={data} />
      {data.fairness && !ownOnly ? <FairnessCard data={data} rangeLabel={rangeLabel} /> : null}
    </>
  );
}

function FirstResponseCard({ data, rangeLabel }: { data: OperationsReport; rangeLabel: string }) {
  const f = data.firstResponse;
  const max = Math.max(1, ...f.buckets.map((b) => b.count));
  return (
    <Card>
      <CardHeader title="First response" subtitle={`How soon new leads from ${rangeLabel} were first touched. Target: ${target(f.targetMinutes)}.`} />
      {f.leads === 0 ? (
        <p className="px-5 py-10 text-center text-small text-text-2">No new leads in this period.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Tile label="Reached in time" value={pct(f.pct)} tone={f.pct !== null && f.pct >= 80 ? "text-ok" : f.pct !== null && f.pct < 50 ? "text-bad" : "text-text"} note={f.judged > 0 ? `${formatNumber(f.withinTarget)} of ${formatNumber(f.judged)}` : "Too new to judge"} />
              <Tile label="Typical wait" value={wait(f.medianMinutes)} tone="text-text" note="Middle of those touched" />
              <Tile label="Still waiting" value={formatNumber(f.waiting)} tone={f.waiting > 0 ? "text-warn" : "text-text"} note="Past the target, untouched" />
            </div>
            <ul className="flex flex-col gap-2.5">
              {f.buckets.map((b, i) => (
                <li key={b.key} className="flex flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-3 text-small">
                    <span className="text-text">{b.label}</span>
                    <span className="nums font-medium text-text">{formatNumber(b.count)}</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-bg">
                    <m.span className={cn("block h-full rounded-full", b.key === "none" ? "bg-warn/70" : "bg-primary/80")} initial={{ width: 0 }} animate={{ width: `${(b.count / max) * 100}%` }} transition={{ duration: 0.6, ease: EASE_OUT, delay: i * STAGGER }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-small font-medium text-text-2">By source</p>
            <table className="w-full border-collapse text-left text-body">
              <thead><tr className="text-small text-text-2"><th className="pb-1.5 font-medium">Source</th><th className="pb-1.5 text-right font-medium">Leads</th><th className="pb-1.5 text-right font-medium">In time</th><th className="pb-1.5 text-right font-medium">Typical</th></tr></thead>
              <tbody>
                {f.byGroup.map((g) => (
                  <tr key={g.group} className="border-t border-border">
                    <td className="py-1.5 text-text">{SOURCE_GROUP[g.group].label}</td>
                    <td className="nums py-1.5 text-right text-text-2">{formatNumber(g.leads)}</td>
                    <td className="nums py-1.5 text-right text-text">{pct(g.pct)}</td>
                    <td className="nums py-1.5 text-right text-text-2">{wait(g.medianMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function Tile({ label, value, tone, note }: { label: string; value: string; tone: string; note: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-surface-alt px-3.5 py-3">
      <span className="text-small text-text-2">{label}</span>
      <span className={cn("text-h2 font-bold whitespace-nowrap", tone)}>{value}</span>
      <span className="text-small text-muted">{note}</span>
    </div>
  );
}

function AgingCard({ data }: { data: OperationsReport }) {
  const a = data.stageAging;
  const open = a.stages.reduce((n, s) => n + s.open, 0);
  const stale = a.stages.reduce((n, s) => n + s.stale, 0);
  const maxAvg = Math.max(1, ...a.stages.map((s) => s.avgDays));
  return (
    <Card>
      <CardHeader title="Time in stage" subtitle={`Open opportunities as they stand now. Stuck means ${a.staleDays} ${a.staleDays === 1 ? "day" : "days"} or more in one stage.`} />
      {open === 0 ? (
        <p className="px-5 py-10 text-center text-small text-text-2">No open opportunities.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_340px]">
          <div>
            <table className="w-full border-collapse text-left text-body">
              <thead><tr className="text-small text-text-2"><th className="pb-1.5 font-medium">Stage</th><th className="pb-1.5 text-right font-medium">Open</th><th className="w-1/3 pb-1.5 pl-4 font-medium">Average wait</th><th className="pb-1.5 text-right font-medium">Longest</th><th className="pb-1.5 text-right font-medium">Stuck</th></tr></thead>
              <tbody>
                {a.stages.map((s, i) => (
                  <tr key={s.stage} className="border-t border-border">
                    <td className="py-2 text-text">{STAGE[s.stage].label}</td>
                    <td className="nums py-2 text-right text-text">{formatNumber(s.open)}</td>
                    <td className="py-2 pl-4">
                      <span className="flex items-center gap-2">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                          <m.span className={cn("block h-full rounded-full", s.avgDays >= a.staleDays ? "bg-warn/80" : "bg-primary/70")} initial={{ width: 0 }} animate={{ width: `${(s.avgDays / maxAvg) * 100}%` }} transition={{ duration: 0.6, ease: EASE_OUT, delay: i * STAGGER }} />
                        </span>
                        <span className="nums w-14 text-right text-small text-text-2">{s.open === 0 ? "—" : `${s.avgDays} d`}</span>
                      </span>
                    </td>
                    <td className="nums py-2 text-right text-text-2">{s.open === 0 ? "—" : `${s.maxDays} d`}</td>
                    <td className="nums py-2 text-right">{s.stale > 0 ? <span className="font-medium text-warn">{formatNumber(s.stale)}</span> : <span className="text-muted">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-small text-text-2">{stale === 0 ? "Nothing is stuck." : `${formatNumber(stale)} of ${formatNumber(open)} open ${open === 1 ? "opportunity is" : "opportunities are"} stuck.`}</p>
          </div>
          <div>
            <p className="mb-2 text-small font-medium text-text-2">Waiting longest</p>
            <ul className="flex flex-col">
              {a.longest.map((l) => (
                <li key={l.leadId} className="border-t border-border first:border-t-0">
                  <Link href={`/leads/${l.leadId}`} className="flex items-baseline justify-between gap-3 py-2 transition hover:text-primary">
                    <span className="min-w-0">
                      <span className="block truncate text-body font-medium text-text">{l.name}</span>
                      <span className="block truncate text-small text-text-2">{STAGE[l.stage].label}{l.ownerName ? ` · ${l.ownerName}` : " · Unassigned"}</span>
                    </span>
                    <span className="nums shrink-0 text-small font-medium text-warn">{l.days} d</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

function FairnessCard({ data, rangeLabel }: { data: OperationsReport; rangeLabel: string }) {
  const f = data.fairness!;
  const max = Math.max(1, ...f.people.map((p) => p.assigned));
  const flagged = f.people.filter((p) => p.flag !== null);
  return (
    <Card>
      <CardHeader title="Lead distribution" subtitle={`Leads handed to each BDA ${rangeLabel}. An even split would give each about ${f.expectedEach}.`} />
      {f.people.length === 0 ? (
        <p className="px-5 py-10 text-center text-small text-text-2">There are no active BDAs.</p>
      ) : (
        <div className="p-5">
          <table className="w-full border-collapse text-left text-body">
            <thead><tr className="text-small text-text-2"><th className="pb-1.5 font-medium">BDA</th><th className="w-2/5 pb-1.5 pl-4 font-medium">Leads handed over</th><th className="pb-1.5 text-right font-medium">Share</th><th className="pb-1.5 text-right font-medium">Hot</th><th className="pb-1.5 text-right font-medium">Deep VSL</th><th className="pb-1.5 text-right font-medium">Against an even split</th></tr></thead>
            <tbody>
              {f.people.map((p, i) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2 text-text">{p.name}</td>
                  <td className="py-2 pl-4">
                    <span className="flex items-center gap-2">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                        <m.span className={cn("block h-full rounded-full", p.flag === "over" ? "bg-warn/80" : p.flag === "under" ? "bg-info/70" : "bg-primary/70")} initial={{ width: 0 }} animate={{ width: `${(p.assigned / max) * 100}%` }} transition={{ duration: 0.6, ease: EASE_OUT, delay: i * STAGGER }} />
                      </span>
                      <span className="nums w-10 text-right text-text">{formatNumber(p.assigned)}</span>
                    </span>
                  </td>
                  <td className="nums py-2 text-right text-text-2">{p.sharePct}%</td>
                  <td className="nums py-2 text-right text-text-2">{pct(p.hotPct)}</td>
                  <td className="nums py-2 text-right text-text-2">{pct(p.deepVslPct)}</td>
                  <td className="py-2 text-right">
                    {p.deviationPct === null ? <span className="text-muted">—</span> : p.flag ? <Badge tone="warning">{p.deviationPct > 0 ? "+" : ""}{p.deviationPct}%</Badge> : <span className="nums text-text-2">{p.deviationPct > 0 ? "+" : ""}{p.deviationPct}%</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-small text-text-2">
            {!f.judgeable
              ? "Too few leads were handed out in this period to judge whether the split is fair."
              : flagged.length === 0
                ? `Everyone is within ${f.tolerancePct}% of an even split.`
                : `${flagged.map((p) => p.name).join(", ")} ${flagged.length === 1 ? "is" : "are"} more than ${f.tolerancePct}% away from an even split. Hot and deep VSL show whether the quality of leads was shared as well.`}
          </p>
        </div>
      )}
    </Card>
  );
}
