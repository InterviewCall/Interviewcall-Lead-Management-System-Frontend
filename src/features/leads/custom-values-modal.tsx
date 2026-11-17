"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { leadKeys, setCustomValues } from "./api";
import type { CustomFormField, CustomValue, LeadDetail } from "./types";

/** How a stored value shows on the page. */
export function showValue(value: CustomValue, type?: string): string | null {
  if (value === null || value === "") return null;
  if (type === "DATE" && typeof value === "string") return formatDate(`${value}T12:00:00Z`);
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

type Draft = string | boolean | string[];
const toDraft = (f: CustomFormField): Draft => (f.type === "MULTISELECT" ? (Array.isArray(f.value) ? f.value : []) : f.type === "BOOLEAN" ? (typeof f.value === "boolean" ? String(f.value) : "") : f.value === null ? "" : String(f.value));

/** Edit the custom fields on one lead. Only what changed is sent. */
export function CustomValuesModal({ lead, open, onClose }: { lead: LeadDetail["lead"]; open: boolean; onClose: () => void }) {
  return open ? <CustomValuesForm lead={lead} onClose={onClose} /> : null;
}

function CustomValuesForm({ lead, onClose }: { lead: LeadDetail["lead"]; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fields = lead.customForm;
  const [draft, setDraft] = useState<Record<string, Draft>>(() => Object.fromEntries(fields.map((f) => [f.key, toDraft(f)])));
  const [touched, setTouched] = useState(false);
  const set = (key: string, value: Draft) => setDraft((d) => ({ ...d, [key]: value }));

  const save = useMutation({
    mutationFn: (values: Record<string, CustomValue>) => setCustomValues(lead.id, values),
    onSuccess: (detail) => {
      queryClient.setQueryData(leadKeys.real(lead.id), detail);
      toast.show("Details saved", "success");
      onClose();
    },
  });
  const server = save.isError ? toApiError(save.error).fields ?? {} : {};

  const valueOf = (f: CustomFormField): CustomValue => {
    const d = draft[f.key];
    if (f.type === "MULTISELECT") return (d as string[]).length ? (d as string[]) : null;
    if (f.type === "BOOLEAN") return d === "true" ? true : d === "false" ? false : null;
    return typeof d === "string" && d.trim() !== "" ? d.trim() : null;
  };
  const unchanged = (f: CustomFormField) => {
    const now = valueOf(f);
    const was = f.value === "" ? null : f.value;
    if (now === null || was === null) return now === was;
    return f.type === "NUMBER" ? Number(now) === Number(was) : JSON.stringify(now) === JSON.stringify(was);
  };
  const changed = fields.filter((f) => !unchanged(f));
  const missing = (f: CustomFormField) => f.required && valueOf(f) === null;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (fields.some(missing)) return;
    if (changed.length === 0) {
      onClose();
      return;
    }
    save.mutate(Object.fromEntries(changed.map((f) => [f.key, valueOf(f)])));
  }

  return (
    <Modal
      open
      title="More details"
      subtitle={lead.name}
      onClose={save.isPending ? () => undefined : onClose}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="custom-values-form" variant="cta" icon="check" loading={save.isPending}>Save</Button>
        </>
      }
    >
      <form id="custom-values-form" onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
        {save.isError && Object.keys(server).length === 0 ? <Alert>{errorMessage(save.error)}</Alert> : null}
        {fields.map((f) => {
          const error = touched && missing(f) ? `${f.label} is required` : server[f.key];
          return (
            <Field key={f.key} label={f.required ? `${f.label} (required)` : f.label} error={error}>{({ id, describedBy, invalid }) => {
              const d = draft[f.key];
              if (f.type === "SELECT") {
                return (
                  <Select id={id} value={d as string} onChange={(e) => set(f.key, e.target.value)} invalid={invalid} aria-describedby={describedBy}>
                    <option value="">Not set</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                );
              }
              if (f.type === "BOOLEAN") {
                return (
                  <Select id={id} value={d as string} onChange={(e) => set(f.key, e.target.value)} invalid={invalid} aria-describedby={describedBy}>
                    <option value="">Not set</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                );
              }
              if (f.type === "MULTISELECT") {
                return (
                  <div id={id} className="flex flex-wrap gap-x-4 gap-y-1.5 py-1" aria-describedby={describedBy}>
                    {f.options.map((o) => (
                      <label key={o} className="flex items-center gap-2 text-body text-text">
                        <input type="checkbox" checked={(d as string[]).includes(o)} onChange={(e) => set(f.key, e.target.checked ? [...(d as string[]), o] : (d as string[]).filter((x) => x !== o))} className="size-4 accent-[var(--color-primary)]" />
                        {o}
                      </label>
                    ))}
                  </div>
                );
              }
              return (
                <TextInput
                  id={id}
                  type={f.type === "DATE" ? "date" : "text"}
                  inputMode={f.type === "NUMBER" ? "decimal" : undefined}
                  maxLength={500}
                  value={d as string}
                  onChange={(e) => set(f.key, e.target.value)}
                  invalid={invalid}
                  aria-describedby={describedBy}
                />
              );
            }}</Field>
          );
        })}
      </form>
    </Modal>
  );
}
