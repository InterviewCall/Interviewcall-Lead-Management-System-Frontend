"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { fast } from "@/lib/motion";
import type { Role } from "@/lib/roles";
import { bulkAddFollowUp, bulkContactStage } from "./api";
import { DueField, dueToIso } from "./follow-up-fields";
import { LIFECYCLE } from "./lead-display";
import { canMark, canOnboard, CONTACT_STAGES } from "./marking";
import type { BulkResult, LifecycleCode } from "./types";

const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/** Ideas for the follow-up, so the common ones are one tap. */
const TASK_IDEAS = ["Call back", "Send the fee structure", "Share the batch schedule", "Check the test result"];

function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ["leads", "pipeline", "assignment", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
  };
}

/** What a bulk change did, for the toast when nothing was skipped. */
function headline(result: BulkResult, did: string): string {
  const parts = [`${plural(result.done, "lead")} ${did}`];
  if (result.unchanged > 0) parts.push(`${formatNumber(result.unchanged)} already there`);
  return `${parts.join(", ")}.`;
}

/** Shown in the modal when some leads were left alone: what happened, and why the rest did not change. */
function Outcome({ result, did }: { result: BulkResult; did: string }) {
  return (
    <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: fast }} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl bg-ok-soft px-4 py-3 text-ok">
        <Icon name="check" size={18} />
        <span className="text-body font-medium">{headline(result, did)}</span>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-body font-medium text-text">{plural(result.skipped.reduce((n, s) => n + s.count, 0), "lead")} left as they were</p>
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {result.skipped.map((s) => (
            <li key={s.reason} className="flex items-start gap-3 px-4 py-3">
              <span className="nums mt-px min-w-6 rounded-full bg-warn-soft px-1.5 text-center text-small font-semibold text-warn">{s.count}</span>
              <span className="text-body text-text-2">{s.reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </m.div>
  );
}

/** Moves the selected leads to one contact stage, with the same rules as on a lead's page. */
export function BulkStageModal({ leadIds, role, onClose, onDone }: { leadIds: string[]; role: Role; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const refresh = useRefresh();
  const options = CONTACT_STAGES.filter((s) => s.code !== "ENROLLED" && (s.code === "LEARNER_ONBOARDED" ? canOnboard(role) : canMark(role)));
  const [stage, setStage] = useState<LifecycleCode | "">("");
  const [result, setResult] = useState<BulkResult | null>(null);
  const run = useMutation({
    mutationFn: (to: LifecycleCode) => bulkContactStage(leadIds, to),
    onSuccess: (r, to) => {
      refresh();
      if (r.skipped.length === 0) {
        toast.show(headline(r, `moved to ${LIFECYCLE[to].label}`), "success");
        onDone();
      } else setResult(r);
    },
  });
  const label = stage ? LIFECYCLE[stage].label : "";

  return (
    <Modal
      open
      title={result ? "Contact stage changed" : "Change contact stage"}
      subtitle={result ? undefined : `For ${plural(leadIds.length, "selected lead")}. Each lead's timeline records the change.`}
      onClose={run.isPending ? () => undefined : result ? onDone : onClose}
      width={520}
      footer={
        result ? (
          <Button onClick={onDone}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={run.isPending}>Cancel</Button>
            <Button variant="cta" icon="check" disabled={!stage} loading={run.isPending} onClick={() => stage && run.mutate(stage)}>
              {stage ? `Move to ${label}` : "Choose a stage"}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <Outcome result={result} did={`moved to ${label}`} />
      ) : (
        <div className="flex flex-col gap-3">
          {run.isError ? <Alert>{errorMessage(run.error)}</Alert> : null}
          <div role="radiogroup" aria-label="Contact stage" className="flex flex-col gap-1.5">
            {options.map((o) => {
              const on = stage === o.code;
              return (
                <button
                  key={o.code}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setStage(o.code)}
                  className={cn(
                    "relative flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    on ? "border-primary/50 bg-primary-soft/60" : "border-border hover:border-border-strong hover:bg-surface-alt",
                  )}
                >
                  <span className={cn("mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors", on ? "border-primary" : "border-border-strong")}>
                    <AnimatePresence>{on ? <m.span key="dot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="size-2 rounded-full bg-primary" /> : null}</AnimatePresence>
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-body font-semibold text-text">{LIFECYCLE[o.code].label}</span>
                    <span className="text-small text-text-2">{o.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-small text-muted">Leads the rules do not allow, such as onboarding a lead that is not enrolled, are left as they are and listed after.</p>
        </div>
      )}
    </Modal>
  );
}

/** Adds the same follow-up to every selected lead. Each one goes to that lead's owner. */
export function BulkTaskModal({ leadIds, onClose, onDone }: { leadIds: string[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const refresh = useRefresh();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const titleError = touched && title.trim() === "" ? "Say what to do" : undefined;
  const dueError = touched && due === "" ? "Choose when" : undefined;
  const run = useMutation({
    mutationFn: (input: { title: string; dueAt: string }) => bulkAddFollowUp(leadIds, input),
    onSuccess: (r) => {
      refresh();
      if (r.skipped.length === 0) {
        toast.show(`Follow-up added to ${plural(r.done, "lead")}.`, "success");
        onDone();
      } else setResult(r);
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    const dueAt = dueToIso(due);
    if (title.trim() === "" || !dueAt) return;
    run.mutate({ title: title.trim(), dueAt });
  }

  return (
    <Modal
      open
      title={result ? "Follow-ups added" : "Add a follow-up"}
      subtitle={result ? undefined : `To ${plural(leadIds.length, "selected lead")}. Each one goes to that lead's owner, or to you if it has none.`}
      onClose={run.isPending ? () => undefined : result ? onDone : onClose}
      width={520}
      footer={
        result ? (
          <Button onClick={onDone}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={run.isPending}>Cancel</Button>
            <Button type="submit" form="bulk-task-form" variant="cta" icon="check" loading={run.isPending}>
              Add to {plural(leadIds.length, "lead")}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <Outcome result={result} did="got the follow-up" />
      ) : (
        <form id="bulk-task-form" onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
          {run.isError ? <Alert>{errorMessage(run.error)}</Alert> : null}
          <div className="flex flex-col gap-2">
            <Field label="What to do" error={titleError}>{({ id, describedBy, invalid }) => (
              <TextInput id={id} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} placeholder="For example: send the fee structure" invalid={invalid} aria-describedby={describedBy} autoFocus />
            )}</Field>
            <div className="flex flex-wrap gap-1.5">
              {TASK_IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setTitle(idea)}
                  className={cn("h-7 rounded-full px-3 text-small font-medium ring-1 transition", title === idea ? "bg-primary-soft text-primary ring-primary/30" : "bg-surface text-text-2 ring-border hover:text-text")}
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
          <DueField value={due} onChange={setDue} error={dueError} />
        </form>
      )}
    </Modal>
  );
}
