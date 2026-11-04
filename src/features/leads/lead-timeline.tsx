"use client";

import { AnimatePresence, m } from "motion/react";
import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import { fast, spring } from "@/lib/motion";
import type { LeadDetail } from "./types";

type Ev = LeadDetail["events"][number];
type Filter = "all" | "stages" | "people" | "source";

const KIND: Record<string, { icon: IconName; tone: string; group: Exclude<Filter, "all"> }> = {
  LEAD_CREATED: { icon: "plus", tone: "bg-surface-alt text-text-2", group: "source" },
  TOUCHPOINT_ADDED: { icon: "refresh", tone: "bg-info-soft text-info", group: "source" },
  FORM_SUBMITTED: { icon: "note", tone: "bg-info-soft text-info", group: "source" },
  SLOT_BOOKED: { icon: "calendar", tone: "bg-primary-soft text-primary", group: "stages" },
  BOOKING_COMPLETED: { icon: "check", tone: "bg-ok-soft text-ok", group: "stages" },
  ASSIGNED: { icon: "user", tone: "bg-info-soft text-info", group: "people" },
  OPPORTUNITY_OPENED: { icon: "target", tone: "bg-primary-soft text-primary", group: "stages" },
  OPPORTUNITY_STAGE_CHANGED: { icon: "arrowR", tone: "bg-primary-soft text-primary", group: "stages" },
  OPPORTUNITY_WON: { icon: "check", tone: "bg-ok-soft text-ok", group: "stages" },
  OPPORTUNITY_LOST: { icon: "x", tone: "bg-bad-soft text-bad", group: "stages" },
  CONTACT_STAGE_CHANGED: { icon: "swap", tone: "bg-violet-soft text-violet", group: "stages" },
};
const kindOf = (type: string) => KIND[type] ?? { icon: "info" as IconName, tone: "bg-surface-alt text-text-2", group: "source" as const };

const dayFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function dayLabel(iso: string): string {
  const day = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  if (day === today) return "Today";
  if (day === today - 86_400_000) return "Yesterday";
  return dayFormat.format(new Date(iso));
}

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Everything" },
  { value: "stages", label: "Stage changes" },
  { value: "people", label: "Assignments" },
  { value: "source", label: "Source and imports" },
];

/** What happened to the lead, newest first, grouped by day. New events slide in at the top. */
export function LeadTimeline({ events }: { events: Ev[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: events.length, stages: 0, people: 0, source: 0 };
    for (const e of events) c[kindOf(e.type).group]++;
    return c;
  }, [events]);
  const shown = useMemo(() => (filter === "all" ? events : events.filter((e) => kindOf(e.type).group === filter)), [events, filter]);
  const groups = useMemo(() => {
    const out: Array<{ label: string; items: Ev[] }> = [];
    for (const e of shown) {
      const label = dayLabel(e.at);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(e);
      else out.push({ label, items: [e] });
    }
    return out;
  }, [shown]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-1.5 pb-3" role="tablist" aria-label="Filter the timeline">
        {FILTERS.filter((f) => f.value === "all" || counts[f.value] > 0).map((f) => {
          const on = f.value === filter;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(f.value)}
              className={cn("relative h-7 rounded-full px-3 text-small font-medium transition-colors", on ? "text-white" : "bg-surface text-text-2 ring-1 ring-border hover:text-text")}
            >
              {on ? <m.span layoutId="timeline-filter" transition={spring} className="absolute inset-0 rounded-full bg-primary" /> : null}
              <span className="relative">{f.label} <span className={on ? "text-white/80" : "text-muted"}>{counts[f.value]}</span></span>
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong py-12 text-center text-body text-text-2">Nothing here yet.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          <AnimatePresence initial={false} mode="popLayout">
            {groups.map((g) => (
              <m.li key={g.label} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }} className="flex flex-col">
                <h3 className="sticky top-0 z-10 -mx-1 bg-bg/90 px-1 py-1.5 text-small font-semibold text-text-2 backdrop-blur">{g.label}</h3>
                <ol className="relative flex flex-col">
                  <span aria-hidden className="absolute top-6 bottom-6 left-[23px] w-0.5 rounded-full bg-border-strong" />
                  {g.items.map((e, i) => {
                    const k = kindOf(e.type);
                    return (
                      <m.li
                        key={e.id}
                        layout="position"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0, transition: { ...fast, delay: Math.min(i, 6) * 0.035 } }}
                        className="group/event relative flex gap-3 rounded-xl py-3.5 pr-3 pl-2 transition-colors duration-150 hover:bg-surface"
                      >
                        <span className={cn("relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-bg transition-[transform,--tw-ring-color] group-hover/event:scale-105 group-hover/event:ring-surface", k.tone)}>
                          <Icon name={k.icon} size={14} />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-body font-medium text-text">{e.title}</span>
                          <span className="text-small text-text-2">{e.sub}</span>
                        </div>
                        <time dateTime={e.at} title={`${dayFormat.format(new Date(e.at))}, ${timeFormat.format(new Date(e.at))}`} className="shrink-0 pt-0.5 text-small whitespace-nowrap text-muted">
                          {relativeTime(e.at)}
                        </time>
                      </m.li>
                    );
                  })}
                </ol>
              </m.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
