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
import type { CustomFieldDef, CustomFieldType } from "@/features/leads/types";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { createField, FIELD_ROLES, fieldKeys, listFields, TYPE_LABEL, updateField } from "./api";

/**
 * The extra details the team keeps on every lead (preferred batch, target company, anything). An admin adds a field
 * once; it then shows on each lead for the roles chosen. A field is never deleted: switch it off and the values stay.
 */
export function CustomFieldsScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fields = useQuery({ queryKey: fieldKeys.all, queryFn: listFields });
  const [editing, setEditing] = useState<CustomFieldDef | "new" | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: fieldKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["leads", "real"] });
  };
  const toggle = useMutation({
    mutationFn: (f: CustomFieldDef) => updateField(f.key, { isActive: !f.active }),
    onSuccess: (f) => {
      toast.show(f.active ? `${f.label} is back on leads` : `${f.label} is switched off. Its values are kept.`, "success");
      refresh();
    },
    onError: (e) => toast.show(errorMessage(e), "error"),
  });
  const rows = fields.data ?? [];

  return (
    <>
      <PageHeader
        title="Custom fields"
        subtitle="Extra details on every lead. Imports can fill them too."
        actions={<Button icon="plus" onClick={() => setEditing("new")}>Add field</Button>}
      />
      <Card className="overflow-hidden">
        <CardHeader title="Fields" subtitle="They show on the lead page, under Profile, for the roles you choose" />
        {fields.isError ? (
          <div className="p-5"><Alert>{errorMessage(fields.error)}</Alert></div>
        ) : fields.isPending ? (
          <div className="py-14"><Spinner className="mx-auto text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <p className="text-body font-semibold text-text">No custom fields yet</p>
            <p className="max-w-[46ch] text-small text-text-2">Add one for anything the team wants to note on a lead, like a preferred batch or a target company.</p>
            <Button icon="plus" className="mt-2" onClick={() => setEditing("new")}>Add the first field</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="h-10 border-b border-border bg-surface-alt">
                  {["Field", "Type", "Who sees it", "Status", ""].map((h) => <th key={h} className="px-4 text-small font-medium text-text-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.key} className={cn("h-14 border-b border-border last:border-b-0", !f.active && "bg-surface-alt/60")}>
                    <td className="px-4">
                      <span className={cn("text-body font-medium", f.active ? "text-text" : "text-muted")}>{f.label}</span>
                      {f.required ? <span className="ml-2 text-small text-text-2">Required</span> : null}
                    </td>
                    <td className="px-4 text-body text-text-2">
                      {TYPE_LABEL[f.type]}
                      {f.options.length > 0 ? <span className="block max-w-[28ch] truncate text-small text-muted" title={f.options.join(", ")}>{f.options.join(", ")}</span> : null}
                    </td>
                    <td className="px-4 text-body text-text-2">{f.visibleRoles.length === FIELD_ROLES.length ? "Everyone" : FIELD_ROLES.filter((r) => f.visibleRoles.includes(r.value)).map((r) => r.label).join(", ")}</td>
                    <td className="px-4">{f.active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Off</Badge>}</td>
                    <td className="px-4 text-right">
                      <span className="flex justify-end gap-1">
                        <Button variant="ghost" className="h-8" icon="edit" onClick={() => setEditing(f)} aria-label={`Edit ${f.label}`}>Edit</Button>
                        <Button variant="ghost" className="h-8" loading={toggle.isPending && toggle.variables?.key === f.key} onClick={() => toggle.mutate(f)}>{f.active ? "Switch off" : "Switch on"}</Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing ? <FieldForm field={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} /> : null}
    </>
  );
}

function FieldForm({ field, onClose, onSaved }: { field: CustomFieldDef | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [label, setLabel] = useState(field?.label ?? "");
  const [type, setType] = useState<CustomFieldType>(field?.type ?? "TEXT");
  const [optionsText, setOptionsText] = useState((field?.options ?? []).join("\n"));
  const [required, setRequired] = useState(field?.required ?? false);
  const [roles, setRoles] = useState<string[]>(field?.visibleRoles ?? FIELD_ROLES.map((r) => r.value));
  const [touched, setTouched] = useState(false);
  const choices = type === "SELECT" || type === "MULTISELECT";
  const options = [...new Set(optionsText.split("\n").map((o) => o.trim()).filter(Boolean))];

  const save = useMutation({
    mutationFn: () =>
      field
        ? updateField(field.key, { label: label.trim(), isRequired: required, visibleRoles: roles, ...(choices ? { options } : {}) })
        : createField({ label: label.trim(), type, options: choices ? options : [], isRequired: required, visibleRoles: roles }),
    onSuccess: (f) => {
      toast.show(field ? `${f.label} saved` : `${f.label} added`, "success");
      onSaved();
      onClose();
    },
  });
  const server = save.isError ? toApiError(save.error).fields ?? {} : {};
  const labelError = touched && label.trim().length < 2 ? "Enter a name" : server.label;
  const optionsError = touched && choices && options.length < 2 ? "Add at least two options, one per line" : server.options;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (label.trim().length < 2 || (choices && options.length < 2) || roles.length === 0) return;
    save.mutate();
  }

  return (
    <Modal
      open
      title={field ? `Edit ${field.label}` : "Add a field"}
      subtitle="For example Preferred batch, Target company, Visit day"
      onClose={save.isPending ? () => undefined : onClose}
      width={480}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="field-form" variant="cta" icon="check" loading={save.isPending}>{field ? "Save" : "Add field"}</Button>
        </>
      }
    >
      <form id="field-form" onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
        {save.isError && Object.keys(server).length === 0 ? <Alert>{errorMessage(save.error)}</Alert> : null}
        <Field label="Name" error={labelError}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />
        )}</Field>
        <Field label="Type" hint={field ? "The type cannot change once the field exists" : undefined}>{({ id, describedBy }) => (
          <Select id={id} value={type} disabled={Boolean(field)} onChange={(e) => setType(e.target.value as CustomFieldType)} aria-describedby={describedBy}>
            {(Object.keys(TYPE_LABEL) as CustomFieldType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </Select>
        )}</Field>
        {choices ? (
          <Field label="Options" hint="One per line" error={optionsError}>{({ id, describedBy, invalid }) => (
            <textarea id={id} value={optionsText} rows={4} onChange={(e) => setOptionsText(e.target.value)} aria-invalid={invalid} aria-describedby={describedBy} className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-body text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          )}</Field>
        ) : null}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-small font-medium text-text">Who sees it</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {FIELD_ROLES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-body text-text">
                <input
                  type="checkbox"
                  checked={roles.includes(r.value)}
                  onChange={(e) => setRoles((cur) => (e.target.checked ? [...cur, r.value] : cur.filter((x) => x !== r.value)))}
                  className="size-4 accent-[var(--color-primary)]"
                />
                {r.label}
              </label>
            ))}
          </div>
          {touched && roles.length === 0 ? <p className="text-small text-bad">Choose at least one role</p> : null}
        </fieldset>
        <label className="flex items-start gap-2.5 text-body text-text">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
          <span>Required<span className="block text-small text-text-2">Once filled in, it cannot be cleared.</span></span>
        </label>
      </form>
    </Modal>
  );
}
