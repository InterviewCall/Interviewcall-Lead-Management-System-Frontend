"use client";

import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber, relativeTime } from "@/lib/format";
import { fast, STAGGER } from "@/lib/motion";
import { useImportHistory } from "./hooks";
import { STATUS_BADGE } from "./progress-step";
import type { ImportJob } from "./types";

export function HistoryPanel({
  selectedId, onOpen, onDiscard,
}: {
  selectedId: string | null;
  onOpen: (job: ImportJob) => void;
  onDiscard: (job: ImportJob) => void;
}) {
  const [page, setPage] = useState(1);
  const history = useImportHistory(page);
  const pages = history.data ? Math.max(1, Math.ceil(history.data.total / history.data.pageSize)) : 1;

  return (
    <Card className="w-full shrink-0 lg:w-[340px]">
      <CardHeader title="Recent imports" subtitle={history.data ? `${formatNumber(history.data.total)} in total` : undefined} />
      {history.isPending ? (
        <div className="py-10"><Spinner className="mx-auto text-primary" /></div>
      ) : history.isError ? (
        <div className="p-4"><Alert>{errorMessage(history.error)}</Alert></div>
      ) : history.data.items.length === 0 ? (
        <p className="px-5 py-8 text-center text-body text-text-2">No imports yet. Your first one will show up here.</p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {history.data.items.map((job, i) => {
                const badge = STATUS_BADGE[job.status];
                const unstarted = job.status === "UPLOADED" || job.status === "MAPPED";
                return (
                  <m.li
                    key={job.id}
                    layout="position"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { ...fast, delay: Math.min(i, 8) * STAGGER } }}
                    className={cn("flex flex-col gap-1 px-5 py-3.5 transition-colors", selectedId === job.id ? "bg-primary-soft/60" : "hover:bg-surface-alt")}
                  >
                    <button type="button" onClick={() => onOpen(job)} className="flex flex-col gap-1 text-left" aria-label={`Open import ${job.fileName}`}>
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-body font-medium text-text">{job.fileName}</span>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </span>
                      <span className="text-small text-text-2">
                        {job.status === "DONE" || job.status === "CANCELLED" || job.status === "FAILED" || job.status === "RUNNING"
                          ? `${formatNumber(job.counts.created)} of ${formatNumber(job.counts.total)} rows added`
                          : `${formatNumber(job.counts.total)} rows`}
                        {" · "}
                        {relativeTime(job.createdAt)}
                      </span>
                      {job.listName ? <span className="truncate text-small text-muted">List: {job.listName}{job.createdBy ? ` · ${job.createdBy.name}` : ""}</span> : null}
                    </button>
                    {unstarted ? (
                      <span className="flex gap-1">
                        {job.status === "MAPPED" ? <Button variant="secondary" className="h-7 px-2.5 text-small" onClick={() => onOpen(job)}>Continue</Button> : null}
                        <Button variant="ghost" className="h-7 px-2.5 text-small" onClick={() => onDiscard(job)}>Discard</Button>
                      </span>
                    ) : null}
                  </m.li>
                );
              })}
            </AnimatePresence>
          </ul>
          {pages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-5 py-2 text-small text-text-2">
              <span>Page {page} of {pages}</span>
              <span className="flex gap-1">
                <Button variant="ghost" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="ghost" className="h-7 px-2" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
              </span>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
