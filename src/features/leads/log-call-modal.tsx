"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { STAGES, type MockLead, type Stage, type Temperature } from "@/mock/types";
import type { LogCallInput } from "./api";
import { useLogCall } from "./hooks";

const OUTCOMES: LogCallInput["outcome"][] = ["Connected", "No answer", "Busy", "Wrong number"];
const ACTIONS = ["Call back", "Send WhatsApp", "Send test link", "Book call", "Review"];

export function LogCallModal({ lead, open, onClose }: { lead: MockLead; open: boolean; onClose: () => void }) {
  return open ? <LogCallForm lead={lead} onClose={onClose} /> : null;
}

function LogCallForm({ lead, onClose }: { lead: MockLead; onClose: () => void }) {
  const toast = useToast();
  const log = useLogCall();
  const [outcome, setOutcome] = useState<LogCallInput["outcome"]>("Connected");
  const [stage, setStage] = useState<Stage>(lead.stage);
  const [temperature, setTemperature] = useState<Temperature>(lead.temperature);
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState(ACTIONS[0]!);
  const [due, setDue] = useState("");
  const [touched, setTouched] = useState(false);
  const dueError = touched && due === "" ? "Choose when to follow up" : undefined;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (due === "") return;
    const dueLabel = new Date(due).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    log.mutate(
      { leadId: lead.id, outcome, stage, temperature, notes: notes.trim(), action, due: dueLabel },
      { onSuccess: () => { toast.show(`Call with ${lead.name} saved (sample data).`); onClose(); } },
    );
  }

  return (
    <Modal
      open
      title={`Log call · ${lead.name}`}
      subtitle={`${lead.phone} · ${lead.source} · ${lead.temperature}`}
      onClose={log.isPending ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" icon="x" onClick={onClose} disabled={log.isPending}>Cancel</Button>
          <Button type="submit" form="log-call-form" variant="cta" icon="check" loading={log.isPending}>Save call</Button>
        </>
      }
    >
      <form id="log-call-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        <div className="flex items-center gap-3 sm:hidden"><Avatar name={lead.name} size={40} /></div>
        {log.isError ? <Alert>{errorMessage(log.error)}</Alert> : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body font-medium text-text">What happened on the call?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {OUTCOMES.map((o) => {
              const on = o === outcome;
              return (
                <button key={o} type="button" aria-pressed={on} onClick={() => setOutcome(o)}
                  className={cn("flex h-[38px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-body font-medium", on ? "border-primary bg-primary-soft text-primary" : "border-border-strong bg-surface text-text-2")}>
                  {on ? <Icon name="check" size={14} /> : null}{o}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Move lead to stage">{({ id }) => (
            <Select id={id} value={stage} onChange={(e) => setStage(e.target.value as Stage)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</Select>
          )}</Field>
          <Field label="Temperature">{({ id }) => (
            <Select id={id} value={temperature} onChange={(e) => setTemperature(e.target.value as Temperature)}>{["Hot", "Warm", "Cold"].map((s) => <option key={s}>{s}</option>)}</Select>
          )}</Field>
        </div>

        <Field label="Notes">{({ id }) => (
          <textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="What did they say? What do they need next?"
            className="w-full resize-none rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-body text-text outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20" />
        )}</Field>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-body font-medium text-text">Next step</span>
            <span className="text-small text-muted">Required for every open lead</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Action">{({ id }) => <Select id={id} value={action} onChange={(e) => setAction(e.target.value)}>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</Select>}</Field>
            <Field label="Due" error={dueError}>{({ id, describedBy, invalid }) => (
              <TextInput id={id} type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} invalid={invalid} aria-describedby={describedBy} />
            )}</Field>
          </div>
        </div>
      </form>
    </Modal>
  );
}
