"use client";

import { AnimatePresence, m } from "motion/react";
import { useRef, useState, type DragEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatBytes, formatNumber } from "@/lib/format";
import { fast, spring } from "@/lib/motion";
import { useUpload } from "./hooks";
import type { ImportOptions, UploadResult } from "./types";

export function UploadStep({ options, onUploaded }: { options: ImportOptions | undefined; onUploaded: (result: UploadResult) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpload();
  const [over, setOver] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const maxBytes = options?.limits.maxFileBytes ?? 10 * 1024 * 1024;
  const maxRows = options?.limits.maxRows ?? 25_000;
  const busy = upload.isPending;

  function take(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    if (!/\.csv$/i.test(file.name)) {
      setError("Only .csv files are supported. In Excel, choose Save As, then CSV UTF-8.");
      return;
    }
    if (file.size === 0) {
      setError("That file is empty.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`That file is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}; split it and import in parts.`);
      return;
    }
    setPicked(file);
    setProgress(0);
    upload.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: onUploaded,
        onError: (e) => {
          setError(errorMessage(e));
          setPicked(null);
        },
      },
    );
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files[0]);
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <m.div
        onDragOver={(e) => { e.preventDefault(); if (!busy) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        animate={{ scale: over ? 1.015 : 1 }}
        transition={spring}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          over ? "border-primary bg-primary-soft" : "border-border-strong bg-surface-alt",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {picked ? (
            <m.div key="busy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: fast }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="flex w-full max-w-sm flex-col items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name="file" size={22} /></span>
              <div className="flex min-w-0 max-w-full flex-col gap-0.5">
                <p className="truncate text-h2 font-semibold text-text">{picked.name}</p>
                <p className="text-body text-text-2">{formatBytes(picked.size)}</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <m.div className="progress-sheen h-full rounded-full bg-primary" initial={false} animate={{ width: `${Math.max(progress, 0.04) * 100}%` }} transition={fast} />
              </div>
              <p className="text-small text-text-2" aria-live="polite">{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : "Reading the file and finding columns…"}</p>
            </m.div>
          ) : (
            <m.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: fast }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="flex flex-col items-center gap-3">
              <m.span
                animate={over ? { y: -4 } : { y: 0 }}
                transition={spring}
                className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"
              >
                <Icon name="upload" size={22} />
              </m.span>
              <div className="flex flex-col gap-1">
                <p className="text-h2 font-semibold text-text">{over ? "Drop to upload" : "Drop a CSV here"}</p>
                <p className="text-body text-text-2">The first row must be column names. Up to {formatNumber(maxRows)} rows and {formatBytes(maxBytes)}.</p>
              </div>
              <Button onClick={() => input.current?.click()}>Choose file</Button>
            </m.div>
          )}
        </AnimatePresence>
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Choose a CSV file" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      </m.div>
      <AnimatePresence initial={false}>
        {error ? (
          <m.div key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto", transition: fast }} exit={{ opacity: 0, height: 0 }}>
            <Alert>{error}</Alert>
          </m.div>
        ) : null}
      </AnimatePresence>
      <p className="text-small text-muted">Nothing is saved to your leads until you review the dry run and start the import. Duplicates are found by email and by phone, so people who are already leads are never added twice.</p>
    </div>
  );
}
