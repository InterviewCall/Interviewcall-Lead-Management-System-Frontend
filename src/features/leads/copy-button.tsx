"use client";

import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { fast } from "@/lib/motion";

/** Copies `value`; the icon turns into a tick for a moment so it is clear it worked. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      toast.show("Could not copy. Select it and copy by hand.", "error");
    }
  }
  return (
    <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted opacity-0 transition hover:bg-black/5 hover:text-text focus-visible:opacity-100 group-hover/row:opacity-100 max-lg:opacity-100">
      <AnimatePresence mode="wait" initial={false}>
        <m.span key={done ? "done" : "copy"} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: fast }} exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.08 } }}>
          {done ? <Icon name="check" size={14} className="text-ok" /> : <Icon name="copy" size={14} />}
        </m.span>
      </AnimatePresence>
    </button>
  );
}
