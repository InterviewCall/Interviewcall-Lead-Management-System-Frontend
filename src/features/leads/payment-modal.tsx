"use client";

import { m } from "motion/react";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { formatRupees } from "@/lib/format";
import { fast } from "@/lib/motion";
import type { PaymentInput } from "./api";
import { useMarkLead } from "./hooks";
import type { Enrolment, PaymentMode } from "./types";

export const PAYMENT_MODE: Record<PaymentMode, string> = {
  FULL: "Paid in full",
  EMI: "EMI to the academy",
  LOAN: "Education loan / financing",
  PART: "Part paid, rest pending",
};

/** A number typed with or without commas, ₹ or spaces. Null when it is not a whole number. */
const parseRupees = (raw: string): number | null => {
  const digits = raw.replace(/[₹,\s]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : null;
};

/**
 * Closing a deal as won (`mode: "won"`) or keeping its payment up to date (`mode: "update"`): the programme, the fee
 * agreed, how they pay and what has come in so far.
 */
export function PaymentModal({ leadId, leadName, mode, current, open, onClose }: {
  leadId: string;
  leadName: string;
  mode: "won" | "update";
  current: Enrolment | null;
  open: boolean;
  onClose: () => void;
}) {
  return open ? <PaymentForm leadId={leadId} leadName={leadName} mode={mode} current={current} onClose={onClose} /> : null;
}

function PaymentForm({ leadId, leadName, mode, current, onClose }: { leadId: string; leadName: string; mode: "won" | "update"; current: Enrolment | null; onClose: () => void }) {
  const toast = useToast();
  const mark = useMarkLead(leadId);
  const save = mode === "won" ? mark.won : mark.payment;
  const [program, setProgram] = useState(current?.program ?? "");
  const [fee, setFee] = useState(current ? String(current.feeAmount) : "");
  const [collected, setCollected] = useState(current ? String(current.amountCollected) : "");
  const [paymentMode, setPaymentMode] = useState<PaymentMode | "">(current?.paymentMode ?? "");
  const [note, setNote] = useState(current?.note ?? "");
  const [touched, setTouched] = useState(false);

  const feeValue = parseRupees(fee);
  const collectedValue = collected.trim() === "" ? 0 : parseRupees(collected);
  const errors: Record<string, string | undefined> = touched
    ? {
        feeAmount: feeValue === null || feeValue < 1 ? "Enter the fee agreed, in rupees" : undefined,
        amountCollected:
          collectedValue === null ? "Enter a whole number of rupees" : feeValue !== null && collectedValue > feeValue ? "More than the fee" : undefined,
        paymentMode: paymentMode === "" ? "Choose how they are paying" : undefined,
      }
    : {};
  const server = save.isError ? toApiError(save.error).fields ?? {} : {};
  const pending = feeValue !== null && collectedValue !== null ? Math.max(0, feeValue - collectedValue) : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (feeValue === null || feeValue < 1 || collectedValue === null || collectedValue > feeValue || paymentMode === "") return;
    const input: PaymentInput = {
      program: program.trim() || null,
      feeAmount: feeValue,
      amountCollected: collectedValue,
      paymentMode,
      note: note.trim() || null,
    };
    save.mutate(input, {
      onSuccess: () => {
        toast.show(mode === "won" ? `${leadName} is now Enrolled` : "Payment saved", "success");
        onClose();
      },
    });
  }

  return (
    <Modal
      open
      title={mode === "won" ? "Close as won" : current ? "Update payment" : "Add payment details"}
      subtitle={mode === "won" ? `${leadName} becomes Enrolled and pre-sales follow-ups stop. Only a manager can move them back.` : `For ${leadName}'s enrolment`}
      onClose={save.isPending ? () => undefined : onClose}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="payment-form" variant="cta" icon="check" loading={save.isPending}>{mode === "won" ? "Close as won" : "Save payment"}</Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
        {save.isError && Object.keys(server).length === 0 ? <Alert>{errorMessage(save.error)}</Alert> : null}
        <Field label="Programme" hint="Optional">{({ id, describedBy }) => (
          <TextInput id={id} value={program} maxLength={120} placeholder="e.g. AI-Proof Engineer Program" onChange={(e) => setProgram(e.target.value)} aria-describedby={describedBy} autoFocus list="programmes" />
        )}</Field>
        <datalist id="programmes">
          <option value="AI-Proof Engineer Program" />
          <option value="Lancrs Academy" />
        </datalist>
        <div className="grid gap-[18px] sm:grid-cols-2">
          <Field label="Fee agreed (₹)" error={errors.feeAmount ?? server.feeAmount}>{({ id, describedBy, invalid }) => (
            <TextInput id={id} value={fee} inputMode="numeric" placeholder="120000" onChange={(e) => setFee(e.target.value)} invalid={invalid} aria-describedby={describedBy} />
          )}</Field>
          <Field label="Collected so far (₹)" error={errors.amountCollected ?? server.amountCollected}>{({ id, describedBy, invalid }) => (
            <TextInput id={id} value={collected} inputMode="numeric" placeholder="0" onChange={(e) => setCollected(e.target.value)} invalid={invalid} aria-describedby={describedBy} />
          )}</Field>
        </div>
        <Field label="How they are paying" error={errors.paymentMode ?? server.paymentMode}>{({ id, describedBy, invalid }) => (
          <Select id={id} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode | "")} invalid={invalid} aria-describedby={describedBy}>
            <option value="">Choose</option>
            {(Object.keys(PAYMENT_MODE) as PaymentMode[]).map((k) => <option key={k} value={k}>{PAYMENT_MODE[k]}</option>)}
          </Select>
        )}</Field>
        <Field label="Note" hint="Optional: EMI plan, loan partner, due dates">{({ id, describedBy }) => (
          <TextInput id={id} value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} aria-describedby={describedBy} />
        )}</Field>
        {pending !== null && feeValue ? (
          <p className="text-small text-text-2">{pending === 0 ? "Fully collected." : `${formatRupees(pending)} still to collect.`}</p>
        ) : null}
      </form>
    </Modal>
  );
}

/** The won deal's money on the lead page: fee, collected, still to collect. */
export function PaymentStrip({ enrolment, canEdit, onEdit }: { enrolment: Enrolment | null; canEdit: boolean; onEdit: () => void }) {
  return (
    <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto", transition: fast }} className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-ok-soft px-3 py-2 text-body text-ok">
        <Icon name="check" size={14} />
        {enrolment ? (
          <>
            <span className="font-medium">Won · {formatRupees(enrolment.feeAmount)}</span>
            <span className="text-ok/90">{formatRupees(enrolment.amountCollected)} collected{enrolment.feeAmount > enrolment.amountCollected ? ` · ${formatRupees(enrolment.feeAmount - enrolment.amountCollected)} to collect` : ""}</span>
            <span className="text-ok/80">· {PAYMENT_MODE[enrolment.paymentMode]}{enrolment.program ? ` · ${enrolment.program}` : ""}</span>
          </>
        ) : (
          <span className="font-medium">Won · payment not recorded yet</span>
        )}
        <span className="flex-1" />
        {canEdit ? (
          <Button variant="secondary" className="h-8" icon={enrolment ? "edit" : "plus"} onClick={onEdit}>{enrolment ? "Update payment" : "Add payment"}</Button>
        ) : null}
      </div>
    </m.div>
  );
}
