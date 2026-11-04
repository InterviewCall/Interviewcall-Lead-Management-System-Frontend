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
import { bulkAssign, fetchAssignees, handoverKeys, type Assignee, type MoveResult } from "./handover-api";

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

/** Waiting WorkR day-lists, shown above the leads table to whoever distributes them. */
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
