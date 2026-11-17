"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useCallQueue } from "./call-queue";

/**
 * On a lead page that is part of the calling queue: where you are in today's list and who is next, so a BDA can
 * finish one call, log it and move straight to the next person without going back to My Day.
 */
export function QueueBar({ leadId }: { leadId: string }) {
  const { entries, stop } = useCallQueue();
  const index = entries.findIndex((e) => e.leadId === leadId);
  const inQueue = index >= 0;
  const prev = inQueue ? entries[index - 1] : undefined;
  const next = inQueue ? entries[index + 1] : undefined;

  return (
    <>
      {/* Room at the end of the page so the bar never hides the last thing on a phone. */}
      {inQueue ? <div aria-hidden className="h-16 lg:hidden" /> : null}
    <AnimatePresence>
      {inQueue ? (
        <m.div
          key="queue"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="pointer-events-none fixed inset-x-3 bottom-[148px] z-30 flex justify-center lg:bottom-6"
        >
          <div role="navigation" aria-label="Calling queue" className="pointer-events-auto flex max-w-full items-center gap-1 rounded-2xl bg-ink p-1.5 pl-3 text-white shadow-pop ring-1 ring-white/10">
            <span className="flex items-center gap-2 pr-2">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-ok/70 motion-reduce:hidden" />
                <span className="relative size-2 rounded-full bg-ok" />
              </span>
              <span className="nums text-small font-medium whitespace-nowrap text-white/80">
                Calling <span className="font-display font-bold text-white">{index + 1}</span> of {entries.length}
              </span>
            </span>
            {/* How far through the list you are. */}
            <span className="mr-1 hidden h-1 w-16 overflow-hidden rounded-full bg-white/15 sm:block" aria-hidden>
              <m.span className="block h-full rounded-full bg-ok" initial={false} animate={{ width: `${((index + 1) / entries.length) * 100}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
            </span>
            <QueueLink entry={prev} label="Previous" icon="back" />
            {next ? (
              <Link
                href={`/leads/${next.leadId}`}
                className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-ink transition hover:bg-white/90 active:scale-[0.98]"
              >
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="text-[11px] text-ink/60">Next</span>
                  <m.span key={next.leadId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="max-w-[160px] truncate text-small font-semibold">{next.name}</m.span>
                </span>
                <Icon name="right" size={16} className="shrink-0" />
              </Link>
            ) : (
              <Link href="/my-day" onClick={stop} className="flex items-center gap-2 rounded-xl bg-ok px-3 py-2 text-small font-semibold text-white transition hover:brightness-110">
                <Icon name="check" size={15} /> Queue done
              </Link>
            )}
            <button type="button" onClick={stop} aria-label="Stop the calling queue" title="Stop the queue" className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white">
              <Icon name="x" size={16} />
            </button>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
    </>
  );
}

function QueueLink({ entry, label, icon }: { entry: { leadId: string; name: string } | undefined; label: string; icon: "back" }) {
  const cls = "flex size-9 shrink-0 items-center justify-center rounded-xl transition";
  if (!entry) return <span aria-hidden className={cn(cls, "text-white/25")}><Icon name={icon} size={16} /></span>;
  return (
    <Link href={`/leads/${entry.leadId}`} aria-label={`${label}: ${entry.name}`} title={`${label}: ${entry.name}`} className={cn(cls, "text-white/80 hover:bg-white/10 hover:text-white")}>
      <Icon name={icon} size={16} />
    </Link>
  );
}
