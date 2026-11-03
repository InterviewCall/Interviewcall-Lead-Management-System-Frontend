"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/roles";
import { useInviteStaff, useUpdateStaff } from "./hooks";
import type { StaffMember } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RoleSelect({ id, value, onChange, disabled, describedBy }: { id: string; value: Role; onChange: (r: Role) => void; disabled?: boolean; describedBy?: string }) {
  return (
    <Select id={id} value={value} disabled={disabled} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value as Role)}>
      {ROLES.map((role) => (
        <option key={role} value={role}>{ROLE_LABEL[role]}</option>
      ))}
    </Select>
  );
}

export function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Remount on open so the form always starts empty.
  return open ? <InviteForm onClose={onClose} /> : null;
}

function InviteForm({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const invite = useInviteStaff();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("BDA");
  const [touched, setTouched] = useState(false);

  const nameError = touched && name.trim().length < 2 ? "Enter a name" : undefined;
  const emailError = touched && !EMAIL_PATTERN.test(email.trim()) ? "Enter a valid email" : undefined;

  const apiError = invite.error ? toApiError(invite.error) : null;
  const fieldErrors = apiError?.fields ?? {};
  const duplicate = apiError?.code === "EMAIL_ALREADY_EXISTS" ? "Someone with this email already has an account." : undefined;
  const formError = apiError && !apiError.fields && !duplicate ? errorMessage(apiError) : null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (name.trim().length < 2 || !EMAIL_PATTERN.test(email.trim())) return;
    invite.mutate(
      { name: name.trim(), email: email.trim(), role },
      {
        onSuccess: (staff) => {
          toast.show(`Invitation sent to ${staff.email}. They sign in with a one-time password from the email.`);
          onClose();
        },
      },
    );
  }

  return (
    <Modal
      open
      title="Invite user"
      subtitle="They get an email with a one-time password and choose their own on first sign-in."
      onClose={invite.isPending ? () => undefined : onClose}
      width={480}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={invite.isPending}>Cancel</Button>
          <Button type="submit" form="invite-form" loading={invite.isPending}>Send invitation</Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert>{formError}</Alert> : null}
        <Field label="Full name" error={nameError ?? fieldErrors.name}>
          {({ id, describedBy, invalid }) => (
            <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus autoComplete="off" />
          )}
        </Field>
        <Field label="Work email" error={emailError ?? fieldErrors.email ?? duplicate}>
          {({ id, describedBy, invalid }) => (
            <TextInput id={id} type="email" icon="mail" value={email} onChange={(e) => setEmail(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoComplete="off" />
          )}
        </Field>
        <Field label="Role" error={fieldErrors.role}>
          {({ id, describedBy }) => <RoleSelect id={id} value={role} onChange={setRole} describedBy={describedBy} />}
        </Field>
      </form>
    </Modal>
  );
}

export function EditStaffModal({ member, isSelf, onClose }: { member: StaffMember | null; isSelf: boolean; onClose: () => void }) {
  return member ? <EditForm key={member.id} member={member} isSelf={isSelf} onClose={onClose} /> : null;
}

function EditForm({ member, isSelf, onClose }: { member: StaffMember; isSelf: boolean; onClose: () => void }) {
  const toast = useToast();
  const update = useUpdateStaff();
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState<Role>(member.role);
  const [touched, setTouched] = useState(false);

  const nameError = touched && name.trim().length < 2 ? "Enter a name" : undefined;
  const apiError = update.error ? toApiError(update.error) : null;
  const fieldErrors = apiError?.fields ?? {};
  const formError = apiError && !apiError.fields ? errorMessage(apiError) : null;
  const changed = name.trim() !== member.name || role !== member.role;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (name.trim().length < 2 || !changed) return;
    update.mutate(
      {
        id: member.id,
        ...(name.trim() !== member.name ? { name: name.trim() } : {}),
        ...(role !== member.role ? { role } : {}),
      },
      {
        onSuccess: () => {
          toast.show(`Saved changes to ${name.trim()}.`);
          onClose();
        },
      },
    );
  }

  return (
    <Modal
      open
      title="Edit user"
      subtitle={member.email}
      onClose={update.isPending ? () => undefined : onClose}
      width={480}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={update.isPending}>Cancel</Button>
          <Button type="submit" form="edit-staff-form" loading={update.isPending} disabled={!changed}>Save changes</Button>
        </>
      }
    >
      <form id="edit-staff-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert>{formError}</Alert> : null}
        <Field label="Full name" error={nameError ?? fieldErrors.name}>
          {({ id, describedBy, invalid }) => (
            <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />
          )}
        </Field>
        <Field label="Role" error={fieldErrors.role} hint={isSelf ? "You cannot change your own role." : "Changing the role changes what they can see and do."}>
          {({ id, describedBy }) => <RoleSelect id={id} value={role} onChange={setRole} disabled={isSelf} describedBy={describedBy} />}
        </Field>
      </form>
    </Modal>
  );
}
