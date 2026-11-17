"use client";

import { m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatedValue } from "@/components/motion/animated-value";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/api/errors";
import type { Tone } from "@/lib/roles";
import { useCallQueue } from "./call-queue";
import { DayRail } from "./day-rail";
import { useMyDay, useMyDayActions } from "./hooks";
import type { DayFollowUp, FollowUpType } from "./types";

type Tab = "all" | "followups" | "booked" | "overdue";

/** Which rows each tab keeps. Booked calls are the VSL slots; everything else is a follow-up someone set. */
const IN_TAB: Record<Tab, (f: { type: string; overdue: boolean }) => boolean> = {
  all: () => true,
  followups: (f) => f.type !== "SCHEDULED_CALL",
  booked: (f) => f.type === "SCHEDULED_CALL",
  overdue: (f) => f.overdue,
};

const IST = "Asia/Kolkata";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The managers who can take a booked call themselves. */
const TAKERS = ["SALES_MANAGER", "ADMIN"];

const BADGE: Record<FollowUpType, { label: string; tone: Tone }> = {
  FOLLOW_UP: { label: "Follow-up", tone: "warning" },
  SCHEDULED_CALL: { label: "Booked call", tone: "primary" },
  DUPLICATE_REVIEW: { label: "Duplicate", tone: "violet" },
};

const istDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: IST });
const clock = (d: Date) => d.toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();

