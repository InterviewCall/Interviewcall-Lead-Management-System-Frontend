"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import {
  createOutcome, createReason, LIFECYCLE_LABEL, listOutcomes, listReasons, outcomeKeys, updateOutcome, updateReason,
  type OutcomeInput, type OutcomeLifecycle, type OutcomeRow, type ReasonRow,
} from "./api";

/** What logging an outcome does, in one line a manager can read. */
function effectText(o: OutcomeRow): string {
  const bits: string[] = [];
  if (o.connected === true) bits.push(o.conversation ? "Counts as a conversation" : "Picked up, no conversation");
  if (o.connected === false) bits.push("Not picked up");
  if (o.countsAsAttempt) bits.push("Counts as an attempt");
  if (o.lifecycle) bits.push(`Moves the lead to ${LIFECYCLE_LABEL[o.lifecycle]}`);
  if (o.lostReason) bits.push(`Closes the opportunity as lost (${o.lostReason})`);
  return bits.join(". ") || "No automatic change";
}

/**
 * The outcomes the call form offers and the reasons offered when a lead is marked lost. Managers and admins add,
 * rename and retire them without a deploy. Nothing is deleted: a retired one disappears from the forms, and the calls
 * already logged keep it.
 */
export function OutcomesScreen() {
  return (
    <>
      <PageHeader title="Call outcomes" subtitle="What a call can end with, and why a lead can be lost. Changes apply to the next call logged." />
      <div className="flex flex-col gap-5">
        <OutcomesCard />
        <ReasonsCard />
      </div>
    </>
  );
}

// ---- outcomes ----

