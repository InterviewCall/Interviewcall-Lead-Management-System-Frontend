"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ADD_LEAD_ROLES, IMPORT_ROLES } from "@/components/shell/nav";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage, toApiError } from "@/lib/api/errors";
import type { ExistingLead, LeadEdit, NewLeadInput } from "./api";
import { useAssignees, useCreateLead, useLeadFilters, useMarkLead } from "./hooks";
import type { LeadDetail } from "./types";

/** The fields both forms share, as typed. */
interface Draft {
  fullName: string;
  phone: string;
  email: string;
  currentCompany: string;
  currentCtc: string;
  graduationYear: string;
  domain: string;
}

const EMPTY: Draft = { fullName: "", phone: "", email: "", currentCompany: "", currentCtc: "", graduationYear: "", domain: "" };

/** The same checks the API makes, so most mistakes are caught before sending. */
function check(d: Draft): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (d.fullName.trim().length < 2) errors.fullName = "Enter the full name";
  const digits = d.phone.replace(/\D/g, "");
  if (d.phone.trim() !== "" && !/^(91|0)?[6-9]\d{9}$/.test(digits)) errors.phone = "Enter a 10-digit mobile number";
  if (d.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errors.email = "Enter a valid email address";
  if (d.phone.trim() === "" && d.email.trim() === "") errors.phone = "Enter a phone number or an email";
  if (d.graduationYear.trim() !== "" && !/^\d{4}$/.test(d.graduationYear.trim())) errors.graduationYear = "Enter a year like 2021";
  return errors;
}

const blankToNull = (v: string) => (v.trim() === "" ? null : v.trim());

function DetailFields({ draft, set, errors, autoFocus }: { draft: Draft; set: (patch: Partial<Draft>) => void; errors: Partial<Record<keyof Draft, string>>; autoFocus?: boolean }) {
  return (
    <>
      <Field label="Full name" error={errors.fullName}>{({ id, describedBy, invalid }) => (
        <TextInput id={id} value={draft.fullName} maxLength={150} onChange={(e) => set({ fullName: e.target.value })} invalid={invalid} aria-describedby={describedBy} autoComplete="off" autoFocus={autoFocus} />
      )}</Field>
      <div className="grid gap-[18px] sm:grid-cols-2">
        <Field label="Phone" error={errors.phone}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={draft.phone} inputMode="tel" maxLength={20} placeholder="98765 43210" onChange={(e) => set({ phone: e.target.value })} invalid={invalid} aria-describedby={describedBy} autoComplete="off" />
        )}</Field>
        <Field label="Email" error={errors.email}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={draft.email} type="email" maxLength={150} onChange={(e) => set({ email: e.target.value })} invalid={invalid} aria-describedby={describedBy} autoComplete="off" />
        )}</Field>
        <Field label="Current company" error={errors.currentCompany}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={draft.currentCompany} maxLength={255} onChange={(e) => set({ currentCompany: e.target.value })} invalid={invalid} aria-describedby={describedBy} />
        )}</Field>
        <Field label="CTC range" error={errors.currentCtc}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={draft.currentCtc} maxLength={100} placeholder="e.g. 6-8 LPA" onChange={(e) => set({ currentCtc: e.target.value })} invalid={invalid} aria-describedby={describedBy} />
        )}</Field>
        <Field label="Graduation year" error={errors.graduationYear}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={draft.graduationYear} inputMode="numeric" maxLength={4} placeholder="2021" onChange={(e) => set({ graduationYear: e.target.value })} invalid={invalid} aria-describedby={describedBy} />
        )}</Field>
        <Field label="Current domain" error={errors.domain}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={draft.domain} maxLength={255} placeholder="e.g. Backend, QA, Data" onChange={(e) => set({ domain: e.target.value })} invalid={invalid} aria-describedby={describedBy} />
        )}</Field>
      </div>
    </>
  );
}

/** "This person is already a lead": who owns them, and a link when you may open the lead. */
function ExistingNotice({ error, onOpen }: { error: unknown; onOpen: () => void }): ReactNode {
  const apiError = toApiError(error);
  const existing = apiError.code === "LEAD_EXISTS" ? (apiError.existing as ExistingLead | undefined) : undefined;
  if (!existing) return <Alert>{errorMessage(error)}</Alert>;
  return (
    <Alert tone="warning">
      <span className="flex flex-col gap-1">
        <span>{apiError.message}.</span>
        {existing.canOpen && existing.id ? (
          <Link href={`/leads/${existing.id}`} onClick={onOpen} className="font-medium underline underline-offset-2">Open {existing.name ?? "the lead"}</Link>
        ) : (
          <span className="text-small">You cannot open it. Ask {existing.owner ? existing.owner.name : "your sales manager"} or your manager if it should be yours.</span>
        )}
      </span>
    </Alert>
  );
}

/** Adding one person by hand: a referral, a walk-in, an inbound call. Opened from "New lead" (`/leads?new=1`). */
export function NewLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  if (!open || !user) return null;
  if (!ADD_LEAD_ROLES.includes(user.role)) {
    const canImport = IMPORT_ROLES.includes(user.role);
    return (
      <Modal open title="New lead" onClose={onClose} width={440} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
        <p className="text-body text-text-2">{canImport ? "Import a CSV to add leads." : "Adding leads is for BDAs, sales managers and admins. Ask one of them to add this person."}</p>
      </Modal>
    );
  }
  return <NewLeadForm onClose={onClose} chooseOwner={user.role !== "BDA"} />;
}

