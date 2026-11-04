"use client";

import { m } from "motion/react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { fast } from "@/lib/motion";
import { useLostReasons } from "./hooks";

/** Closing an opportunity as lost needs a reason from the configured list, and may carry a short note. */
export function MarkLostModal({
  open,
  leadName,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  leadName: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (input: { reasonId: number; note: string }) => void;
}) {
  const reasons = useLostReasons();
  const [reasonId, setReasonId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  return (
    <Modal
      open={open}
      title="Mark as lost"
      subtitle={`Why is ${leadName} not moving forward? You can reopen the lead later.`}
      onClose={loading ? () => undefined : onClose}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" loading={loading} disabled={reasonId === null} onClick={() => reasonId !== null && onConfirm({ reasonId, note })}>Mark as lost</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alert>{error}</Alert> : null}
        {reasons.isPending ? (
          <div className="py-6 text-center"><Spinner className="mx-auto text-primary" /></div>
        ) : reasons.isError ? (
          <Alert>Could not load the reasons. Close this and try again.</Alert>
        ) : (
          <div role="radiogroup" aria-label="Reason" className="flex flex-wrap gap-2">
            {reasons.data.map((r, i) => {
              const on = r.id === reasonId;
              return (
                <m.button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { ...fast, delay: i * 0.03 } }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setReasonId(r.id)}
                  className={cn("rounded-full border px-3.5 py-1.5 text-body transition-colors", on ? "border-bad bg-bad-soft font-medium text-bad" : "border-border-strong bg-surface text-text hover:bg-surface-alt")}
                >
                  {r.name}
                </m.button>
              );
            })}
          </div>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-text-2">Note (optional)</span>
          <textarea
            value={note}
            maxLength={255}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Anything the next person should know"
            className="w-full resize-none rounded-lg border border-border-strong bg-surface px-3 py-2 text-body outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <span className="self-end text-small text-muted">{note.length}/255</span>
        </label>
      </div>
    </Modal>
  );
}