function OutcomesCard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const outcomes = useQuery({ queryKey: outcomeKeys.outcomes, queryFn: listOutcomes });
  const reasons = useQuery({ queryKey: outcomeKeys.reasons, queryFn: listReasons });
  const [editing, setEditing] = useState<OutcomeRow | "new" | null>(null);
  const done = (rows: OutcomeRow[]) => {
    queryClient.setQueryData(outcomeKeys.outcomes, rows);
    void queryClient.invalidateQueries({ queryKey: ["engagement", "outcomes"] });
  };
  const toggle = useMutation({
    mutationFn: (o: OutcomeRow) => updateOutcome(o.id, { isActive: !o.isActive }),
    onSuccess: (rows, o) => {
      toast.show(o.isActive ? `${o.name} is retired` : `${o.name} is back on the call form`, "success");
      done(rows);
    },
    onError: (e) => toast.show(errorMessage(e), "error"),
  });
  const move = useMutation({
    // Swap places with the neighbour: two outcomes trade their positions.
    mutationFn: async ({ o, other }: { o: OutcomeRow; other: OutcomeRow }) => {
      await updateOutcome(o.id, { sortOrder: other.sortOrder });
      return updateOutcome(other.id, { sortOrder: o.sortOrder });
    },
    onSuccess: done,
    onError: (e) => toast.show(errorMessage(e), "error"),
  });
  const rows = outcomes.data ?? [];
  const active = rows.filter((r) => r.isActive);

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Outcomes" subtitle="Shown in this order on the log-a-call form" actions={<Button icon="plus" onClick={() => setEditing("new")}>Add outcome</Button>} />
      {outcomes.isError ? (
        <div className="p-5"><Alert>{errorMessage(outcomes.error)}</Alert></div>
      ) : outcomes.isPending ? (
        <div className="py-14"><Spinner className="mx-auto text-primary" /></div>
      ) : (
        <ul>
          {rows.map((o) => {
            const at = active.findIndex((a) => a.id === o.id);
            return (
              <li key={o.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-b-0", !o.isActive && "bg-surface-alt/60")}>
                <div className="min-w-0 flex-1 basis-72">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-body font-medium", o.isActive ? "text-text" : "text-muted")}>{o.name}</span>
                    {o.requiresFollowup ? <Badge tone="neutral">Next step required</Badge> : null}
                    {!o.isActive ? <Badge tone="neutral">Retired</Badge> : null}
                  </p>
                  <p className="text-small text-text-2">{effectText(o)}</p>
                </div>
                <span className="nums text-small text-muted">{o.used === 0 ? "Not used yet" : `${o.used.toLocaleString("en-IN")} ${o.used === 1 ? "call" : "calls"}`}</span>
                <span className="flex items-center gap-1">
                  {o.isActive ? (
                    <>
                      <Button variant="ghost" className="h-8 w-8 px-0" icon="up" aria-label={`Move ${o.name} up`} disabled={at <= 0 || move.isPending} onClick={() => move.mutate({ o, other: active[at - 1] })} />
                      <Button variant="ghost" className="h-8 w-8 px-0" icon="chev" aria-label={`Move ${o.name} down`} disabled={at < 0 || at >= active.length - 1 || move.isPending} onClick={() => move.mutate({ o, other: active[at + 1] })} />
                    </>
                  ) : null}
                  <Button variant="ghost" className="h-8" icon="edit" onClick={() => setEditing(o)} aria-label={`Edit ${o.name}`}>Edit</Button>
                  <Button variant="ghost" className="h-8" loading={toggle.isPending && toggle.variables?.id === o.id} onClick={() => toggle.mutate(o)}>{o.isActive ? "Retire" : "Bring back"}</Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {editing ? <OutcomeForm outcome={editing === "new" ? null : editing} reasons={(reasons.data ?? []).filter((r) => r.isActive)} onClose={() => setEditing(null)} onSaved={done} /> : null}
    </Card>
  );
}

function OutcomeForm({ outcome, reasons, onClose, onSaved }: { outcome: OutcomeRow | null; reasons: ReasonRow[]; onClose: () => void; onSaved: (rows: OutcomeRow[]) => void }) {
  const toast = useToast();
  const [name, setName] = useState(outcome?.name ?? "");
  const [pickup, setPickup] = useState<"yes" | "no" | "na">(outcome ? (outcome.connected === null ? "na" : outcome.connected ? "yes" : "no") : "no");
  const [conversation, setConversation] = useState(outcome?.conversation ?? false);
  const [attempt, setAttempt] = useState(outcome?.countsAsAttempt ?? true);
  const [lifecycle, setLifecycle] = useState<OutcomeLifecycle | "">(outcome?.lifecycle ?? "");
  const [lostReason, setLostReason] = useState(outcome?.lostReason ?? "");
  const [followup, setFollowup] = useState(outcome?.requiresFollowup ?? true);
  const [touched, setTouched] = useState(false);

  const save = useMutation({
    mutationFn: () => {
      const input: OutcomeInput = {
        name: name.trim(),
        requiresFollowup: followup && !lostReason,
        connected: pickup === "na" ? null : pickup === "yes",
        conversation: pickup === "yes" && conversation,
        countsAsAttempt: pickup === "no" && attempt,
        lifecycle: lifecycle || null,
        lostReason: lostReason || null,
      };
      return outcome ? updateOutcome(outcome.id, input) : createOutcome(input);
    },
    onSuccess: (rows) => {
      toast.show(outcome ? `${name.trim()} saved` : `${name.trim()} added`, "success");
      onSaved(rows);
      onClose();
    },
  });
  const server = save.isError ? toApiError(save.error).fields ?? {} : {};
  const nameError = touched && name.trim().length < 2 ? "Enter a name" : server.name;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (name.trim().length < 2) return;
    save.mutate();
  }

  return (
    <Modal
      open
      title={outcome ? `Edit ${outcome.name}` : "Add an outcome"}
      subtitle="Choose what logging it does to the lead"
      onClose={save.isPending ? () => undefined : onClose}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="outcome-form" variant="cta" icon="check" loading={save.isPending}>{outcome ? "Save" : "Add outcome"}</Button>
        </>
      }
    >
      <form id="outcome-form" onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
        {save.isError && !server.name && !server.lostReason && !server.lifecycle ? <Alert>{errorMessage(save.error)}</Alert> : null}
        <Field label="Name" error={nameError}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />
        )}</Field>
        <Field label="Did the person pick up?">{({ id, describedBy }) => (
          <Select id={id} value={pickup} onChange={(e) => setPickup(e.target.value as "yes" | "no" | "na")} aria-describedby={describedBy}>
            <option value="yes">Yes, they picked up</option>
            <option value="no">No, they did not</option>
            <option value="na">Not a call (a note, say)</option>
          </Select>
        )}</Field>
        {pickup === "yes" ? (
          <label className="flex items-start gap-2.5 text-body text-text">
            <input type="checkbox" checked={conversation} onChange={(e) => setConversation(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
            <span>A real conversation took place<span className="block text-small text-text-2">Moves a lead from Call 1 Pending to Call 1. Leave off for a quick pick-up and “call me later”.</span></span>
          </label>
        ) : null}
        {pickup === "no" ? (
          <label className="flex items-start gap-2.5 text-body text-text">
            <input type="checkbox" checked={attempt} onChange={(e) => setAttempt(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
            <span>Counts as an attempt<span className="block text-small text-text-2">After enough attempts in a row without a connection the lead becomes Exhausted.</span></span>
          </label>
        ) : null}
        <Field label="Contact stage after this call" hint="Leave blank to keep the lead's stage">{({ id, describedBy, invalid }) => (
          <Select id={id} value={lifecycle} invalid={invalid} onChange={(e) => setLifecycle(e.target.value as OutcomeLifecycle | "")} aria-describedby={describedBy}>
            <option value="">No change</option>
            {(Object.keys(LIFECYCLE_LABEL) as OutcomeLifecycle[]).map((l) => <option key={l} value={l}>{LIFECYCLE_LABEL[l]}</option>)}
          </Select>
        )}</Field>
        <Field label="Close the opportunity as lost?" hint="Pick the reason, or leave blank to keep it open" error={server.lostReason}>{({ id, describedBy, invalid }) => (
          <Select id={id} value={lostReason} invalid={invalid} onChange={(e) => setLostReason(e.target.value)} aria-describedby={describedBy}>
            <option value="">No, keep it open</option>
            {reasons.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
            {lostReason && !reasons.some((r) => r.name === lostReason) ? <option value={lostReason}>{lostReason}</option> : null}
          </Select>
        )}</Field>
        {!lostReason ? (
          <label className="flex items-start gap-2.5 text-body text-text">
            <input type="checkbox" checked={followup} onChange={(e) => setFollowup(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
            <span>Ask for a next step<span className="block text-small text-text-2">The call form will not save until a follow-up is set.</span></span>
          </label>
        ) : null}
      </form>
    </Modal>
  );
}

// ---- lost reasons ----

function ReasonsCard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const reasons = useQuery({ queryKey: outcomeKeys.reasons, queryFn: listReasons });
  const [editing, setEditing] = useState<ReasonRow | "new" | null>(null);
  const done = (rows: ReasonRow[]) => {
    queryClient.setQueryData(outcomeKeys.reasons, rows);
    void queryClient.invalidateQueries({ queryKey: ["pipeline", "lost-reasons"] });
  };
  const toggle = useMutation({
    mutationFn: (r: ReasonRow) => updateReason(r.id, { isActive: !r.isActive }),
    onSuccess: (rows, r) => {
      toast.show(r.isActive ? `${r.name} is retired` : `${r.name} is back in the list`, "success");
      done(rows);
    },
    onError: (e) => toast.show(errorMessage(e), "error"),
  });
  const rows = reasons.data ?? [];

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Lost reasons" subtitle="Offered when someone marks a lead lost" actions={<Button icon="plus" onClick={() => setEditing("new")}>Add reason</Button>} />
      {reasons.isError ? (
        <div className="p-5"><Alert>{errorMessage(reasons.error)}</Alert></div>
      ) : reasons.isPending ? (
        <div className="py-14"><Spinner className="mx-auto text-primary" /></div>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 last:border-b-0", !r.isActive && "bg-surface-alt/60")}>
              <span className={cn("min-w-0 flex-1 basis-48 text-body font-medium", r.isActive ? "text-text" : "text-muted")}>
                {r.name} {!r.isActive ? <Badge tone="neutral">Retired</Badge> : null}
              </span>
              <span className="nums text-small text-muted">{r.used === 0 ? "Not used yet" : `${r.used.toLocaleString("en-IN")} ${r.used === 1 ? "lead" : "leads"}`}</span>
              <span className="flex items-center gap-1">
                <Button variant="ghost" className="h-8" icon="edit" onClick={() => setEditing(r)} aria-label={`Rename ${r.name}`}>Rename</Button>
                <Button variant="ghost" className="h-8" loading={toggle.isPending && toggle.variables?.id === r.id} onClick={() => toggle.mutate(r)}>{r.isActive ? "Retire" : "Bring back"}</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {editing ? <ReasonForm reason={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={done} /> : null}
    </Card>
  );
}

function ReasonForm({ reason, onClose, onSaved }: { reason: ReasonRow | null; onClose: () => void; onSaved: (rows: ReasonRow[]) => void }) {
  const toast = useToast();
  const [name, setName] = useState(reason?.name ?? "");
  const [touched, setTouched] = useState(false);
  const save = useMutation({
    mutationFn: () => (reason ? updateReason(reason.id, { name: name.trim() }) : createReason(name.trim())),
    onSuccess: (rows) => {
      toast.show(reason ? "Reason renamed" : `${name.trim()} added`, "success");
      onSaved(rows);
      onClose();
    },
  });
  const tooShort = name.trim().length < 2;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (tooShort) return;
    if (reason && name.trim() === reason.name) return onClose();
    save.mutate();
  }

  return (
    <Modal
      open
      title={reason ? "Rename reason" : "Add a lost reason"}
      onClose={save.isPending ? () => undefined : onClose}
      width={420}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="reason-form" variant="cta" icon="check" loading={save.isPending}>{reason ? "Save" : "Add reason"}</Button>
        </>
      }
    >
      <form id="reason-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {save.isError ? <Alert>{errorMessage(save.error)}</Alert> : null}
        <Field label="Reason" error={touched && tooShort ? "Enter a name" : undefined}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />
        )}</Field>
      </form>
    </Modal>
  );
}
