"use client";

import { m } from "motion/react";
import { useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Segmented } from "@/components/ui/segmented";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { cn } from "@/lib/cn";
import { fast } from "@/lib/motion";
import { stageLabel } from "./mapping";
import type { DuplicateMode, ImportOptions, ImportSettings } from "./types";

const DUPLICATE_TEXT: Record<DuplicateMode, string> = {
  SKIP: "A person who is already a lead is left exactly as they are. The row is recorded as a duplicate.",
  FILL_EMPTY: "A person who is already a lead keeps everything they have; only fields that are empty are filled from the file.",
};

export function SettingsStep({
  options, settings, onChange, fieldErrors, error, busy, onBack, onNext,
}: {
  options: ImportOptions;
  settings: ImportSettings;
  onChange: (next: ImportSettings) => void;
  fieldErrors: Record<string, string>;
  error: string | null;
  busy: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const groups = useMemo(() => {
    const byGroup = new Map<string, ImportOptions["sources"]>();
    for (const source of options.sources) byGroup.set(source.group, [...(byGroup.get(source.group) ?? []), source]);
    return [...byGroup];
  }, [options.sources]);

  const nameOk = settings.listName.trim().length >= 2;
  const ready = nameOk && settings.sourceId !== null;
  const set = <K extends keyof ImportSettings>(key: K, value: ImportSettings[K]) => onChange({ ...settings, [key]: value });

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2 font-semibold text-text">Name the list, then choose where these leads come from</h2>
        <p className="text-body text-text-2">Every lead in this file is added to the list, so the batch is easy to find and report on later.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="List name" error={fieldErrors.listName} hint={fieldErrors.listName ? undefined : "For example “Naukri October batch”"}>
          {({ id, describedBy, invalid }) => (
            <TextInput id={id} aria-describedby={describedBy} invalid={invalid} value={settings.listName} onChange={(e) => set("listName", e.target.value)} maxLength={120} placeholder="List name" />
          )}
        </Field>
        <Field label="Lead source" error={fieldErrors.sourceId}>
          {({ id, describedBy, invalid }) => (
            <Select id={id} aria-describedby={describedBy} invalid={invalid} value={settings.sourceId ?? ""} onChange={(e) => set("sourceId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Choose a source</option>
              {groups.map(([group, sources]) => (
                <optgroup key={group} label={group}>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Lead owner" error={fieldErrors.ownerId} hint={fieldErrors.ownerId ? undefined : "Leave empty to put the leads in the assignment queue."}>
          {({ id, describedBy, invalid }) => (
            <Select id={id} aria-describedby={describedBy} invalid={invalid} value={settings.ownerId ?? ""} onChange={(e) => set("ownerId", e.target.value || null)}>
              <option value="">No owner (assign later)</option>
              {options.owners.map((o) => <option key={o.id} value={o.id}>{o.name} · {ROLE_LABEL[o.role as Role] ?? o.role}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Description (optional)" error={fieldErrors.listDescription}>
          {({ id, describedBy, invalid }) => (
            <TextInput id={id} aria-describedby={describedBy} invalid={invalid} value={settings.listDescription} onChange={(e) => set("listDescription", e.target.value)} maxLength={500} placeholder="What is this batch?" />
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-body font-medium text-text">If the person is already a lead</span>
        <div>
          <Segmented<DuplicateMode>
            ariaLabel="Duplicate handling"
            value={settings.duplicateMode}
            onChange={(v) => set("duplicateMode", v)}
            options={[{ value: "SKIP", label: "Skip them" }, { value: "FILL_EMPTY", label: "Fill empty fields" }]}
          />
        </div>
        <m.p key={settings.duplicateMode} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: fast }} className="text-small text-text-2">{DUPLICATE_TEXT[settings.duplicateMode]}</m.p>
      </div>

      <Field label="Note (optional)" error={fieldErrors.note} hint="Kept with the import, for example where the file came from.">
        {({ id, describedBy, invalid }) => (
          <TextInput id={id} aria-describedby={describedBy} invalid={invalid} value={settings.note} onChange={(e) => set("note", e.target.value)} maxLength={500} />
        )}
      </Field>

      <div className="grid gap-3 rounded-xl border border-border bg-surface-alt p-4 sm:grid-cols-3">
        <Fact icon="target" title="Every lead starts at">
          <span className="flex flex-wrap items-center gap-1.5">
            <Chip>{stageLabel(options.startingStage.lifecycle)}</Chip>
            <Icon name="arrowR" size={12} className="text-muted" />
            <Chip>{stageLabel(options.startingStage.opportunity)}</Chip>
          </span>
        </Fact>
        <Fact icon="users" title="Duplicates are found by">
          Email and phone. A match on either one means the person is already a lead, so nobody is added twice.
        </Fact>
        <Fact icon="zap" title="Lead score">
          Starts at 0, or at the value in a Lead score column. The CRM adds points as the lead engages.
        </Fact>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="flex justify-between gap-2">
        <Button variant="secondary" onClick={onBack} disabled={busy}>Back</Button>
        <Button onClick={onNext} loading={busy} disabled={!ready}>Check rows</Button>
      </div>
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("rounded-md bg-primary-soft px-2 py-0.5 text-small font-medium text-primary", className)}>{children}</span>;
}

function Fact({ icon, title, children }: { icon: "target" | "users" | "zap"; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-small font-semibold text-text"><Icon name={icon} size={14} className="text-primary" />{title}</span>
      <div className="text-small text-text-2">{children}</div>
    </div>
  );
}
