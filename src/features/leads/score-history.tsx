"use client";

import { m } from "motion/react";
import { AnimatedValue } from "@/components/motion/animated-value";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import { fast } from "@/lib/motion";
import type { LeadDetail } from "./types";

/** Human words for the reasons score points are given. */
export function reasonLabel(reason: string): string {
  if (reason === "IMPORT_INITIAL") return "Starting score from the import file";
  return reason.toLowerCase().split("_").map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
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
      {entries.length === 0 ? (
        <p className="py-8 text-center text-body text-text-2">No points yet.</p>
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
