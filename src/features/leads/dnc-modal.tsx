"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { useMarkLead } from "./hooks";
import type { LeadDetail } from "./types";

/**
 * Marking a lead do not contact (they asked to be left alone) or allowing contact again. Marking cancels the lead's
 * open follow-ups and blocks new ones; allowing it again is for managers and admins.
 */
export function DoNotContactModal({ lead, open, onClose }: { lead: LeadDetail["lead"]; open: boolean; onClose: () => void }) {
  return open ? <DncForm lead={lead} onClose={onClose} /> : null;
}

function DncForm({ lead, onClose }: { lead: LeadDetail["lead"]; onClose: () => void }) {
  const toast = useToast();
  const { doNotContact } = useMarkLead(lead.id);
  const [reason, setReason] = useState("");
  const clearing = lead.doNotContact;

  function confirm() {
    doNotContact.mutate(
      { value: !clearing, reason: !clearing && reason.trim() ? reason.trim() : undefined },
      {
        onSuccess: () => {
          toast.show(clearing ? `${lead.name} can be contacted again` : `${lead.name} is marked do not contact`, "success");
          onClose();
        },
      },
    );
  }

  return (
    <Modal
      open
      title={clearing ? "Allow contact again?" : "Mark as do not contact?"}
      subtitle={clearing ? "Calls and follow-ups can be planned for this lead again." : "Use this when the person asks to be left alone."}
      onClose={doNotContact.isPending ? () => undefined : onClose}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={doNotContact.isPending}>Cancel</Button>
          <Button variant={clearing ? "primary" : "danger"} onClick={confirm} loading={doNotContact.isPending}>{clearing ? "Allow contact" : "Mark do not contact"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {doNotContact.isError ? <Alert>{errorMessage(doNotContact.error)}</Alert> : null}
        {clearing ? (
          <p className="text-body text-text-2">Only do this if the person has said it is fine to reach them.</p>
        ) : (
          <>
            <p className="text-body text-text-2">Open follow-ups on this lead are cancelled and new ones cannot be added. The lead leaves the calling queue and stays out of message lists.</p>
            <Field label="Reason (optional)">
              {({ id, describedBy, invalid }) => <TextInput id={id} aria-describedby={describedBy} invalid={invalid} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Asked on WhatsApp to stop" />}
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}
