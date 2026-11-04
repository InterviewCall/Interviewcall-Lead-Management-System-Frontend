"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { downloadText } from "@/lib/download";
import { fast } from "@/lib/motion";
import { cancelImport, fetchRows, importKeys } from "./api";
import { HistoryPanel } from "./history-panel";
import { useCancel, useConfigure, useDryRun, useImportOptions, useStart } from "./hooks";
import { MapStep } from "./map-step";
import { ProgressStep } from "./progress-step";
import { ReviewStep } from "./review-step";
import { SettingsStep } from "./settings-step";
import { templateCsv } from "./sample";
import { Stepper } from "./stepper";
import type { ColumnMapping, DryRunResult, ImportJob, ImportSettings, UploadResult } from "./types";
import { UploadStep } from "./upload-step";

const EMPTY_SETTINGS: ImportSettings = { listName: "", listDescription: "", sourceId: null, ownerId: null, duplicateMode: "SKIP", note: "" };

export function ImportsScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const options = useImportOptions();

  const [step, setStep] = useState(0);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [sample, setSample] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [settings, setSettings] = useState<ImportSettings>(EMPTY_SETTINGS);
  const [dry, setDry] = useState<DryRunResult | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const jobId = job?.id ?? "";
  const configure = useConfigure(jobId);
  const dryRun = useDryRun(jobId);
  const start = useStart(jobId);
  const discard = useCancel(jobId);

  function refreshHistory() {
    void queryClient.invalidateQueries({ queryKey: ["imports", "history"] });
  }

  function reset() {
    setStep(0);
    setJob(null);
    setSample([]);
    setMapping([]);
    setSettings(EMPTY_SETTINGS);
    setDry(null);
    setActiveId(null);
    setFieldErrors({});
    setStepError(null);
  }

  function uploaded(result: UploadResult) {
    setJob(result.import);
    setSample(result.preview.sample);
    setMapping(result.preview.suggestedMapping);
    setSettings({ ...EMPTY_SETTINGS, listName: result.import.fileName.replace(/\.csv$/i, "").replace(/[_-]+/g, " ").trim() });
    setDry(null);
    setStep(1);
    refreshHistory();
  }

  /** Throws the unfinished import away, then starts again from the first step. */
  function chooseAnother() {
    if (job && (job.status === "UPLOADED" || job.status === "MAPPED")) discard.mutate(undefined, { onSettled: refreshHistory });
    reset();
  }

  async function checkRows() {
    if (!job || settings.sourceId === null) return;
    setStepError(null);
    setFieldErrors({});
    try {
      const saved = await configure.mutateAsync({ mapping, settings: { ...settings, sourceId: settings.sourceId } });
      setJob(saved);
      setDry(await dryRun.mutateAsync());
      setStep(3);
    } catch (e) {
      const err = toApiError(e);
      setFieldErrors(err.fields ?? {});
      setStepError(err.fields && Object.keys(err.fields).length > 0 && err.code !== "VALIDATION_FAILED" ? null : err.message);
      if (err.fields?.mapping) setStep(1);
    }
  }

  async function startImport() {
    if (!job) return;
    setStepError(null);
    try {
      const started = await start.mutateAsync();
      setActiveId(started.id);
      setStep(4);
    } catch (e) {
      setStepError(errorMessage(e));
    }
  }

  /** Opens an import from the history: finished ones show their results, a reviewed one picks up where it was left. */
  async function open(item: ImportJob) {
    if (item.status !== "MAPPED") {
      setJob(item);
      setActiveId(item.id);
      setStep(4);
      return;
    }
    setOpening(true);
    try {
      const rows = await queryClient.fetchQuery({ queryKey: importKeys.rows(item.id, "ALL", 1), queryFn: () => fetchRows(item.id, "ALL", 1, 5) });
      setJob(item);
      setSample(rows.items.map((r) => r.cells));
      setMapping(item.mapping ?? []);
      setSettings({
        listName: item.listName ?? "",
        listDescription: item.listDescription ?? "",
        sourceId: item.source?.id ?? null,
        ownerId: item.owner?.id ?? null,
        duplicateMode: item.duplicateMode,
        note: item.note ?? "",
      });
      setDry(null);
      setActiveId(null);
      setStep(1);
    } catch (e) {
      toast.show(errorMessage(e), "error");
    } finally {
      setOpening(false);
    }
  }

  function discardFromHistory(item: ImportJob) {
    void cancelImport(item.id)
      .then(() => {
        if (job?.id === item.id) reset();
        refreshHistory();
        toast.show("Import discarded.", "info");
      })
      .catch((e: unknown) => toast.show(errorMessage(e), "error"));
  }

  const ready = options.data;
  const busyCheck = configure.isPending || dryRun.isPending;

  return (
    <>
      <PageHeader
        title="Imports"
        subtitle="Bring leads in from a CSV. Nothing is saved to your leads until you review the dry run."
        actions={<Button variant="secondary" icon="download" onClick={() => downloadText("lead-import-template.csv", templateCsv())}>Download template</Button>}
      />

      <div className="flex flex-col items-start gap-4 lg:flex-row">
        <Card className="min-w-0 w-full flex-1 overflow-hidden">
          <Stepper step={step} />
          {options.isError ? (
            <div className="flex flex-col gap-3 p-5">
              <Alert>{errorMessage(options.error)}</Alert>
              <div><Button variant="secondary" onClick={() => void options.refetch()}>Try again</Button></div>
            </div>
          ) : !ready ? (
            <div className="flex justify-center py-16"><Spinner size={22} className="text-primary" /></div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={step}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0, transition: fast }}
                exit={{ opacity: 0, x: -18, transition: { duration: 0.12 } }}
              >
                {step === 0 ? <UploadStep options={ready} onUploaded={uploaded} /> : null}
                {step === 1 && job ? (
                  <MapStep job={job} sample={sample} options={ready} mapping={mapping} onChange={setMapping} busy={discard.isPending} onBack={chooseAnother} onNext={() => setStep(2)} />
                ) : null}
                {step === 2 && job ? (
                  <SettingsStep
                    options={ready}
                    settings={settings}
                    onChange={(next) => { setSettings(next); setFieldErrors({}); }}
                    fieldErrors={fieldErrors}
                    error={stepError}
                    busy={busyCheck}
                    onBack={() => setStep(1)}
                    onNext={() => void checkRows()}
                  />
                ) : null}
                {step === 3 && job && dry ? (
                  <ReviewStep job={job} options={ready} dry={dry} error={stepError} busy={start.isPending} onBack={() => { setStepError(null); setStep(2); }} onStart={() => void startImport()} />
                ) : null}
                {step === 4 && activeId ? <ProgressStep id={activeId} onAgain={reset} /> : null}
              </m.div>
            </AnimatePresence>
          )}
          {opening ? <div className="flex justify-center border-t border-border py-3"><Spinner size={16} className="text-primary" /></div> : null}
        </Card>

        <HistoryPanel selectedId={activeId ?? job?.id ?? null} onOpen={(item) => void open(item)} onDiscard={discardFromHistory} />
      </div>
      <p className="text-small text-muted">Only admins and sales managers can import leads. Every import, cancellation and report download is recorded in the audit log.</p>
    </>
  );
}

