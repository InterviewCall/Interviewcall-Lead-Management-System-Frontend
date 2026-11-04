"use client";

import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { AnimatedValue } from "@/components/motion/animated-value";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { downloadText } from "@/lib/download";
import { formatNumber } from "@/lib/format";
import { fast, slow, spring, STAGGER } from "@/lib/motion";
import type { Tone } from "@/lib/roles";
import { fetchReport } from "./api";
import { Burst } from "./burst";
import { isActive, useCancel, useImport, useImportRows, useStart } from "./hooks";
import type { ImportJob, RowStatus } from "./types";

export const STATUS_BADGE: Record<ImportJob["status"], { label: string; tone: Tone }> = {
  UPLOADED: { label: "Not started", tone: "neutral" },
  MAPPED: { label: "Ready to review", tone: "info" },
  QUEUED: { label: "Waiting", tone: "warning" },
  RUNNING: { label: "Importing", tone: "primary" },
  DONE: { label: "Done", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export function ProgressStep({ id, onAgain }: { id: string; onAgain: () => void }) {
  const query = useImport(id);
  const job = query.data;

  if (query.isError && !job) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <Alert>{errorMessage(query.error)}</Alert>
        <div><Button variant="secondary" onClick={onAgain}>Start over</Button></div>
      </div>
    );
  }
  if (!job) {
    return <div className="flex justify-center py-16"><Spinner size={22} className="text-primary" /></div>;
  }
  return <ProgressView job={job} onAgain={onAgain} />;
}

