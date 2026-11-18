"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { STAGE } from "./lead-display";
import { addDays, dayBounds, formatDay, isScheduledStage, STAGE_DATE_LABEL, todayIst, type DatedStage } from "./stage-date";

const COPY: Record<DatedStage, { title: (moved: boolean) => string; confirm: (moved: boolean) => string; hint: string }> = {
  TEST: { title: (r) => (r ? "Change the test date" : "When is the test?"), confirm: (r) => (r ? "Save date" : "Move to Test"), hint: "The day the test is scheduled for." },
  PSYCHOMETRIC_SESSION: { title: (r) => (r ? "Change the session date" : "When is the psychometric session?"), confirm: (r) => (r ? "Save date" : "Move to Psychometric session"), hint: "The day the session is scheduled for." },
  CLOSED_WON: { title: () => "Close as won", confirm: () => "Close as won", hint: "The day the deal was won. It cannot be in the future." },
};

/**
 * Asks for the day that goes with a stage: the test date, the psychometric session date, or the day the deal was won.
 * `reschedule` is for a lead that is already at the stage and only needs another day.
 */
export function StageDateModal({ open, stage, leadName, initial, reschedule = false, pending, error, onSubmit, onClose, children }: {
  open: boolean;
  stage: DatedStage;
  leadName: string;
  initial?: string | null;
  reschedule?: boolean;
  pending: boolean;
  error?: string;
  onSubmit: (day: string) => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return open ? <Form stage={stage} leadName={leadName} initial={initial ?? null} reschedule={reschedule} pending={pending} error={error} onSubmit={onSubmit} onClose={onClose}>{children}</Form> : null;
}

function Form({ stage, leadName, initial, reschedule, pending, error, onSubmit, onClose, children }: {
  stage: DatedStage;
  leadName: string;
  initial: string | null;
  reschedule: boolean;
  pending: boolean;
  error?: string;
  onSubmit: (day: string) => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const copy = COPY[stage];
  const bounds = dayBounds(stage);
  const [day, setDay] = useState(initial ?? (stage === "CLOSED_WON" ? todayIst() : ""));
  const [touched, setTouched] = useState(false);
  const problem = day === "" ? `Choose ${stage === "TEST" ? "the test date" : stage === "PSYCHOMETRIC_SESSION" ? "the date of the session" : "the date it was won"}` : day < bounds.min ? "That date is too far back" : day > bounds.max ? (stage === "CLOSED_WON" ? "The date it was won cannot be in the future" : "That date is more than a year away") : undefined;
  const today = todayIst();
  const quick = isScheduledStage(stage)
    ? [{ label: "Today", value: today }, { label: "Tomorrow", value: addDays(today, 1) }, { label: "In 3 days", value: addDays(today, 3) }, { label: "Next week", value: addDays(today, 7) }]
    : [{ label: "Today", value: today }, { label: "Yesterday", value: addDays(today, -1) }];

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (problem) return;
    onSubmit(day);
  }

  return (
    <Modal
      open
      title={copy.title(reschedule)}
      subtitle={`${leadName} · ${STAGE[stage].label}`}
      onClose={pending ? () => undefined : onClose}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form="stage-date-form" variant="cta" icon="check" loading={pending}>{copy.confirm(reschedule)}</Button>
        </>
      }
    >
      <form id="stage-date-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {error ? <Alert>{error}</Alert> : null}
        {children ? <div className="text-body text-text-2">{children}</div> : null}
        <Field label={STAGE_DATE_LABEL[stage]} hint={copy.hint} error={touched ? problem : undefined}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} type="date" value={day} min={bounds.min} max={bounds.max} autoFocus onChange={(e) => setDay(e.target.value)} invalid={invalid} aria-describedby={describedBy} />
        )}</Field>
        <div className="flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setDay(q.value)}
              className={cn("h-7 rounded-full px-3 text-small font-medium ring-1 transition", day === q.value ? "bg-primary-soft text-primary ring-primary/30" : "bg-surface text-text-2 ring-border hover:text-text")}
            >
              {q.label}
            </button>
          ))}
        </div>
        {day && !problem ? <p className="text-small text-text-2">{formatDay(day)}</p> : null}
      </form>
    </Modal>
  );
}
