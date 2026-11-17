"use client";

import { m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { EASE_OUT } from "@/lib/motion";
import type { DayBookedCall, DayFollowUp } from "./types";

const IST = "Asia/Kolkata";
/** The working day the rail shows, in India hours. It widens if something is booked outside it. */
const DAY_START = 9;
const DAY_END = 21;
/** How long the opening sweep takes to reach the current time. */
const SWEEP = 0.9;
/** Events closer than this share a column and stack upwards. */
const BUCKET_MINUTES = 30;
const MAX_STACK = 4;

const hoursIst = (d: Date) => {
  const [h, m] = d.toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false }).split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
};
const dayIst = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: IST });
const clock = (d: Date) => d.toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true });
const hourLabel = (h: number) => (h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`);

interface RailEvent {
  key: string;
  leadId: string;
  name: string;
  at: Date;
  kind: "booked" | "follow-up";
  unowned: boolean;
}

/**
 * Today as a line from morning to evening: booked calls (large dots) and follow-ups (small dots) at their times,
 * what is already late gathered at the start, and where "now" is. On arrival the elapsed part of the day sweeps
 * in and each dot lights up as the sweep reaches it.
 */
export function DayRail({ followUps, booked, onShowLate }: { followUps: DayFollowUp[]; booked: DayBookedCall[]; onShowLate: () => void }) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const today = dayIst(now);
  const late = followUps.filter((f) => f.overdue);
  const events: RailEvent[] = [
    ...booked.map((b) => ({ key: `b-${b.id}`, leadId: b.leadId, name: b.name, at: new Date(b.startAt), kind: "booked" as const, unowned: !b.owner })),
    ...followUps.filter((f) => !f.overdue).map((f) => ({ key: `f-${f.id}`, leadId: f.leadId, name: f.name, at: new Date(f.dueAt), kind: "follow-up" as const, unowned: false })),
  ].filter((e) => dayIst(e.at) === today);

  const start = Math.min(DAY_START, ...events.map((e) => Math.floor(hoursIst(e.at))));
  const end = Math.max(DAY_END, ...events.map((e) => Math.ceil(hoursIst(e.at) + 0.01)));
  const span = end - start;
  const at = (h: number) => Math.min(1, Math.max(0, (h - start) / span));
  const nowFrac = at(hoursIst(now));
  const beforeDay = hoursIst(now) < start;
  const afterDay = hoursIst(now) >= end;

  // Stack events that fall in the same half hour, booked calls first.
  const buckets = new Map<number, RailEvent[]>();
  for (const e of events.sort((a, b) => a.at.getTime() - b.at.getTime() || (a.kind === "booked" ? -1 : 1))) {
    const bucket = Math.floor(((hoursIst(e.at) - start) * 60) / BUCKET_MINUTES);
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), e]);
  }
  const ticks = Array.from({ length: span + 1 }, (_, i) => start + i).filter((h) => span <= 14 || h % 2 === 1);
  // Each dot lights up when the sweep passes it; dots later than now arrive just after the sweep ends.
  const delayFor = (frac: number) => (reduce ? 0 : frac <= nowFrac ? (frac / Math.max(nowFrac, 0.001)) * SWEEP : SWEEP + 0.08 + (frac - nowFrac) * 0.4);

  return (
    <div className="flex items-end gap-3 sm:gap-4">
      <button
        type="button"
        onClick={onShowLate}
        disabled={late.length === 0}
        className={cn(
          "mb-1 flex h-[58px] w-14 shrink-0 flex-col items-center justify-center rounded-xl border text-center transition sm:w-16",
          late.length > 0 ? "border-hot/50 bg-hot/15 text-white hover:bg-hot/25" : "border-white/10 text-side-text",
        )}
        aria-label={late.length > 0 ? `${late.length} late follow-ups. Show them` : "Nothing late"}
      >
        <span className="nums font-display text-[22px] leading-7 font-bold">{late.length}</span>
        <span className="text-[11px] leading-4">late</span>
      </button>

      <div className={cn("relative min-w-0 flex-1 pb-6", events.length > 0 ? "pt-[72px]" : "pt-[44px]")} role="img" aria-label={`Today from ${hourLabel(start)} to ${hourLabel(end)}: ${events.filter((e) => e.kind === "booked").length} booked calls and ${events.filter((e) => e.kind === "follow-up").length} follow-ups still to come. It is ${clock(now)}.`}>
        {/* The track and the part of the day already gone. */}
        <div className="relative h-1.5 rounded-full bg-white/10">
          <m.div
            className="absolute inset-y-0 left-0 origin-left rounded-full bg-gradient-to-r from-primary/40 to-primary"
            style={{ width: `${nowFrac * 100}%` }}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: SWEEP, ease: EASE_OUT }}
          />
        </div>

        {/* Hour marks. */}
        {ticks.map((h, i) => (
          <span
            key={h}
            className={cn(
              "nums absolute bottom-0 text-[11px] leading-4 whitespace-nowrap text-side-text",
              i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2",
              // On a phone only every third hour has room for its label.
              i !== 0 && i !== ticks.length - 1 && (h - start) % 3 !== 0 && "hidden md:block",
            )}
            style={{ left: `${at(h) * 100}%` }}
          >
            {hourLabel(h)}
          </span>
        ))}
        {events.length === 0 ? (
          <span className="absolute top-2 right-0 hidden text-small text-side-text md:block">No booked calls or follow-ups left for today</span>
        ) : null}

        {/* Booked calls and follow-ups, stacked upwards where they share a half hour. */}
        {[...buckets.entries()].map(([bucket, list]) => {
          const frac = at(start + ((bucket + 0.5) * BUCKET_MINUTES) / 60);
          const shown = list.slice(0, MAX_STACK);
          return (
            <div key={bucket} className="absolute bottom-[30px] flex -translate-x-1/2 flex-col-reverse items-center gap-1" style={{ left: `${frac * 100}%` }}>
              {shown.map((e, i) => (
                <m.span
                  key={e.key}
                  initial={reduce ? false : { opacity: 0, scale: 0.3, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 520, damping: 26, delay: delayFor(frac) + i * 0.05 }}
                  className="group/dot relative flex"
                >
                  <Link
                    href={`/leads/${e.leadId}`}
                    aria-label={`${e.kind === "booked" ? "Booked call" : "Follow-up"} with ${e.name} at ${clock(e.at)}`}
                    className={cn(
                      "block rounded-full ring-2 ring-ink transition-transform hover:scale-125 focus-visible:scale-125",
                      e.kind === "booked" ? (e.unowned ? "size-3.5 bg-warm" : "size-3.5 bg-white") : "size-2.5 bg-warm/90",
                    )}
                  />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 translate-y-1 rounded-md bg-white px-2 py-1 text-[12px] leading-4 whitespace-nowrap text-ink opacity-0 shadow-pop transition group-hover/dot:translate-y-0 group-hover/dot:opacity-100 group-focus-within/dot:translate-y-0 group-focus-within/dot:opacity-100">
                    <span className="font-semibold">{clock(e.at)}</span> {e.name}
                    {e.kind === "booked" ? (e.unowned ? " · booked, no owner" : " · booked call") : " · follow-up"}
                  </span>
                </m.span>
              ))}
              {list.length > MAX_STACK ? <span className="nums text-[10px] leading-3 font-semibold text-side-text">+{list.length - MAX_STACK}</span> : null}
            </div>
          );
        })}

        {/* Now. */}
        <m.div
          className={cn("pointer-events-none absolute bottom-5 flex -translate-x-1/2 flex-col items-center", events.length > 0 ? "top-[60px]" : "top-[32px]")}
          style={{ left: `${nowFrac * 100}%` }}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : SWEEP * 0.85, duration: 0.25 }}
        >
          <span className={cn("absolute -top-6 rounded-full bg-white px-2 py-0.5 text-[11px] leading-4 font-semibold whitespace-nowrap text-ink", nowFrac < 0.15 ? "left-[-5px]" : nowFrac > 0.85 ? "right-[-5px]" : "")}>
            {beforeDay ? `Now ${clock(now)} · day starts ${hourLabel(start)}` : afterDay ? `Now ${clock(now)} · day is done` : `Now ${clock(now)}`}
          </span>
          <span className="w-px flex-1 bg-white/70" />
          <span className="relative mb-[-3px] flex size-2.5">
            {reduce ? null : <span className="absolute inset-0 animate-ping rounded-full bg-white/60" />}
            <span className="relative size-2.5 rounded-full bg-white" />
          </span>
        </m.div>
      </div>
    </div>
  );
}