function ProgressView({ job, onAgain }: { job: ImportJob; onAgain: () => void }) {
  const toast = useToast();
  const start = useStart(job.id);
  const cancel = useCancel(job.id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [saving, setSaving] = useState(false);

  const { counts } = job;
  const active = isActive(job.status);
  const percent = counts.total > 0 ? Math.min(100, (counts.processed / counts.total) * 100) : 0;
  const finished = job.status === "DONE" || job.status === "FAILED" || job.status === "CANCELLED";

  async function downloadReport() {
    setSaving(true);
    try {
      const csv = await fetchReport(job.id);
      downloadText(`${job.fileName.replace(/\.csv$/i, "")}-import-report.csv`, `﻿${csv}`);
    } catch (e) {
      toast.show(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <AnimatePresence mode="wait" initial={false}>
        {job.status === "DONE" ? (
          <m.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: fast }} className="flex flex-col items-center gap-2 pt-4 text-center">
            <span className="relative flex size-14 items-center justify-center">
              <Burst />
              <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.05 }} className="flex size-14 items-center justify-center rounded-full bg-ok-soft text-ok">
                <Icon name="check" size={28} />
              </m.span>
            </span>
            <h2 className="text-h1 font-semibold text-text">
              <AnimatedValue value={formatNumber(counts.created)} /> {counts.created === 1 ? "lead" : "leads"} added
            </h2>
            <p className="text-body text-text-2">
              {job.listName ? <>to the list <span className="font-medium text-text">{job.listName}</span> · </> : null}
              {job.fileName}
            </p>
          </m.div>
        ) : job.status === "FAILED" ? (
          <m.div key="failed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: fast }} className="flex flex-col items-center gap-2 pt-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-bad-soft text-bad"><Icon name="warn" size={26} /></span>
            <h2 className="text-h1 font-semibold text-text">The import stopped</h2>
            <p className="max-w-md text-body text-text-2">{job.failureReason ?? "Something went wrong while importing."} Rows that were already imported are kept, and trying again continues where it stopped.</p>
          </m.div>
        ) : job.status === "CANCELLED" ? (
          <m.div key="cancelled" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: fast }} className="flex flex-col items-center gap-2 pt-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-bg text-text-2"><Icon name="x" size={26} /></span>
            <h2 className="text-h1 font-semibold text-text">Import cancelled</h2>
            <p className="text-body text-text-2">{counts.created > 0 ? `${formatNumber(counts.created)} leads were added before it stopped and are kept.` : "No leads were added."}</p>
          </m.div>
        ) : active ? (
          <m.div key="active" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: fast }} className="flex flex-col gap-1">
            <h2 className="flex items-center gap-2 text-h2 font-semibold text-text">
              {job.status === "QUEUED" ? "Waiting for the importer" : "Importing leads"}
              <Spinner size={16} className="text-primary" />
            </h2>
            <p className="text-body text-text-2">{job.fileName} · you can leave this page; the import keeps running.</p>
          </m.div>
        ) : (
          <m.div key="idle" className="flex flex-col gap-1">
            <h2 className="text-h2 font-semibold text-text">This import has not started</h2>
            <p className="text-body text-text-2">{job.fileName}</p>
          </m.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 text-body">
          <span className="font-medium text-text" aria-live="polite">
            <AnimatedValue value={formatNumber(counts.processed)} /> of {formatNumber(counts.total)} rows
          </span>
          <span className="flex items-center gap-2 text-text-2">
            {job.status === "RUNNING" ? <Eta job={job} /> : null}
            <span className="font-semibold text-text tabular-nums">{Math.floor(percent)}%</span>
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Import progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(percent)}>
          <m.div
            className={cn("h-full rounded-full", job.status === "DONE" ? "bg-ok" : job.status === "FAILED" ? "bg-bad" : "bg-primary", active && "progress-sheen")}
            initial={{ width: 0 }}
            animate={{ width: `${job.status === "QUEUED" ? 2 : percent}%` }}
            transition={slow}
          />
        </div>
        {job.status === "QUEUED" ? <QueueHint /> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Count label="Added" value={counts.created} tone="text-ok" delay={0} />
        <Count label="Duplicates" value={counts.matched} tone="text-info" delay={1} />
        <Count label="Skipped" value={counts.skipped} tone="text-warn" delay={2} />
        <Count label="Errors" value={counts.errors} tone="text-bad" delay={3} />
      </div>

      {start.isError ? <Alert>{errorMessage(start.error)}</Alert> : null}
      {cancel.isError ? <Alert>{errorMessage(cancel.error)}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {active ? (
          <>
            <span className="text-small text-muted">Started by {job.createdBy.name}</span>
            <Button variant="secondary" onClick={() => setConfirmCancel(true)}>Cancel import</Button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {job.status === "DONE" ? (
                <Link href="/leads" className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-body font-medium text-white hover:bg-primary-hover">View leads</Link>
              ) : null}
              {job.status === "FAILED" ? <Button loading={start.isPending} onClick={() => start.mutate()}>Try again</Button> : null}
              {finished ? <Button variant="secondary" icon="download" loading={saving} onClick={() => void downloadReport()}>Download report</Button> : null}
            </div>
            <Button variant={job.status === "DONE" ? "secondary" : "ghost"} onClick={onAgain}>Import another file</Button>
          </>
        )}
      </div>

      {finished && counts.processed > 0 ? <RowsPanel job={job} /> : null}

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this import?"
        confirmLabel="Cancel import"
        danger
        loading={cancel.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => cancel.mutate(undefined, { onSettled: () => setConfirmCancel(false) })}
      >
        Leads that were already added stay in the CRM. The rest of the file is not imported.
      </ConfirmDialog>
    </div>
  );
}

function Count({ label, value, tone, delay }: { label: string; value: number; tone: string; delay: number }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { ...fast, delay: delay * STAGGER * 2 } }}
      className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface-alt p-4"
    >
      <span className="text-small text-text-2">{label}</span>
      <AnimatedValue value={formatNumber(value)} className={cn("text-display font-bold", value > 0 ? tone : "text-muted")} />
    </m.div>
  );
}

/** Time left, from how fast rows have been processed so far. */
function Eta({ job }: { job: ImportJob }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { processed, total } = job.counts;
  const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : null;
  if (!startedAt || processed < 20 || processed >= total) return null;
  const perSecond = processed / Math.max((now - startedAt) / 1000, 1);
  const left = Math.ceil((total - processed) / perSecond);
  if (!Number.isFinite(left)) return null;
  return <span className="text-small">{left < 60 ? `about ${Math.max(left, 1)}s left` : `about ${Math.ceil(left / 60)} min left`}</span>;
}

