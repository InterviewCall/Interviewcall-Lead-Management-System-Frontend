"use client";

import { AnimatePresence, m } from "motion/react";
import { useMemo, useState } from "react";
import { AnimatedValue } from "@/components/motion/animated-value";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { fast, slow, STAGGER } from "@/lib/motion";
import type { Tone } from "@/lib/roles";
import { stageLabel } from "./mapping";
import type { DryRunIssue, DryRunResult, ImportJob, ImportOptions } from "./types";

type Filter = "ALL" | DryRunIssue["kind"];

const KIND: Record<DryRunIssue["kind"], { label: string; tone: Tone }> = {
  ERROR: { label: "Error", tone: "danger" },
  SKIPPED: { label: "Skipped", tone: "warning" },
  MATCHED: { label: "Duplicate", tone: "info" },
  WARNING: { label: "Note", tone: "neutral" },
};

export function ReviewStep({
  job, options, dry, error, busy, onBack, onStart,
}: {
  job: ImportJob;
  options: ImportOptions;
  dry: DryRunResult;
  error: string | null;
  busy: boolean;
  onBack: () => void;
  onStart: () => void;
}) {
  const { summary } = dry;
  const [filter, setFilter] = useState<Filter>("ALL");
  const total = Math.max(summary.total, 1);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: dry.issues.length, ERROR: 0, SKIPPED: 0, MATCHED: 0, WARNING: 0 };
    for (const issue of dry.issues) c[issue.kind] += 1;
    return c;
  }, [dry.issues]);
  const shown = useMemo(() => (filter === "ALL" ? dry.issues : dry.issues.filter((i) => i.kind === filter)), [dry.issues, filter]);

  const segments = [
    { key: "new", value: summary.new, bar: "bg-ok" },
    { key: "matched", value: summary.matched, bar: "bg-info" },
    { key: "skipped", value: summary.skipped, bar: "bg-warn" },
    { key: "errors", value: summary.errors, bar: "bg-bad" },
  ];

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2 font-semibold text-text">Dry run</h2>
        <p className="text-body text-text-2">Nothing has been saved. This is what will happen to the {formatNumber(summary.total)} rows in {job.fileName}.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="New leads" value={summary.new} hint="Will be created" className="text-ok" delay={0} />
        <Tile label="Duplicates" value={summary.matched} hint="Already leads or repeated" className="text-info" delay={1} />
        <Tile label="Skipped" value={summary.skipped} hint="Email and phone belong to different leads" className="text-warn" delay={2} />
        <Tile label="Errors" value={summary.errors} hint="Cannot be read" className="text-bad" delay={3} />
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-border" role="img" aria-label={`${summary.new} new, ${summary.matched} duplicates, ${summary.skipped} skipped, ${summary.errors} errors`}>
        {segments.map((s) => (
          <m.div key={s.key} className={s.bar} initial={{ width: 0 }} animate={{ width: `${(s.value / total) * 100}%` }} transition={{ ...slow, delay: 0.15 }} />
        ))}
      </div>

      <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-border bg-surface-alt p-4 text-body sm:grid-cols-2">
        <Row label="List" value={job.listName ?? "—"} />
        <Row label="Source" value={job.source?.name ?? "—"} />
        <Row label="Owner" value={job.owner?.name ?? "None (assignment queue)"} />
        <Row label="Duplicates" value={job.duplicateMode === "SKIP" ? "Skip them" : "Fill empty fields"} />
        <Row label="Starting stage" value={`${stageLabel(options.startingStage.lifecycle)} · ${stageLabel(options.startingStage.opportunity)}`} />
        <Row label="New fields" value={dry.newFields.length ? dry.newFields.join(", ") : "None"} />
      </dl>

      {dry.issues.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-alt px-4 py-2.5">
            <span className="flex-1 text-body font-medium text-text">Rows that need a look</span>
            <div className="max-w-full overflow-x-auto">
              <Segmented<Filter>
                ariaLabel="Filter rows"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "ALL", label: "All", count: counts.ALL },
                  ...(counts.ERROR ? [{ value: "ERROR" as const, label: "Errors", count: counts.ERROR }] : []),
                  ...(counts.MATCHED ? [{ value: "MATCHED" as const, label: "Duplicates", count: counts.MATCHED }] : []),
                  ...(counts.SKIPPED ? [{ value: "SKIPPED" as const, label: "Skipped", count: counts.SKIPPED }] : []),
                  ...(counts.WARNING ? [{ value: "WARNING" as const, label: "Notes", count: counts.WARNING }] : []),
                ]}
              />
            </div>
          </div>
          <ul className="max-h-72 divide-y divide-border overflow-y-auto">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.slice(0, 100).map((issue, i) => (
                <m.li
                  key={`${issue.kind}-${issue.rowNo}`}
                  layout="position"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { ...fast, delay: Math.min(i, 8) * STAGGER } }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-body"
                >
                  <span className="w-16 shrink-0 text-small text-muted">Row {issue.line}</span>
                  <Badge tone={KIND[issue.kind].tone}>{KIND[issue.kind].label}</Badge>
                  <span className="min-w-0 flex-1 basis-48 text-text-2">
                    {issue.message}
                    {issue.existingLead ? <span className="text-text"> · {issue.existingLead.name}</span> : null}
                  </span>
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
          {shown.length > 100 || dry.truncated ? (
            <p className="border-t border-border px-4 py-2 text-small text-text-2">
              {shown.length > 100 ? `Showing the first 100 of ${formatNumber(shown.length)}. ` : ""}
              {dry.truncated ? "The list is cut short; " : ""}every row is in the report you can download after the import.
            </p>
          ) : null}
        </div>
      ) : (
        <Alert tone="success">Every row looks good.</Alert>
      )}

      {error ? <Alert>{error}</Alert> : null}
      {summary.new === 0 ? <Alert tone="warning">Nothing new to import. Go back to change the file or the mapping.</Alert> : null}

      <div className="flex justify-between gap-2">
        <Button variant="secondary" onClick={onBack} disabled={busy}>Back</Button>
        <Button onClick={onStart} loading={busy} disabled={summary.new === 0}>Import {formatNumber(summary.new)} {summary.new === 1 ? "lead" : "leads"}</Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="w-28 shrink-0 text-text-2">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium break-words text-text">{value}</dd>
    </div>
  );
}

function Tile({ label, value, hint, className, delay }: { label: string; value: number; hint: string; className?: string; delay: number }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { ...fast, delay: delay * STAGGER * 2 } }}
      className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface-alt p-4"
    >
      <span className="text-small text-text-2">{label}</span>
      <AnimatedValue value={formatNumber(value)} className={cn("text-display font-bold", className)} />
      <span className="text-small text-muted">{hint}</span>
    </m.div>
  );
}