function NewLeadForm({ onClose, chooseOwner }: { onClose: () => void; chooseOwner: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateLead();
  const filters = useLeadFilters();
  const assignees = useAssignees(chooseOwner);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [touched, setTouched] = useState(false);
  const local = touched ? check(draft) : {};
  const server = create.isError ? toApiError(create.error).fields ?? {} : {};
  const errors = { ...server, ...local };
  const sources = filters.data?.sources ?? [];
  // Organic is the usual answer for a lead added by hand, so it is picked until someone chooses otherwise.
  const chosenSource = sourceId ?? sources.find((s) => s.name === "Organic")?.id ?? null;
  const sourceError = touched && chosenSource === null ? "Choose where the lead came from" : undefined;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(check(draft)).length > 0 || chosenSource === null) return;
    const input: NewLeadInput = {
      fullName: draft.fullName.trim(),
      phone: blankToNull(draft.phone),
      email: blankToNull(draft.email),
      sourceId: chosenSource,
      ownerId: chooseOwner && ownerId ? ownerId : null,
      currentCompany: blankToNull(draft.currentCompany),
      currentCtc: blankToNull(draft.currentCtc),
      graduationYear: blankToNull(draft.graduationYear),
      domain: blankToNull(draft.domain),
    };
    create.mutate(input, {
      onSuccess: ({ id }) => {
        toast.show(`${input.fullName} added`, "success");
        onClose();
        router.push(`/leads/${id}`);
      },
    });
  }

  return (
    <Modal
      open
      title="New lead"
      subtitle={chooseOwner ? "A referral, walk-in or inbound call. It starts at Call 1 Pending." : "A referral, walk-in or inbound call. It will be yours, at Call 1 Pending."}
      onClose={create.isPending ? () => undefined : onClose}
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button type="submit" form="new-lead-form" variant="cta" icon="plus" loading={create.isPending}>Add lead</Button>
        </>
      }
    >
      <form id="new-lead-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        {create.isError && (Object.keys(server).length === 0 || toApiError(create.error).code === "LEAD_EXISTS") ? <ExistingNotice error={create.error} onOpen={onClose} /> : null}
        <DetailFields draft={draft} set={(patch) => setDraft((d) => ({ ...d, ...patch }))} errors={errors} autoFocus />
        <div className="grid gap-[18px] sm:grid-cols-2">
          <Field label="Source" error={sourceError ?? server.sourceId}>{({ id, describedBy, invalid }) => (
            <Select id={id} value={chosenSource ?? ""} onChange={(e) => setSourceId(e.target.value ? Number(e.target.value) : null)} invalid={invalid} aria-describedby={describedBy}>
              <option value="">Choose a source</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}</Field>
          {chooseOwner ? (
            <Field label="Owner" hint={ownerId ? undefined : "Unassigned leads wait in the Assignment queue"} error={server.ownerId}>{({ id, describedBy, invalid }) => (
              <Select id={id} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} invalid={invalid} aria-describedby={describedBy}>
                <option value="">Leave unassigned</option>
                {(assignees.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            )}</Field>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}

/** Correcting or completing what is known about a lead. Only changed fields are sent. */
export function EditLeadModal({ lead, open, onClose }: { lead: LeadDetail["lead"]; open: boolean; onClose: () => void }) {
  return open ? <EditLeadForm lead={lead} onClose={onClose} /> : null;
}

function EditLeadForm({ lead, onClose }: { lead: LeadDetail["lead"]; onClose: () => void }) {
  const toast = useToast();
  const { edit } = useMarkLead(lead.id);
  const start: Draft = {
    fullName: lead.name,
    phone: lead.phone ? lead.phone.replace(/^\+91/, "") : "",
    email: lead.email ?? "",
    currentCompany: lead.company ?? "",
    currentCtc: lead.ctc ?? "",
    graduationYear: lead.graduationYear ?? "",
    domain: lead.domain ?? "",
  };
  const [draft, setDraft] = useState<Draft>(start);
  const [touched, setTouched] = useState(false);
  const local = touched ? check(draft) : {};
  const server = edit.isError ? toApiError(edit.error).fields ?? {} : {};
  const errors = { ...server, ...local };

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(check(draft)).length > 0) return;
    const changes: LeadEdit = {};
    (Object.keys(draft) as Array<keyof Draft>).forEach((key) => {
      if (draft[key].trim() === start[key].trim()) return;
      if (key === "fullName") changes.fullName = draft.fullName.trim();
      else changes[key] = blankToNull(draft[key]);
    });
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    edit.mutate(changes, {
      onSuccess: () => {
        toast.show("Details saved", "success");
        onClose();
      },
    });
  }

  return (
    <Modal
      open
      title="Edit details"
      subtitle="Imports and signups never overwrite what you change here"
      onClose={edit.isPending ? () => undefined : onClose}
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={edit.isPending}>Cancel</Button>
          <Button type="submit" form="edit-lead-form" variant="cta" icon="check" loading={edit.isPending}>Save</Button>
        </>
      }
    >
      <form id="edit-lead-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        {edit.isError && (Object.keys(server).length === 0 || toApiError(edit.error).code === "LEAD_EXISTS") ? <ExistingNotice error={edit.error} onOpen={onClose} /> : null}
        <DetailFields draft={draft} set={(patch) => setDraft((d) => ({ ...d, ...patch }))} errors={errors} autoFocus />
      </form>
    </Modal>
  );
}
