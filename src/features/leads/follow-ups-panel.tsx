"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { EditTaskModal } from "./edit-task-modal";
import { useEngagement, useEngagementActions } from "./hooks";
import type { LeadTask } from "./types";

const dueFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** What is waiting on this lead: follow-ups and the booked call, earliest first. Hidden when nothing is open. */
export function FollowUpsPanel({ leadId, editable }: { leadId: string; editable: boolean }) {
  const toast = useToast();
  const q = useEngagement(leadId);
  const { complete, cancel } = useEngagementActions(leadId);
  const [editing, setEditing] = useState<LeadTask | null>(null);

  if (q.isPending) return <div className="flex justify-center py-3"><Spinner size={16} className="text-primary" /></div>;
  if (q.isError) return <Alert>{errorMessage(q.error)}</Alert>;
  const open = q.data.tasks.filter((t) => t.status === "OPEN");
  if (open.length === 0) return null;

  const fail = (e: unknown) => toast.show(errorMessage(e), "error");
  const busy = complete.isPending || cancel.isPending;

  return (
    <section aria-label="Follow-ups" className="mb-3 rounded-xl border border-border bg-surface shadow-card">
      <h2 className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-body font-semibold text-text">
        <Icon name="clock" size={15} className="text-primary" /> Waiting on this lead
        <span className="rounded-full bg-surface-alt px-2 text-small font-medium text-text-2">{open.length}</span>
      </h2>
      <ul className="divide-y divide-border">
        {open.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
            {editable ? (
              <button
                type="button"
                aria-label={`Mark done: ${t.title}`}
                disabled={busy}
                onClick={() => complete.mutate(t.id, { onSuccess: () => toast.show("Marked done", "success"), onError: fail })}
                className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-transparent transition hover:border-ok hover:bg-ok-soft hover:text-ok disabled:opacity-50"
              >
                <Icon name="check" size={13} />
              </button>
            ) : (
              <Icon name={t.type === "SCHEDULED_CALL" ? "calendar" : "clock"} size={16} className="shrink-0 text-text-2" />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-medium text-text">{t.title}</span>
              <span className={cn("text-small", t.overdue ? "text-bad" : "text-text-2")}>
                {dueFormat.format(new Date(t.dueAt))}{t.assignee ? ` · ${t.assignee}` : " · Not assigned yet"}
              </span>
            </div>
            {t.overdue ? <Badge tone="danger">Overdue</Badge> : t.type === "SCHEDULED_CALL" ? <Badge tone="info">Booked call</Badge> : null}
            {editable && t.type === "FOLLOW_UP" ? (
              <button type="button" aria-label={`Change: ${t.title}`} title="Reschedule or reassign" onClick={() => setEditing(t)} className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-primary-soft hover:text-primary">
                <Icon name="edit" size={14} />
              </button>
            ) : null}
            <CancelButton task={t} show={editable && t.type === "FOLLOW_UP"} disabled={busy} onCancel={() => cancel.mutate(t.id, { onSuccess: () => toast.show("Follow-up cancelled"), onError: fail })} />
          </li>
        ))}
      </ul>
      <EditTaskModal leadId={leadId} task={editing} onClose={() => setEditing(null)} />
    </section>
  );
}

function CancelButton({ task, show, disabled, onCancel }: { task: LeadTask; show: boolean; disabled: boolean; onCancel: () => void }) {
  if (!show) return null;
  return (
    <button type="button" aria-label={`Cancel: ${task.title}`} disabled={disabled} onClick={onCancel} className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-bad-soft hover:text-bad disabled:opacity-50">
      <Icon name="x" size={14} />
    </button>
  );
}
