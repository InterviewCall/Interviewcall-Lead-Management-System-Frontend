"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { useMarkLead } from "./hooks";
import type { LeadDetail } from "./types";

/**
 * Erasing a person's details when they ask (DPDP). Admins only. The lead stays in the counts as an anonymous row;
 * the name, phone, email, notes and form answers are removed for good.
 */
export function AnonymiseModal({ lead, open, onClose }: { lead: LeadDetail["lead"]; open: boolean; onClose: () => void }) {
  return open ? <AnonymiseForm lead={lead} onClose={onClose} /> : null;
}

function AnonymiseForm({ lead, onClose }: { lead: LeadDetail["lead"]; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const { anonymise } = useMarkLead(lead.id);
  const [reason, setReason] = useState("");
  const [sure, setSure] = useState(false);
  const [touched, setTouched] = useState(false);
  const reasonError = touched && reason.trim().length < 5 ? "Say why, in at least a few words" : undefined;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (reason.trim().length < 5 || !sure) return;
    anonymise.mutate(reason.trim(), {
      onSuccess: () => {
        toast.show("The lead was anonymised", "success");
        onClose();
        router.push("/leads");
      },
    });
  }

  return (
    <Modal
      open
      title="Erase this person's details?"
      subtitle={`${lead.name} will become an anonymous lead.`}
      onClose={anonymise.isPending ? () => undefined : onClose}
      width={500}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={anonymise.isPending}>Cancel</Button>
          <Button type="submit" form="anonymise-form" variant="danger" loading={anonymise.isPending} disabled={!sure}>Erase details</Button>
        </>
      }
    >
      <form id="anonymise-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {anonymise.isError ? <Alert>{errorMessage(anonymise.error)}</Alert> : null}
        <p className="text-body text-text-2">
          The name, phone, email, company, notes, form answers and anything the sources sent are removed. Open follow-ups are cancelled.
          Counts, stages and payments stay, so the reports still add up. This cannot be undone.
        </p>
        <Field label="Why is this being erased?" hint="Kept in the audit log, for example “Asked by email on 15 Nov”" error={reasonError}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />
        )}</Field>
        <label className="flex items-start gap-2.5 text-body text-text">
          <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
          <span>I understand the details cannot be recovered</span>
        </label>
      </form>
    </Modal>
  );
}
