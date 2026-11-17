"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { AnimatedValue } from "@/components/motion/animated-value";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber, relativeTime } from "@/lib/format";
import { fast } from "@/lib/motion";
import { LIFECYCLE, STAGE } from "./lead-display";
import type { LeadDetail, LifecycleCode, StageCode } from "./types";

const REASONS: Record<string, string> = {
  IMPORT_INITIAL: "Starting score from the import file",
  VSL_FORM_SCORE: "VSL form score",
  VSL_DETAILS: "Gave details on the VSL page",
  VSL_SLOT_BOOKED: "Booked a counselling call",
  VSL_CALL_ATTENDED: "Attended the booked call",
  CALL_CONNECTED: "Connected call",
  CLOSED_WON: "Closed as won",
};

/** Human words for the reasons score points are given. */
export function reasonLabel(reason: string): string {
  if (REASONS[reason]) return REASONS[reason];
  if (reason.startsWith("CONTACT_STAGE_")) {
    const code = reason.slice("CONTACT_STAGE_".length) as LifecycleCode;
    if (LIFECYCLE[code]) return code === "NOT_INTERESTED" || code === "EXHAUSTED_NOT_CONNECTED" ? `Marked ${LIFECYCLE[code].label}` : `Became ${LIFECYCLE[code].label}`;
  }
  if (reason.startsWith("PIPELINE_")) {
    const code = reason.slice("PIPELINE_".length) as StageCode;
    if (STAGE[code]) return `Reached ${STAGE[code].label}`;
  }
  return reason.toLowerCase().split("_").map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

interface ScoreRule {
  label: string;
  /** Null for the VSL form, which adds its own 0 to 100. */
  points: number | null;
  once: boolean;
}

/** How the score grows, so nobody wonders why it moved (or did not). Admins can also catch up old leads here. */
function ScoreRules() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const rules = useQuery({
    queryKey: ["scores", "rules"],
    queryFn: async () => (await api.get<{ rules: ScoreRule[] }>("/scores/rules")).data.rules,
    staleTime: 5 * 60_000,
    enabled: open,
  });
  const recalc = useMutation({
    mutationFn: async () => (await api.post<{ events: number; leads: number; points: number }>("/scores/recalculate")).data,
    onSuccess: (r) => {
      toast.show(r.leads === 0 ? "Every lead's score was already up to date." : `Scores caught up: ${formatNumber(r.leads)} ${r.leads === 1 ? "lead" : "leads"} changed.`, "success");
      for (const key of ["leads", "pipeline", "my-day"]) void queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (e) => toast.show(errorMessage(e), "error"),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-alt/60">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name="zap" size={16} /></span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body font-semibold text-text">How the score grows</span>
          <span className="text-small text-text-2">It goes up on its own as the lead engages and moves forward</span>
        </span>
        <m.span animate={{ rotate: open ? 90 : 0 }} className="text-text-2"><Icon name="right" size={16} /></m.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <m.div key="rules" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={fast} className="overflow-hidden border-t border-border">
            <ul className="flex flex-col px-4 py-2">
              {(rules.data ?? []).map((r) => (
                <li key={r.label} className="flex items-center gap-3 py-1.5">
                  <span className="min-w-0 flex-1 text-body text-text">{r.label}</span>
                  <span className="text-small text-muted">{r.points === null ? "its score, 0 to 100" : r.once ? "once" : "each time"}</span>
                  {r.points === null ? null : (
                    <span className={cn("nums w-11 rounded-md py-0.5 text-center text-small font-semibold", r.points >= 0 ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>{r.points > 0 ? "+" : ""}{r.points}</span>
                  )}
                </li>
              ))}
              {rules.isPending ? <li className="py-3 text-small text-text-2">Loading the rules…</li> : null}
              {rules.isError ? <li className="py-3 text-small text-bad">{errorMessage(rules.error)}</li> : null}
            </ul>
            {user?.role === "ADMIN" ? (
              <div className="flex items-center gap-3 border-t border-border bg-surface-alt px-4 py-3">
                <p className="min-w-0 flex-1 text-small text-text-2">Leads from before scoring started can be caught up from their history. Nothing is counted twice.</p>
                <Button variant="secondary" icon="refresh" loading={recalc.isPending} onClick={() => recalc.mutate()}>Catch up all leads</Button>
              </div>
            ) : null}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** The running total as a line that draws itself, then every entry that built it. */
export function ScoreHistory({ score, entries }: { score: number; entries: LeadDetail["scoreEntries"] }) {
  // Entries arrive newest first; the line runs oldest to newest.
  const ordered = [...entries].reverse();
  const totals = ordered.reduce<number[]>((acc, e) => [...acc, (acc[acc.length - 1] ?? 0) + e.points], []);
  const W = 320, H = 72, PAD = 6;
  const max = Math.max(1, ...totals), min = Math.min(0, ...totals);
  const points = totals.map((t, i) => [
    totals.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (totals.length - 1),
    H - PAD - ((t - min) / (max - min || 1)) * (H - PAD * 2),
  ] as const);
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = points.length > 1 ? `${path} L${points[points.length - 1]![0]} ${H} L${points[0]![0]} ${H} Z` : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-end gap-3">
          <AnimatedValue value={score} className="text-[40px] leading-none font-bold text-text tabular-nums" />
          <span className="pb-1 text-body text-text-2">lead score, from {entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        </div>
        {points.length > 1 ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-[72px] w-full" role="img" aria-label="Lead score over time">
            <defs>
              <linearGradient id="score-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <m.path d={area} fill="url(#score-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }} />
            <m.path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
            <m.circle cx={points[points.length - 1]![0]} cy={points[points.length - 1]![1]} r="3.5" fill="var(--color-primary)" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: "spring", stiffness: 500, damping: 22 }} />
          </svg>
        ) : (
          <p className="mt-3 text-small text-text-2">The line appears once the lead has more than one entry. The score grows as the lead engages.</p>
        )}
      </div>
      <ScoreRules />
      {entries.length === 0 ? (
        <p className="py-6 text-center text-body text-text-2">No points yet. They arrive as the lead engages.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          {entries.map((s, i) => (
            <m.li key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0, transition: { ...fast, delay: Math.min(i, 8) * 0.03 } }} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-body text-text">{reasonLabel(s.reason)}</span>
                <span className="text-small text-muted">{relativeTime(s.at)}</span>
              </span>
              <span className={cn("rounded-md px-2 py-0.5 text-body font-semibold tabular-nums", s.points >= 0 ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>{s.points > 0 ? "+" : ""}{s.points}</span>
            </m.li>
          ))}
        </ul>
      )}
    </div>
  );
}
