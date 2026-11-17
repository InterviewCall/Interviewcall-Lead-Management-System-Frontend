"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { DueField, dueToIso } from "./follow-up-fields";
import { useEngagementActions, useOutcomes } from "./hooks";
import { STAGE, STAGE_ORDER, TEMPERATURE } from "./lead-display";
import type { ActivityKind, LeadDetail, LogActivityInput, StageCode, TemperatureCode } from "./types";

const KINDS: Array<{ value: ActivityKind; label: string; icon: IconName }> = [
  { value: "CALL", label: "Call", icon: "phone" },
  { value: "WHATSAPP", label: "WhatsApp", icon: "msg" },
  { value: "EMAIL", label: "Email", icon: "mail" },
  { value: "NOTE", label: "Note", icon: "note" },
];
const ACTIONS = ["Call back", "Send WhatsApp", "Send test link", "Book call", "Review"];
/** Closing a lead as won has its own confirmation on the lead page. */
const MOVABLE = STAGE_ORDER.filter((s) => s !== "CLOSED_WON");

const PLACEHOLDER: Record<ActivityKind, string> = {
  CALL: "What did they say? What do they need next?",
  WHATSAPP: "What did you send, and what did they reply?",
  EMAIL: "What did you send?",
  NOTE: "Write the note",
};

export function LogCallModal({ detail, open, onClose }: { detail: LeadDetail; open: boolean; onClose: () => void }) {
  return open ? <LogForm detail={detail} onClose={onClose} /> : null;
}

