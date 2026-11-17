"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { createSource, GROUP_LABEL, type LeadSource, listSources, MANUAL_GROUPS, type ManualGroup, sourceKeys, updateSource } from "./api";

/**
 * Where leads come from. An admin adds sources for leads added by hand (Referral, Walk-in, an event) and switches
 * them off when they are no longer used. The CRM's own sources are shown but locked.
 */
export function SourcesScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const sources = useQuery({ queryKey: sourceKeys.all, queryFn: listSources });
  const [editing, setEditing] = useState<LeadSource | "new" | null>(null);
  const toggle = useMutation({
    mutationFn: (s: LeadSource) => updateSource(s.id, { isActive: !s.isActive }),
    onSuccess: (s) => {
      toast.show(s.isActive ? `${s.name} can be picked again` : `${s.name} is switched off. Its leads keep it.`, "success");
      void queryClient.invalidateQueries({ queryKey: sourceKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["leads", "filters"] });
    },
    onError: (e) => toast.show(errorMessage(e), "error"),
  });
  const rows = sources.data ?? [];

  return (
    <>
      <PageHeader
        title="Lead sources"
        subtitle="Where leads come from. They are offered when adding a lead, in imports and in filters."
        actions={<Button icon="plus" onClick={() => setEditing("new")}>Add source</Button>}
      />
      <Card className="overflow-hidden">
        <CardHeader title="Sources" subtitle="A source is never deleted: switch it off and its leads keep it" />
        {sources.isError ? (
          <div className="p-5"><Alert>{errorMessage(sources.error)}</Alert></div>
        ) : sources.isPending ? (
          <div className="py-14"><Spinner className="mx-auto text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="h-10 border-b border-border bg-surface-alt">
                  {["Source", "Kind", "Leads", "Status", ""].map((h) => (
                    <th key={h} className="px-4 text-small font-medium text-text-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className={cn("h-14 border-b border-border last:border-b-0", !s.isActive && "bg-surface-alt/60")}>
                    <td className="px-4">
                      <span className="flex items-center gap-2">
                        <span className={cn("text-body font-medium", s.isActive ? "text-text" : "text-muted")}>{s.name}</span>
                        {s.system ? (
                          <span title="Used by the CRM itself (signups, the VSL, imports): it cannot be renamed or switched off" className="inline-flex items-center gap-1 text-small text-muted">
                            <Icon name="lock" size={12} /> Built in
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 text-body text-text-2">{GROUP_LABEL[s.group]}</td>
                    <td className="px-4 text-body text-text">{formatNumber(s.leads)}</td>
                    <td className="px-4">{s.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Off</Badge>}</td>
                    <td className="px-4 text-right">
                      {s.system ? null : (
                        <span className="flex justify-end gap-1">
                          <Button variant="ghost" className="h-8" icon="edit" onClick={() => setEditing(s)} aria-label={`Rename ${s.name}`}>Edit</Button>
                          <Button variant="ghost" className="h-8" loading={toggle.isPending && toggle.variables?.id === s.id} onClick={() => toggle.mutate(s)}>
                            {s.isActive ? "Switch off" : "Switch on"}
                          </Button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <SourceModal source={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function SourceModal({ source, onClose }: { source: LeadSource | "new" | null; onClose: () => void }) {
  if (source === null) return null;
  return <SourceForm source={source === "new" ? null : source} onClose={onClose} />;
}

function SourceForm({ source, onClose }: { source: LeadSource | null; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(source?.name ?? "");
  const [group, setGroup] = useState<ManualGroup>((source && (MANUAL_GROUPS as readonly string[]).includes(source.group) ? source.group : "OTHER") as ManualGroup);
  const [touched, setTouched] = useState(false);
  const save = useMutation({
    mutationFn: () => (source ? updateSource(source.id, { name: name.trim(), group }) : createSource({ name: name.trim(), group })),
    onSuccess: (s) => {
      toast.show(source ? `${s.name} saved` : `${s.name} added`, "success");
      void queryClient.invalidateQueries({ queryKey: sourceKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["leads", "filters"] });
      onClose();
    },
  });
  const nameError = touched && name.trim().length < 2 ? "Enter a name" : save.isError ? toApiError(save.error).fields?.name : undefined;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (name.trim().length < 2) return;
    save.mutate();
  }

  return (
    <Modal
      open
      title={source ? `Edit ${source.name}` : "Add a source"}
      subtitle="For example Referral, Walk-in, Inbound call, a college event"
      onClose={save.isPending ? () => undefined : onClose}
      width={440}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="source-form" variant="cta" icon="check" loading={save.isPending}>{source ? "Save" : "Add source"}</Button>
        </>
      }
    >
      <form id="source-form" onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
        {save.isError && !toApiError(save.error).fields ? <Alert>{errorMessage(save.error)}</Alert> : null}
        <Field label="Name" error={nameError}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />
        )}</Field>
        <Field label="Kind" hint="Groups sources in Reports">{({ id, describedBy }) => (
          <Select id={id} value={group} onChange={(e) => setGroup(e.target.value as ManualGroup)} aria-describedby={describedBy}>
            {MANUAL_GROUPS.map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
          </Select>
        )}</Field>
      </form>
    </Modal>
  );
}
