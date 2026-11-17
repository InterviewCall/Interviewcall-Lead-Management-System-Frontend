"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { formatNumber } from "@/lib/format";
import { roleLabel } from "@/lib/roles";
import { Card, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { bulkAssign, fetchAssignees, fetchBatches, handOverBatch, handoverKeys, type Assignee, type Batch, type MoveResult } from "./handover-api";

export const DISTRIBUTOR_ROLES = ["ADMIN", "SALES_MANAGER"] as const;
export const canDistribute = (role: string | undefined) => DISTRIBUTOR_ROLES.some((r) => r === role);

function useAssignees(enabled: boolean) {
  return useQuery({ queryKey: handoverKeys.assignees, queryFn: fetchAssignees, enabled, staleTime: 60_000 });
}

function useRefreshLeads() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ["leads", "assignment", "pipeline", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
  };
}

function summary(r: MoveResult): string {
  const moved = `${formatNumber(r.moved)} ${r.moved === 1 ? "lead" : "leads"} now with ${r.to.name}.`;
  return r.skipped > 0 ? `${moved} ${formatNumber(r.skipped)} skipped (already theirs or no longer yours to move).` : moved;
}

/** Gives the selected leads to one person. Admins and sales managers only. */
export function AssignLeadsModal({ leadIds, onClose, onDone }: { leadIds: string[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const refresh = useRefreshLeads();
  const assignees = useAssignees(true);
  const people: Assignee[] = assignees.data ?? [];
  const [toUserId, setToUserId] = useState("");

  const run = useMutation({
    mutationFn: () => bulkAssign({ leadIds, toUserId }),
    onSuccess: (r) => { toast.show(summary(r)); refresh(); onDone(); },
  });

  return (
    <Modal open title="Assign leads" subtitle={`${formatNumber(leadIds.length)} selected`} onClose={onClose} width={480}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon="check" loading={run.isPending} disabled={!toUserId} onClick={() => run.mutate()}>Assign</Button></>}>
      <div className="flex flex-col gap-3">
        {assignees.isError ? <Alert>{errorMessage(assignees.error)}</Alert> : null}
        <label className="flex flex-col gap-1.5 text-body font-medium text-text">
          Give them to
          <Select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
            <option value="">Choose a person</option>
            {people.map((a) => <option key={a.id} value={a.id}>{a.name} · {roleLabel(a.role)}</option>)}
          </Select>
        </label>
        <p className="text-small text-text-2">Their open opportunity moves with each lead, and every change is written to the lead&apos;s timeline.</p>
        {run.isError ? <Alert>{errorMessage(run.error)}</Alert> : null}
      </div>
    </Modal>
  );
}

const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

/**
 * The daily WorkR lists. New WorkR leads belong to the intake owner until someone hands them on; this shows each day's
 * list with how many still wait, and gives them all to one person in one step.
 */
export function WorkrBatchesCard() {
  const batches = useQuery({ queryKey: handoverKeys.batches, queryFn: fetchBatches, refetchInterval: 60_000 });
  const [handing, setHanding] = useState<Batch | null>(null);
  const rows = batches.data ?? [];
  const waiting = rows.reduce((n, b) => n + b.waiting, 0);

  return (
    <Card>
      <CardHeader title="WorkR day lists" subtitle={batches.data ? (waiting > 0 ? `${formatNumber(waiting)} ${waiting === 1 ? "lead waits" : "leads wait"} with ${rows.find((b) => b.waiting > 0)?.ownerName ?? "the intake owner"}` : "Every list has been handed over") : "Loading…"} />
      {batches.isError ? (
        <div className="p-4"><Alert>{errorMessage(batches.error)}</Alert></div>
      ) : batches.isPending ? (
        <div className="py-6"><Spinner className="mx-auto text-primary" /></div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-4 text-small text-text-2">No WorkR list has arrived yet. Each day&apos;s new WorkR leads appear here as one list.</p>
      ) : (
        <ul className="flex max-h-[320px] flex-col divide-y divide-border overflow-y-auto">
          {rows.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium text-text" title={b.name}>{b.name}</span>
                <span className="text-small text-text-2">{dayFormat.format(new Date(b.createdAt))} · {b.waiting === 0 ? `all ${formatNumber(b.total)} handed over` : `${formatNumber(b.waiting)} of ${formatNumber(b.total)} waiting`}</span>
              </div>
              <Button variant={b.waiting > 0 ? "primary" : "secondary"} className="h-8" disabled={b.waiting === 0} onClick={() => setHanding(b)}>Hand over</Button>
            </li>
          ))}
        </ul>
      )}
      {handing ? <HandOverModal batch={handing} onClose={() => setHanding(null)} /> : null}
    </Card>
  );
}

function HandOverModal({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const toast = useToast();
  const refresh = useRefreshLeads();
  const queryClient = useQueryClient();
  const assignees = useAssignees(true);
  const [toUserId, setToUserId] = useState("");
  const run = useMutation({
    mutationFn: () => handOverBatch({ listId: batch.id, toUserId }),
    onSuccess: (r) => {
      toast.show(summary(r));
      void queryClient.invalidateQueries({ queryKey: handoverKeys.batches });
      refresh();
      onClose();
    },
  });
  return (
    <Modal open title="Hand over this list" subtitle={`${batch.name} · ${formatNumber(batch.waiting)} waiting`} onClose={run.isPending ? () => undefined : onClose} width={480}
      footer={<><Button variant="secondary" onClick={onClose} disabled={run.isPending}>Cancel</Button><Button icon="check" loading={run.isPending} disabled={!toUserId} onClick={() => run.mutate()}>Hand over {formatNumber(batch.waiting)}</Button></>}>
      <div className="flex flex-col gap-3">
        {assignees.isError ? <Alert>{errorMessage(assignees.error)}</Alert> : null}
        <label className="flex flex-col gap-1.5 text-body font-medium text-text">
          Give all of them to
          <Select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
            <option value="">Choose a person</option>
            {(assignees.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name} · {roleLabel(a.role)}</option>)}
          </Select>
        </label>
        <p className="text-small text-text-2">Only leads still with {batch.ownerName} move. Anyone already handed on stays where they are, so it is safe to press again later.</p>
        {run.isError ? <Alert>{errorMessage(run.error)}</Alert> : null}
      </div>
    </Modal>
  );
}
