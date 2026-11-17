"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { useAssignees, useMarkLead } from "./hooks";
import type { LeadDetail } from "./types";

/** Gives one lead a new owner, with its open opportunity, follow-ups and booked call. Managers and admins only. */
export function OwnerModal({ lead, open, onClose }: { lead: LeadDetail["lead"]; open: boolean; onClose: () => void }) {
  return open ? <OwnerForm lead={lead} onClose={onClose} /> : null;
}

function OwnerForm({ lead, onClose }: { lead: LeadDetail["lead"]; onClose: () => void }) {
  const toast = useToast();
  const assignees = useAssignees(true);
  const { owner } = useMarkLead(lead.id);
  const [to, setTo] = useState("");
  const people = (assignees.data ?? []).filter((a) => a.id !== lead.owner?.id);

  function save() {
    if (!to) return;
    const name = people.find((p) => p.id === to)?.name ?? "them";
    owner.mutate(to, {
      onSuccess: () => {
        toast.show(`${lead.name} now belongs to ${name}`, "success");
        onClose();
      },
    });
  }

  return (
    <Modal
      open
      title="Change owner"
      subtitle={lead.owner ? `Now with ${lead.owner.name}. Open follow-ups and booked calls move too.` : "Open follow-ups and booked calls go to the new owner."}
      onClose={owner.isPending ? () => undefined : onClose}
      width={440}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={owner.isPending}>Cancel</Button>
          <Button variant="cta" icon="check" onClick={save} disabled={!to} loading={owner.isPending}>Give the lead</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[18px]">
        {owner.isError ? <Alert>{errorMessage(owner.error)}</Alert> : null}
        {assignees.isError ? <Alert>{errorMessage(assignees.error)}</Alert> : null}
        <Field label="New owner">{({ id, describedBy }) => (
          <Select id={id} value={to} onChange={(e) => setTo(e.target.value)} aria-describedby={describedBy} autoFocus>
            <option value="">Choose a person</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}</Field>
      </div>
    </Modal>
  );
}
