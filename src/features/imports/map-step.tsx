"use client";

import { AnimatePresence, m } from "motion/react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, TextInput } from "@/components/ui/field";
import { formatNumber } from "@/lib/format";
import { fast, STAGGER } from "@/lib/motion";
import { mappingProblems } from "./mapping";
import type { ColumnMapping, ImportJob, ImportOptions } from "./types";

export function MapStep({
  job, sample, options, mapping, onChange, onBack, onNext, busy,
}: {
  job: ImportJob;
  sample: string[][];
  options: ImportOptions;
  mapping: ColumnMapping[];
  onChange: (next: ColumnMapping[]) => void;
  onBack: () => void;
  onNext: () => void;
  busy: boolean;
}) {
  const problems = mappingProblems(mapping, options.fields);
  const mappedCount = mapping.filter((c) => c.target !== "skip").length;

  function setColumn(index: number, patch: Partial<ColumnMapping>) {
    onChange(mapping.map((c) => (c.index === index ? { ...c, ...patch } : c)));
  }

  function choose(index: number, header: string, target: string) {
    if (target === "custom") setColumn(index, { target, label: header.trim() || `Column ${index + 1}` });
    else setColumn(index, { target, label: undefined });
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1 px-5 pt-5">
        <h2 className="text-h2 font-semibold text-text">Match your columns to CRM fields</h2>
        <p className="text-body text-text-2">
          {job.fileName} · {formatNumber(job.counts.total)} rows · {mappedCount} of {job.headers.length} columns will be imported. We guessed what we could.
        </p>
      </div>

      <ul className="flex flex-col px-5 py-3">
        {job.headers.map((header, index) => {
          const column = mapping.find((c) => c.index === index) ?? { index, target: "skip" };
          const example = sample.map((r) => (r[index] ?? "").trim()).find(Boolean) ?? "";
          const field = options.fields.find((f) => f.key === column.target);
          return (
            <m.li
              key={`${header}-${index}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { ...fast, delay: Math.min(index, 10) * STAGGER } }}
              className="grid gap-x-4 gap-y-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:grid-cols-[minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] md:items-start"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-body font-medium text-text">{header || `Column ${index + 1}`}</span>
                <span className="text-small text-muted">Column {index + 1}</span>
              </div>
              <div className="min-w-0 sm:order-last sm:col-span-2 md:order-none md:col-span-1">
                <span className="block truncate text-body text-text-2" title={example}>{example || <span className="text-muted">No example</span>}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Select aria-label={`Field for ${header || `column ${index + 1}`}`} value={column.target} onChange={(e) => choose(index, header, e.target.value)} className="h-9">
                  <option value="skip">Do not import</option>
                  <optgroup label="Lead fields">
                    {options.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </optgroup>
                  <option value="custom">New field…</option>
                </Select>
                <AnimatePresence initial={false}>
                  {column.target === "custom" ? (
                    <m.div key="custom" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto", transition: fast }} exit={{ opacity: 0, height: 0, transition: { duration: 0.1 } }} className="overflow-hidden">
                      <TextInput aria-label={`Name of the new field for ${header}`} value={column.label ?? ""} onChange={(e) => setColumn(index, { label: e.target.value })} maxLength={60} placeholder="Field name" className="h-9" />
                    </m.div>
                  ) : field ? (
                    <m.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: fast }} className="text-small text-text-2">{field.description}</m.p>
                  ) : null}
                </AnimatePresence>
              </div>
            </m.li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 px-5 pb-5">
        <AnimatePresence initial={false} mode="popLayout">
          {problems.length > 0 ? (
            <m.div key="problems" layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: fast }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
              <Alert tone="warning">
                <ul className="flex flex-col gap-0.5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
              </Alert>
            </m.div>
          ) : null}
        </AnimatePresence>
        <Alert tone="info" className="text-small">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            Columns set to <Badge>Do not import</Badge> are left out. A <Badge tone="primary">New field</Badge> is added to every lead as a custom field.
          </span>
        </Alert>
        <div className="flex justify-between gap-2">
          <Button variant="secondary" onClick={onBack} disabled={busy}>Choose another file</Button>
          <Button disabled={problems.length > 0} loading={busy} onClick={onNext}>Next: list and owner</Button>
        </div>
      </div>
    </div>
  );
}