/** Appears when an import has waited a while. The importer is a separate process and may not be running. */
function QueueHint() {
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 15_000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <AnimatePresence>
      {waited ? (
        <m.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: fast }} className="text-small text-warn">
          This is taking longer than usual to start. If it stays here, the import worker may not be running; ask whoever runs the servers to check it.
        </m.p>
      ) : null}
    </AnimatePresence>
  );
}

// -------------------------------------------------------------------- what happened to each row

type Tab = Exclude<RowStatus, "PENDING">;

const TAB_LABEL: Record<Tab, string> = { CREATED: "Added", MATCHED: "Duplicates", SKIPPED: "Skipped", ERROR: "Errors" };
const ROW_TONE: Record<RowStatus, Tone> = { CREATED: "success", MATCHED: "info", SKIPPED: "warning", ERROR: "danger", PENDING: "neutral" };

function RowsPanel({ job }: { job: ImportJob }) {
  const { counts } = job;
  const sizes: Record<Tab, number> = { CREATED: counts.created, MATCHED: counts.matched, SKIPPED: counts.skipped, ERROR: counts.errors };
  const firstWithRows = (["ERROR", "SKIPPED", "MATCHED", "CREATED"] as Tab[]).find((t) => sizes[t] > 0) ?? "CREATED";
  const [picked, setPicked] = useState<Tab | null>(null);
  const [page, setPage] = useState(1);
  const tab = picked ?? firstWithRows;
  const rows = useImportRows(job.id, tab, page);

  // Show the columns people recognise: name, email, phone. Otherwise the first three.
  const columns = useMemo(() => {
    const wanted = ["name", "firstName", "email", "phone"];
    const mapped = wanted.flatMap((t) => (job.mapping ?? []).filter((c) => c.target === t).map((c) => c.index));
    const picked = mapped.length >= 2 ? mapped.slice(0, 3) : job.headers.slice(0, 3).map((_, i) => i);
    return picked;
  }, [job.mapping, job.headers]);

  const total = rows.data?.total ?? 0;
  const pageSize = rows.data?.pageSize ?? 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const options = (Object.keys(TAB_LABEL) as Tab[]).filter((t) => sizes[t] > 0 || t === tab).map((t) => ({ value: t, label: TAB_LABEL[t], count: sizes[t] }));

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-alt px-4 py-2.5">
        <span className="flex-1 text-body font-medium text-text">What happened to each row</span>
        <div className="max-w-full overflow-x-auto">
          <Segmented<Tab> ariaLabel="Rows by result" options={options} value={tab} onChange={(t) => { setPicked(t); setPage(1); }} />
        </div>
      </div>
      {rows.isError ? (
        <div className="p-4"><Alert>{errorMessage(rows.error)}</Alert></div>
      ) : rows.isPending ? (
        <div className="py-8"><Spinner className="mx-auto text-primary" /></div>
      ) : rows.data.items.length === 0 ? (
        <p className="px-4 py-6 text-center text-body text-text-2">No rows here.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.data.items.map((row, i) => (
            <m.li
              key={row.rowNo}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { ...fast, delay: Math.min(i, 8) * STAGGER } }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-body"
            >
              <span className="w-14 shrink-0 text-small text-muted">Row {row.line}</span>
              <span className="flex min-w-0 flex-1 basis-56 flex-wrap gap-x-3 text-text">
                {columns.map((c) => (row.cells[c] ? <span key={c} className="max-w-[16rem] truncate">{row.cells[c]}</span> : null))}
              </span>
              {row.message ? <span className="min-w-0 basis-56 text-small text-text-2">{row.message}</span> : <Badge tone={ROW_TONE[row.status]}>{TAB_LABEL[row.status as Tab] ?? "Pending"}</Badge>}
            </m.li>
          ))}
        </ul>
      )}
      {pages > 1 ? (
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-small text-text-2">
          <span>Page {page} of {pages}</span>
          <span className="flex gap-1">
            <Button variant="ghost" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="ghost" className="h-7 px-2" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