function LogForm({ detail, onClose }: { detail: LeadDetail; onClose: () => void }) {
  const { lead, opportunity } = detail;
  const toast = useToast();
  const outcomes = useOutcomes();
  const { log } = useEngagementActions(lead.id);
  const [kind, setKind] = useState<ActivityKind>("CALL");
  const [outcomeId, setOutcomeId] = useState<number | null>(null);
  const open = opportunity?.status === "OPEN" ? opportunity : null;
  const [stage, setStage] = useState<StageCode | "">(open && open.stage !== "CLOSED_WON" ? open.stage : "");
  const [temperature, setTemperature] = useState<TemperatureCode | "">(lead.temperature ?? "");
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState(ACTIONS[0]!);
  const [due, setDue] = useState("");
  const [touched, setTouched] = useState(false);

  const outcome = kind === "CALL" ? outcomes.data?.find((o) => o.id === outcomeId) ?? null : null;
  const asksNextStep = !outcome?.ends;
  const needsNextStep = kind === "CALL" && Boolean(outcome?.requiresFollowup);
  const outcomeError = touched && kind === "CALL" && outcomeId === null ? "Choose what happened on the call" : undefined;
  const dueError = touched && needsNextStep && asksNextStep && due === "" ? "Choose when to follow up" : undefined;
  const notesError = touched && kind === "NOTE" && notes.trim() === "" ? "Write the note" : undefined;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (kind === "CALL" && outcomeId === null) return;
    if (kind === "NOTE" && notes.trim() === "") return;
    if (needsNextStep && asksNextStep && due === "") return;

    const input: LogActivityInput = { kind };
    if (kind === "CALL" && outcomeId !== null) input.outcomeId = outcomeId;
    if (notes.trim()) input.notes = notes.trim();
    if (open && stage && stage !== open.stage) input.stage = stage;
    if (temperature && temperature !== lead.temperature) input.temperature = temperature;
    const dueAt = dueToIso(due);
    if (asksNextStep && dueAt) input.nextStep = { title: action, dueAt };

    log.mutate(input, {
      onSuccess: () => {
        toast.show(kind === "CALL" ? `Call with ${lead.name} saved` : kind === "NOTE" ? "Note saved" : `${kind === "EMAIL" ? "Email" : "WhatsApp message"} logged`, "success");
        onClose();
      },
    });
  }

  return (
    <Modal
      open
      title={`Log activity · ${lead.name}`}
      subtitle={[lead.phone, lead.source].filter(Boolean).join(" · ")}
      onClose={log.isPending ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" icon="x" onClick={onClose} disabled={log.isPending}>Cancel</Button>
          <Button type="submit" form="log-call-form" variant="cta" icon="check" loading={log.isPending}>Save</Button>
        </>
      }
    >
      <form id="log-call-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        {log.isError ? <Alert>{errorMessage(log.error)}</Alert> : null}

        <div role="tablist" aria-label="What to log" className="grid grid-cols-4 gap-2">
          {KINDS.map((k) => {
            const on = k.value === kind;
            return (
              <button key={k.value} type="button" role="tab" aria-selected={on} onClick={() => { setKind(k.value); setOutcomeId(null); }}
                className={cn("flex h-[38px] items-center justify-center gap-1.5 rounded-lg border px-2 text-body font-medium", on ? "border-primary bg-primary-soft text-primary" : "border-border-strong bg-surface text-text-2")}>
                <Icon name={k.icon} size={14} />{k.label}
              </button>
            );
          })}
        </div>

        {kind === "CALL" ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-body font-medium text-text">What happened on the call?</legend>
            {outcomes.isPending ? <Spinner size={18} className="text-primary" /> : outcomes.isError ? <Alert>{errorMessage(outcomes.error)}</Alert> : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {outcomes.data.map((o) => {
                  const on = o.id === outcomeId;
                  return (
                    <button key={o.id} type="button" aria-pressed={on} onClick={() => setOutcomeId(o.id)}
                      className={cn("flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-center text-body font-medium", on ? "border-primary bg-primary-soft text-primary" : "border-border-strong bg-surface text-text-2")}>
                      {on ? <Icon name="check" size={14} /> : null}{o.name}
                    </button>
                  );
                })}
              </div>
            )}
            {outcomeError ? <p role="alert" className="text-small text-bad">{outcomeError}</p> : null}
            {outcome?.ends ? <p className="text-small text-text-2">This ends the sales follow-up, so no next step is needed.</p> : null}
            {outcome?.conversation && !outcome.ends && open?.stage === "CALL_1_PENDING" && stage === "CALL_1_PENDING" ? <p className="text-small text-text-2">You spoke to them, so this lead moves to Call 1.</p> : null}
            {outcome?.connected && !outcome.conversation && !outcome.ends ? <p className="text-small text-text-2">They picked up but you could not really talk. The stage stays where it is until you have the first real conversation.</p> : null}
            {outcome && !outcome.connected && !outcome.ends ? <p className="text-small text-text-2">They did not pick up. The stage stays where it is, and the attempt is counted.</p> : null}
          </fieldset>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {open ? (
            <Field label="Move lead to stage">{({ id }) => (
              <Select id={id} value={stage} onChange={(e) => setStage(e.target.value as StageCode)}>
                {MOVABLE.map((s) => <option key={s} value={s}>{STAGE[s].label}</option>)}
              </Select>
            )}</Field>
          ) : null}
          <Field label="Temperature">{({ id }) => (
            <Select id={id} value={temperature} onChange={(e) => setTemperature(e.target.value as TemperatureCode | "")}>
              {lead.temperature ? null : <option value="">Not rated</option>}
              {(Object.keys(TEMPERATURE) as TemperatureCode[]).map((t) => <option key={t} value={t}>{TEMPERATURE[t].label}</option>)}
            </Select>
          )}</Field>
        </div>

        <Field label={kind === "NOTE" ? "Note" : "Notes"} error={notesError}>{({ id, describedBy }) => (
          <textarea id={id} aria-describedby={describedBy} value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} placeholder={PLACEHOLDER[kind]}
            className="w-full resize-none rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-body text-text outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20" />
        )}</Field>

        {asksNextStep ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-body font-medium text-text">Next step</span>
              <span className="text-small text-muted">{needsNextStep ? "Required for this outcome" : "Optional"}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Action">{({ id }) => <Select id={id} value={action} onChange={(e) => setAction(e.target.value)}>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</Select>}</Field>
              <DueField value={due} onChange={setDue} error={dueError} />
            </div>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