function greeting(now: Date): string {
  const h = Number(now.toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** "Overdue 2 h", "Today 6:00 PM", "Tomorrow 11:00 AM", or the date. */
export function dueLabel(dueAt: string, now = new Date()): string {
  const due = new Date(dueAt);
  const late = now.getTime() - due.getTime();
  if (late > 0) {
    if (late < HOUR) return `Overdue ${Math.max(1, Math.floor(late / MINUTE))} min`;
    if (late < 24 * HOUR) return `Overdue ${Math.floor(late / HOUR)} h`;
    return `Overdue ${Math.floor(late / (24 * HOUR))} d`;
  }
  const days = Math.round((Date.parse(istDay(due)) - Date.parse(istDay(now))) / (24 * HOUR));
  if (days === 0) return `Today ${clock(due)}`;
  if (days === 1) return `Tomorrow ${clock(due)}`;
  return `${due.toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" })} ${clock(due)}`;
}

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;

function noteFor(f: DayFollowUp): string {
  return f.attempts > 0 ? `${f.title} · ${f.attempts} ${f.attempts === 1 ? "attempt" : "attempts"} without a connection` : f.title;
}

export function MyDayScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [view, setView] = useState<"mine" | "team">("mine");
  const day = useMyDay(view);
  const { done, take } = useMyDayActions();
  const callQueue = useCallQueue();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  /** Ticked off: shown ticked and faded at once, and kept so until the refreshed list drops it. */
  const [finished, setFinished] = useState<Set<string>>(new Set());
  const now = new Date();
  const first = user?.name.split(" ")[0] ?? "there";
  const data = day.data;
  const team = data?.scope === "team";
  const everyone = data?.view === "team";
  const canTake = Boolean(user && TAKERS.includes(user.role));
  const fail = (e: unknown) => toast.show(errorMessage(e), "error");

  const all = data?.followUps ?? [];
  const followUps = all.filter(IN_TAB[tab]);
  const countIn = (t: Tab) => all.filter(IN_TAB[t]).length;
  const needOwner = data?.booked.filter((b) => !b.owner).length ?? 0;
  const nextBooked = data?.booked.filter((b) => new Date(b.startAt).getTime() > now.getTime()).sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

  // Today's people to call, in the list's order, each once: what "Start calling" walks through.
  const queue = all.filter((f) => f.mine || !everyone).filter((f, i, mine) => mine.findIndex((x) => x.leadId === f.leadId) === i).map((f) => ({ leadId: f.leadId, name: f.name, note: noteFor(f) }));
  function startCalling() {
    callQueue.start(queue);
    router.push(`/leads/${queue[0]!.leadId}`);
  }

  /** The "late" pile on the timeline: show the overdue follow-ups and bring the list into view. */
  function showLate() {
    setTab("overdue");
    document.getElementById("follow-ups")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function tick(f: DayFollowUp) {
    setFinished((s) => new Set(s).add(f.id));
    done.mutate(f.id, {
      onSuccess: () => toast.show(`${f.name}: marked done`),
      onError: (e) => {
        setFinished((s) => {
          const n = new Set(s);
          n.delete(f.id);
          return n;
        });
        fail(e);
      },
    });
  }

  function takeCall(leadId: string, name: string) {
    if (!user) return;
    take.mutate({ leadId, userId: user.id }, { onSuccess: () => toast.show(`${name} is yours now`, "success"), onError: fail });
  }

  const heroLine = !data
    ? "Loading your day…"
    : [
        data.kpis.due === 0
          ? "Nothing is due today."
          : `${data.kpis.due} ${data.kpis.due === 1 ? "follow-up is" : "follow-ups are"} due${data.kpis.overdue > 0 ? `, ${data.kpis.overdue} overdue` : " today"}.`,
        nextBooked ? `Next booked call: ${nextBooked.name} at ${clock(new Date(nextBooked.startAt)).toLowerCase()}.` : null,
        team && data.kpis.unassigned ? `${data.kpis.unassigned} booked ${data.kpis.unassigned === 1 ? "call is" : "calls are"} still waiting for an owner.` : null,
      ].filter(Boolean).join(" ");

  if (day.isError && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-body text-text-2">{errorMessage(day.error)}</p>
        <Button variant="secondary" icon="refresh" onClick={() => void day.refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <>
      <section className="anim-fade-in relative overflow-hidden rounded-[18px] bg-ink px-5 pt-5 pb-4 text-white shadow-raise sm:px-7 sm:pt-6">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
            <p className="text-small text-side-text">{now.toLocaleDateString("en-IN", { timeZone: IST, weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="font-display text-[26px] leading-8 font-bold tracking-[-0.5px] sm:text-hero">{greeting(now)}, {first}</h1>
            <p className="max-w-[62ch] text-body text-white/80">{heroLine}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canTake ? (
              <Link href="/assignment" className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3.5 text-body font-medium text-white ring-1 ring-white/15 transition hover:bg-white/15">
                <Icon name="shuffle" size={16} /> Assign leads
              </Link>
            ) : null}
            {queue.length > 0 ? (
              <button type="button" onClick={startCalling} className="flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-body font-semibold text-ink transition hover:bg-white/90 active:scale-[0.97]">
                <Icon name="phone" size={15} /> Start calling <span className="nums rounded-full bg-ink/10 px-1.5 text-small">{queue.length}</span>
              </button>
            ) : (
              <Link href="/leads" className="flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-body font-semibold text-ink transition hover:bg-white/90">
                <Icon name="users" size={15} /> Open my leads
              </Link>
            )}
          </div>
        </div>
        <div className="mt-2">
          {data ? (
            <DayRail followUps={all} booked={data.booked} onShowLate={showLate} />
          ) : (
            <div className="h-[104px] animate-pulse rounded-xl bg-white/5" />
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 overflow-hidden rounded-card border border-border bg-surface shadow-card lg:grid-cols-4">
        <Stat label="Follow-ups due today" value={data?.kpis.due} note={data ? (data.kpis.overdue > 0 ? `${data.kpis.overdue} overdue` : "none overdue") : undefined} tone={data && data.kpis.overdue > 0 ? "bad" : "ok"} />
        <Stat label={team ? "Booked calls today" : "Your booked calls"} value={data?.kpis.booked} note={team && data ? (data.kpis.unassigned ? `${data.kpis.unassigned} need an owner` : "all have an owner") : undefined} tone={data?.kpis.unassigned ? "warn" : "ok"} />
        <Stat label={team ? "New leads today" : "New leads for you"} value={data?.kpis.newLeads} note={data?.kpis.newLeadsChange == null ? undefined : `${signed(data.kpis.newLeadsChange)}% vs yesterday so far`} tone={(data?.kpis.newLeadsChange ?? 0) < 0 ? "bad" : "ok"} />
        <Stat label="Connect rate, 7 days" value={data ? (data.kpis.connectRate === null ? "–" : `${data.kpis.connectRate}%`) : undefined} note={data?.kpis.connectRateChange == null ? (data && data.kpis.connectRate === null ? "no calls yet" : undefined) : `${signed(data.kpis.connectRateChange)} pts vs week before`} tone={(data?.kpis.connectRateChange ?? 0) < 0 ? "bad" : "ok"} />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <Card id="follow-ups" className="min-w-0 flex-1 scroll-mt-20">
          <CardHeader
            title={everyone ? "Team follow-ups" : "Today’s follow-ups"}
            subtitle={everyone ? "Everyone’s follow-ups, overdue first" : "Overdue first, then hottest leads, then due time"}
            actions={
              <div className="flex flex-wrap items-center gap-2">
              {team ? (
                <Segmented ariaLabel="Whose follow-ups" value={view} onChange={setView}
                  options={[{ value: "mine", label: "Mine" }, { value: "team", label: "Whole team" }]} />
              ) : null}
              <Segmented ariaLabel="Filter follow-ups" value={tab} onChange={setTab}
                options={[
                  { value: "all", label: "All", count: countIn("all") },
                  { value: "followups", label: "Follow-ups", count: countIn("followups") },
                  { value: "booked", label: "Booked", count: countIn("booked") },
                  { value: "overdue", label: "Overdue", count: countIn("overdue") },
                ]} />
              </div>
            }
          />
          {day.isPending ? (
            <div className="py-14 text-center"><Spinner className="mx-auto text-primary" /></div>
          ) : followUps.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-14 text-center">
              <p className="text-body font-medium text-text">{all.length === 0 ? "You are all caught up" : "Nothing in this filter"}</p>
              <p className="text-small text-text-2">{all.length === 0 ? "Follow-ups you set after a call show up here when they are due." : tab === "overdue" ? "Nothing is late. Nice work." : tab === "booked" ? "No booked calls on your list today." : "No follow-ups of this kind today."}</p>
            </div>
          ) : (
            <ul aria-label="Follow-ups">
              {followUps.map((f) => {
                const ticked = finished.has(f.id);
                const badge = f.overdue && f.type === "FOLLOW_UP" ? { label: BADGE[f.type].label, tone: "danger" as Tone } : BADGE[f.type];
                return (
                  <m.li
                    key={f.id}
                    layout="position"
                    initial={false}
                    animate={{ opacity: ticked ? 0.45 : 1 }}
                    className="group/row flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-alt/70 sm:gap-4 sm:px-5"
                  >
                    <label className="relative flex size-5 shrink-0 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        aria-label={`Mark ${f.name} follow-up done`}
                        checked={ticked}
                        disabled={ticked}
                        onChange={() => tick(f)}
                        className="peer size-5 cursor-pointer appearance-none rounded-full border-[1.5px] border-border-strong transition checked:border-ok checked:bg-ok hover:border-ok"
                      />
                      <Icon name="check" size={12} className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100" />
                    </label>
                    <span className={cn("nums flex w-[72px] shrink-0 flex-col text-small leading-4 sm:w-[84px]", f.overdue ? "text-bad" : "text-text-2")}>
                      <span className="font-semibold">{dueLabel(f.dueAt, now).replace(/^Overdue /, "").replace(/^Today /, "")}</span>
                      <span className={f.overdue ? "text-bad/80" : "text-muted"}>{f.overdue ? "late" : dueLabel(f.dueAt, now).startsWith("Today") ? "today" : "due"}</span>
                    </span>
                    <Link href={`/leads/${f.leadId}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn("truncate text-body font-semibold text-text group-hover/row:text-primary", ticked && "line-through")}>{f.name}</span>
                      <span className="line-clamp-2 text-small text-text-2">{noteFor(f)}</span>
                      {everyone ? <span className="text-small font-medium text-text-2">{f.owner ? (f.mine ? "You" : f.owner) : "No owner"}</span> : null}
                    </Link>
                    <span className={cn("hidden items-center gap-1.5 text-small font-medium sm:flex", TYPE_TEXT[badge.tone])}>
                      <Icon name={f.type === "SCHEDULED_CALL" ? "calendar" : f.type === "DUPLICATE_REVIEW" ? "link" : "clock"} size={14} />
                      {badge.label}
                    </span>
                    <Link href={`/leads/${f.leadId}`} aria-label={`Open ${f.name} to call`} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition group-hover/row:bg-primary group-hover/row:text-white">
                      <Icon name="phone" size={16} />
                    </Link>
                  </m.li>
                );
              })}
            </ul>
          )}
          {data && data.kpis.due > all.length ? (
            <Link href="/leads" className="flex h-12 items-center justify-center gap-1.5 text-body font-medium text-primary">
              Showing {all.length} of {data.kpis.due}. Open {everyone ? "the" : "my"} queue <Icon name="right" size={14} />
            </Link>
          ) : null}
        </Card>

        <div className="flex w-full flex-col gap-5 xl:w-[380px] xl:shrink-0">
          <Card>
            <CardHeader title="Booked calls" subtitle={team ? "VSL slots for today, whole team" : "Your VSL slots for today"}
              actions={team && data ? <Badge tone={needOwner > 0 ? "warning" : "success"}>{needOwner > 0 ? `${needOwner} need an owner` : "All have an owner"}</Badge> : null} />
            {data && data.booked.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-5 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-bg text-muted"><Icon name="calendar" size={18} /></span>
                <p className="text-body font-medium text-text">No booked calls today</p>
                <p className="text-small text-text-2">Slots booked on the VSL appear here with their time.</p>
              </div>
            ) : null}
            {(data?.booked ?? []).map((b) => {
              const at = new Date(b.startAt);
              const [hour, meridiem] = clock(at).split(" ");
              return (
                <div key={b.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
                  <div className={cn("flex h-12 w-[54px] shrink-0 flex-col items-center justify-center rounded-xl", b.owner ? "bg-ink text-white" : "bg-warm-soft text-warm ring-1 ring-warm/30")}>
                    <span className="nums font-display text-[15px] leading-5 font-bold">{hour}</span>
                    <span className="text-[11px] leading-3 opacity-75">{meridiem?.toLowerCase()}</span>
                  </div>
                  <Link href={`/leads/${b.leadId}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-body font-medium text-text">{b.name}</span>
                    <span className="truncate text-small text-text-2">{b.detail}</span>
                  </Link>
                  {b.owner ? (
                    <span title={b.owner}><Avatar name={b.owner} size={28} /></span>
                  ) : canTake ? (
                    <button type="button" disabled={take.isPending} onClick={() => takeCall(b.leadId, b.name)}
                      className="h-8 rounded-full bg-cta px-3.5 text-small font-semibold text-white shadow-cta transition active:scale-95 disabled:opacity-60">Take it</button>
                  ) : (
                    <span className="text-small text-text-2">No owner</span>
                  )}
                </div>
              );
            })}
          </Card>

          <Card>
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h2 className="text-body font-semibold text-text">Calls this week</h2>
                <p className="text-small text-text-2">{team ? "Team total · all callers" : "Your calls"}</p>
              </div>
              <AnimatedValue value={data?.weekTotal ?? "–"} className="nums font-display text-display font-bold text-text" />
            </div>
            <WeekChart week={data?.week ?? []} />
            <div className="flex items-center gap-2 px-5 pb-4 text-small text-text-2">
              <span className="size-2.5 rounded-[3px] bg-primary" /> Connected
              <span className="ml-2 size-2.5 rounded-[3px] bg-primary-soft" /> Not connected
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

const CHART_HEIGHT = 72;

/** Calls per day this week: the full bar is every call, the dark part the ones that connected. Bars grow in once. */
function WeekChart({ week }: { week: Array<{ day: string; date: string; total: number; connected: number; today: boolean }> }) {
  const max = Math.max(1, ...week.map((d) => d.total));
  return (
    <div className="relative flex items-end justify-between gap-2 px-5 pt-4 pb-3" role="img"
      aria-label={`Calls per day this week: ${week.map((d) => `${d.day} ${d.total}, ${d.connected} connected`).join("; ")}`}>
      {week.every((d) => d.total === 0) ? (
        <p className="absolute inset-x-5 top-9 text-center text-small text-muted">No calls logged yet this week. Each call you log adds to today’s bar.</p>
      ) : null}
      {week.map((d, i) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5" title={`${d.day}: ${d.total} calls, ${d.connected} connected`}>
          <span className={cn("nums text-[11px] leading-3 font-semibold", d.total > 0 ? "text-text-2" : "text-transparent")}>{d.total}</span>
          <div className="flex w-full max-w-7 items-end" style={{ height: CHART_HEIGHT }}>
            <m.div
              className={cn("flex w-full flex-col justify-end overflow-hidden rounded-md", d.total === 0 ? "bg-border/70" : "bg-primary-soft", d.today && "ring-2 ring-primary/25 ring-offset-1")}
              initial={{ height: 3 }}
              animate={{ height: Math.max(3, (d.total / max) * CHART_HEIGHT) }}
              transition={{ type: "spring", stiffness: 260, damping: 30, delay: 0.15 + i * 0.04 }}
            >
              <div className="w-full rounded-md bg-primary" style={{ height: `${d.total === 0 ? 0 : (d.connected / d.total) * 100}%` }} />
            </m.div>
          </div>
          <span className={cn("text-small", d.today ? "font-semibold text-primary" : "text-text-2")}>{d.day}</span>
        </div>
      ))}
    </div>
  );
}

const STAT_TONE = { ok: "text-ok", warn: "text-warn", bad: "text-bad" } as const;
const TYPE_TEXT: Partial<Record<Tone, string>> = { warning: "text-warn", danger: "text-bad", primary: "text-primary", violet: "text-violet" };

/** One figure in the strip under the day: label, the number, and how it compares. */
function Stat({ label, value, note, tone }: { label: string; value: string | number | undefined; note?: string; tone: keyof typeof STAT_TONE }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-border px-4 py-4 not-last:border-r max-lg:nth-2:border-r-0 max-lg:nth-[-n+2]:border-b sm:px-5">
      <span className="truncate text-small font-medium text-text-2">{label}</span>
      <AnimatedValue value={value ?? "–"} className={cn("nums font-display text-[26px] leading-8 font-bold tracking-[-0.5px] text-text sm:text-display", value === undefined && "animate-pulse text-muted")} />
      {note ? <span className={cn("truncate text-small font-medium", STAT_TONE[tone])}>{note}</span> : <span className="text-small">&nbsp;</span>}
    </div>
  );
}
