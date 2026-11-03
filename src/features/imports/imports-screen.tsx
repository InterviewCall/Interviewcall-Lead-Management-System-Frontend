"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { downloadText, toCsv } from "@/lib/download";
import { formatNumber, relativeTime } from "@/lib/format";
import { BDAS } from "@/mock/people";
import { existingLeads, importKeys, listImports, runImport, type ImportRecord } from "./api";
import { parseCsv } from "./csv";
import { dryRun } from "./dry-run";
import { autoMap, CRM_FIELDS, type Target } from "./mapping";
import { sampleCsv, templateCsv } from "./sample";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;
const STEPS = ["Upload", "Map columns", "Review", "Import"] as const;

interface Loaded {
  name: string;
  headers: string[];
  data: string[][];
}

export function ImportsScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const recent = useQuery({ queryKey: importKeys.recent, queryFn: listImports });
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<Loaded | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [sourceTag, setSourceTag] = useState("CSV import");
  const [assign, setAssign] = useState<"none" | "equal">("none");
  const [result, setResult] = useState<ImportRecord | null>(null);

  const run = useMutation({
    mutationFn: runImport,
    onSuccess: (record) => {
      setResult(record);
      setStep(3);
      for (const key of ["imports", "leads", "pipeline", "assignment", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (e) => toast.show(errorMessage(e), "error"),
  });

  const check = useMemo(() => (file && step >= 2 ? dryRun(file.data, targets, existingLeads()) : null), [file, targets, step]);

  function load(name: string, text: string): string | null {
    const rows = parseCsv(text);
    if (rows.length < 2) return "That file has no data rows.";
    if (rows.length - 1 > MAX_ROWS) return `That file has ${formatNumber(rows.length - 1)} rows. The limit is ${formatNumber(MAX_ROWS)} per import.`;
    const headers = rows[0]!.map((h) => h.trim());
    if (headers.every((h) => h === "")) return "The first row should be column names.";
    setFile({ name, headers, data: rows.slice(1) });
    setTargets(autoMap(headers));
    setStep(1);
    return null;
  }

  function reset() {
    setFile(null);
    setTargets([]);
    setResult(null);
    setSourceTag("CSV import");
    setAssign("none");
    setStep(0);
  }

  return (
    <>
      <PageHeader
        title="Imports"
        subtitle="Bring leads in from a CSV. Nothing is written until you review the dry run."
        actions={<Button variant="secondary" icon="download" onClick={() => downloadText("lead-import-template.csv", templateCsv())}>Download template</Button>}
      />

      <div className="flex flex-col items-start gap-4 lg:flex-row">
        <Card className="min-w-0 w-full flex-1">
          <Stepper step={step} />
          {step === 0 ? <UploadStep onLoad={load} /> : null}
          {step === 1 && file ? (
            <MapStep file={file} targets={targets} onChange={setTargets} onBack={reset} onNext={() => setStep(2)} />
          ) : null}
          {step === 2 && file && check ? (
            <ReviewStep
              file={file}
              check={check}
              sourceTag={sourceTag}
              onSourceTag={setSourceTag}
              assign={assign}
              onAssign={setAssign}
              busy={run.isPending}
              onBack={() => setStep(1)}
              onImport={() =>
                run.mutate({
                  file: file.name,
                  totalRows: file.data.length,
                  rows: check.rows,
                  sourceTag: sourceTag.trim() || "CSV import",
                  assignTo: assign === "equal" ? BDAS.filter((b) => !b.leaveUntil).map((b) => b.name) : [],
                })
              }
            />
          ) : null}
          {step === 3 && result ? <DoneStep result={result} onAgain={reset} /> : null}
        </Card>

        <Card className="w-full shrink-0 lg:w-[340px]">
          <CardHeader title="Recent imports" />
          {recent.isPending ? (
            <div className="py-10"><Spinner className="mx-auto text-primary" /></div>
          ) : recent.isError ? (
            <div className="p-4"><Alert>{errorMessage(recent.error)}</Alert></div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.data.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 px-5 py-3.5">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-body font-medium text-text">{r.file}</span>
                    <Badge tone={r.status === "Done" ? "success" : "danger"}>{r.status}</Badge>
                  </span>
                  <span className="text-small text-text-2">
                    {r.status === "Done" ? `${formatNumber(r.imported)} of ${formatNumber(r.rows)} rows imported` : r.note} · {relativeTime(r.when)}
                  </span>
                  {r.status === "Done" && r.note ? <span className="text-small text-muted">{r.note}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="text-small text-muted">Files are read in your browser. Imported leads are added to sample data until the imports API is connected.</p>
    </>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto border-b border-border px-5 py-4" aria-label="Import steps">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex shrink-0 items-center gap-2" aria-current={active ? "step" : undefined}>
            <span className={cn("flex size-6 items-center justify-center rounded-full text-small font-semibold", done ? "bg-ok text-white" : active ? "bg-primary text-white" : "bg-bg text-text-2")}>
              {done ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span className={cn("text-body font-medium", active ? "text-text" : "text-text-2")}>{label}</span>
            {i < STEPS.length - 1 ? <span className="mx-1 h-px w-6 bg-border-strong sm:w-10" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function UploadStep({ onLoad }: { onLoad: (name: string, text: string) => string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function take(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!/\.csv$/i.test(file.name)) return setError("Only .csv files are supported. In Excel, use Save As → CSV.");
    if (file.size > MAX_BYTES) return setError("That file is over 5 MB. Split it and import in parts.");
    const problem = onLoad(file.name, await file.text());
    if (problem) setError(problem);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    void take(event.dataTransfer.files[0]);
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn("flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center", over ? "border-primary bg-primary-soft" : "border-border-strong bg-surface-alt")}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name="upload" size={22} /></span>
        <div className="flex flex-col gap-1">
          <p className="text-h2 font-semibold text-text">Drop a CSV here</p>
          <p className="text-body text-text-2">The first row must be column names. Up to {formatNumber(MAX_ROWS)} rows and 5 MB.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => input.current?.click()}>Choose file</Button>
          <Button variant="secondary" onClick={() => { setError(null); const p = onLoad("sample-export.csv", sampleCsv()); if (p) setError(p); }}>Use sample file</Button>
        </div>
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Choose a CSV file" onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}

function MapStep({ file, targets, onChange, onBack, onNext }: { file: Loaded; targets: Target[]; onChange: (t: Target[]) => void; onBack: () => void; onNext: () => void }) {
  const mapped = (t: Target) => targets.includes(t);
  const duplicates = CRM_FIELDS.filter((f) => targets.filter((t) => t === f.key).length > 1).map((f) => f.label);
  const missing = !mapped("name") ? "Map a column to Full name to continue." : !mapped("email") && !mapped("phone") ? "Map a column to Email or Phone to continue." : null;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1 px-5 pt-5">
        <h2 className="text-h2 font-semibold text-text">Match your columns to CRM fields</h2>
        <p className="text-body text-text-2">{file.name} · {formatNumber(file.data.length)} rows · we guessed what we could.</p>
      </div>
      <div className="overflow-x-auto px-5 py-4">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="h-9 border-b border-border">
              {["Column in file", "Example", "Goes to"].map((h) => <th key={h} className="pr-3 text-cap font-semibold tracking-[0.5px] text-text-2 uppercase">{h}</th>)}
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {file.headers.map((h, c) => {
              const t = targets[c] ?? "custom";
              const example = file.data.find((r) => (r[c] ?? "").trim())?.[c] ?? "";
              return (
                <tr key={`${h}-${c}`} className="h-14 border-b border-border last:border-b-0">
                  <td className="pr-3 text-body font-medium text-text">{h || `Column ${c + 1}`}</td>
                  <td className="max-w-40 truncate pr-3 text-body text-text-2">{example}</td>
                  <td className="pr-3">
                    <Select aria-label={`Field for ${h}`} value={t} onChange={(e) => onChange(targets.map((x, i) => (i === c ? (e.target.value as Target) : x)))} className="h-9">
                      {CRM_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                      <option value="custom">New field: {h || `Column ${c + 1}`}</option>
                      <option value="skip">Do not import</option>
                    </Select>
                  </td>
                  <td>{t === "custom" ? <Badge tone="primary">New</Badge> : t === "skip" ? <Badge>Skipped</Badge> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 px-5 pb-5">
        {duplicates.length > 0 ? <Alert tone="warning">More than one column goes to {duplicates.join(", ")}. Only the first is used.</Alert> : null}
        {missing ? <Alert tone="info">{missing}</Alert> : null}
        <Alert tone="info" className="text-small">New fields are created on the lead as custom fields. Columns set to “Do not import” are ignored.</Alert>
        <div className="flex justify-between gap-2">
          <Button variant="secondary" onClick={onBack}>Choose another file</Button>
          <Button disabled={Boolean(missing)} onClick={onNext}>Review rows</Button>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  file, check, sourceTag, onSourceTag, assign, onAssign, busy, onBack, onImport,
}: {
  file: Loaded;
  check: NonNullable<ReturnType<typeof dryRun>>;
  sourceTag: string;
  onSourceTag: (v: string) => void;
  assign: "none" | "equal";
  onAssign: (v: "none" | "equal") => void;
  busy: boolean;
  onBack: () => void;
  onImport: () => void;
}) {
  const errors = check.rows.filter((r) => r.verdict.kind === "error");

  function downloadErrors() {
    const rows = [[...file.headers, "Row", "Problem"], ...errors.map((r) => [...file.headers.map((_, i) => r.cells[i] ?? ""), String(r.line + 1), r.verdict.kind === "error" ? r.verdict.reason : ""])];
    downloadText(`errors-${file.name}`, toCsv(rows));
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2 font-semibold text-text">Dry run</h2>
        <p className="text-body text-text-2">Nothing has been saved. This is what would happen to the {formatNumber(file.data.length)} rows in {file.name}.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Tile label="New" value={check.counts.new} className="text-ok" />
        <Tile label="Matched" value={check.counts.matched} className="text-info" hint="Already leads" />
        <Tile label="Errors" value={check.counts.error} className="text-bad" hint="Skipped" />
      </div>

      {errors.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-surface-alt px-4 py-2.5">
            <span className="flex-1 text-body font-medium text-text">Rows with problems</span>
            <button type="button" onClick={downloadErrors} className="flex items-center gap-1.5 text-small font-medium text-primary hover:underline">
              <Icon name="download" size={14} /> Download {errors.length} error {errors.length === 1 ? "row" : "rows"}
            </button>
          </div>
          <ul className="divide-y divide-border">
            {errors.slice(0, 6).map((r) => (
              <li key={r.line} className="flex items-center gap-3 px-4 py-2 text-body">
                <span className="w-14 shrink-0 text-small text-muted">Row {r.line + 1}</span>
                <span className="min-w-0 flex-1 truncate text-text">{r.cells[0] || "(blank)"}</span>
                <span className="text-small text-bad">{r.verdict.kind === "error" ? r.verdict.reason : ""}</span>
              </li>
            ))}
          </ul>
          {errors.length > 6 ? <p className="border-t border-border px-4 py-2 text-small text-text-2">and {errors.length - 6} more in the download.</p> : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-body font-medium text-text">Tag every row with source</span>
          <TextInput value={sourceTag} onChange={(e) => onSourceTag(e.target.value)} maxLength={60} aria-label="Source tag" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-body font-medium text-text">Assign after import</span>
          <Select value={assign} onChange={(e) => onAssign(e.target.value as "none" | "equal")} aria-label="Assign after import">
            <option value="none">Leave in the unassigned queue</option>
            <option value="equal">Distribute equally between BDAs on duty</option>
          </Select>
        </label>
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="secondary" onClick={onBack} disabled={busy}>Back</Button>
        <Button onClick={onImport} loading={busy} disabled={check.counts.new === 0}>Import {formatNumber(check.counts.new)} leads</Button>
      </div>
    </div>
  );
}

function Tile({ label, value, hint, className }: { label: string; value: number; hint?: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface-alt p-4">
      <span className="text-small text-text-2">{label}</span>
      <span className={cn("text-display font-bold", className)}>{formatNumber(value)}</span>
      {hint ? <span className="text-small text-muted">{hint}</span> : null}
    </div>
  );
}

function DoneStep({ result, onAgain }: { result: ImportRecord; onAgain: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-ok-soft text-ok"><Icon name="check" size={24} /></span>
      <h2 className="text-h1 font-semibold text-text">{formatNumber(result.imported)} leads imported</h2>
      <p className="text-body text-text-2">{result.file} · {result.note}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link href="/leads" className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-body font-medium text-white hover:bg-primary-hover">View leads</Link>
        <Button variant="secondary" onClick={onAgain}>Import another file</Button>
      </div>
    </div>
  );
}
