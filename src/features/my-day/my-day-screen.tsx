"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/cn";
import { getMyDay } from "./api";

type Tab = "all" | "calls" | "overdue";

function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function MyDayScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const day = useQuery({ queryKey: ["my-day"], queryFn: getMyDay });
  const [tab, setTab] = useState<Tab>("all");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const now = new Date();
  const first = user?.name.split(" ")[0] ?? "there";
  const data = day.data;

  const followUps = (data?.followUps ?? []).filter((f) => (tab === "all" ? true : tab === "calls" ? f.kind === "call" : f.overdue));

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl bg-cta p-6 text-white shadow-[0_12px_28px_-8px_rgba(79,69,229,0.3)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-[340px] rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute right-24 -bottom-20 size-[220px] rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1.5">
            <p className="text-small text-white/80">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="text-display font-bold">{greeting(now)}, {first}</h1>
            <p className="text-body text-white/90">
              {data ? `${data.kpis.due} follow-ups are due today and ${data.kpis.unassigned} booked calls are still waiting for an owner.` : "Loading your day…"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/assignment" className="flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-body font-medium text-primary">
              <Icon name="shuffle" size={16} /> Assign booked calls
            </Link>
            <Link href="/leads" className="flex h-10 items-center rounded-[10px] border border-white/70 px-4 text-body font-medium text-white hover:bg-white/10">Open my queue</Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Follow-ups due today" value={data?.kpis.due} icon="clock" chip="bg-warn-soft text-warn" note={data ? `${data.kpis.overdue} overdue` : undefined} noteClass="text-bad" />
        <Kpi label="Booked calls today" value={data?.kpis.booked} icon="calendar" chip="bg-info-soft text-info" note={data ? `${data.kpis.unassigned} unassigned` : undefined} noteClass="text-warn" />
        <Kpi label="New leads today" value={data?.kpis.newToday} icon="users" chip="bg-primary-soft text-primary" note={data?.kpis.newDelta} noteClass="text-ok" />
        <Kpi label="Connect rate (7 days)" value={data?.kpis.connect} icon="phone" chip="bg-ok-soft text-ok" note={data?.kpis.connectDelta} noteClass="text-ok" />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <Card className="min-w-0 flex-1">
          <CardHeader
            title="Today’s follow-ups"
            subtitle="Sorted by priority, then due time"
            actions={
              <Segmented ariaLabel="Filter follow-ups" value={tab} onChange={setTab}
                options={[{ value: "all", label: "All" }, { value: "calls", label: "Calls" }, { value: "overdue", label: "Overdue" }]} />
            }
          />
          {day.isPending ? (
            <div className="py-14 text-center"><Spinner className="mx-auto text-primary" /></div>
          ) : followUps.length === 0 ? (
            <p className="py-14 text-center text-body text-text-2">Nothing here. Nice.</p>
          ) : (
            <ul>
              {followUps.map((f) => {
                const isDone = done.has(f.id);
                return (
                  <li key={f.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-border px-5 py-3.5">
                    <input
                      type="checkbox"
                      aria-label={`Mark ${f.name} follow-up done`}
                      checked={isDone}
                      onChange={() => setDone((s) => { const n = new Set(s); if (n.has(f.id)) n.delete(f.id); else n.add(f.id); return n; })}
                      className="size-[18px] accent-primary"
                    />
                    <Avatar name={f.name} size={36} />
                    <Link href={`/leads/${f.leadId}`} className={cn("flex min-w-0 flex-1 basis-44 flex-col gap-0.5", isDone && "opacity-50")}>
                      <span className={cn("truncate text-body font-medium text-text", isDone && "line-through")}>{f.name}</span>
                      <span className="truncate text-small text-text-2">{f.note}</span>
                    </Link>
                    <Badge tone={f.badge.tone}>{f.badge.label}</Badge>
                    <span className={cn("flex w-[150px] items-center justify-end gap-1.5 text-small font-medium", f.overdue ? "text-bad" : "text-text-2")}>
                      <Icon name="clock" size={14} /> {f.due}
                    </span>
                    <Link href={`/leads/${f.leadId}`} aria-label={`Call ${f.name}`} className="flex size-[34px] items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Icon name="phone" size={16} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/leads" className="flex h-12 items-center justify-center gap-1.5 text-body font-medium text-primary">
            View all {data?.kpis.due ?? ""} follow-ups <Icon name="right" size={14} />
          </Link>
        </Card>

        <div className="flex w-full flex-col gap-5 xl:w-[380px] xl:shrink-0">
          <Card>
            <CardHeader title="Booked calls" subtitle="VSL slots for today"
              actions={data ? <Badge tone="warning">{data.booked.filter((b) => !b.owner && !assigned[b.id]).length} need an owner</Badge> : null} />
            {(data?.booked ?? []).map((b) => {
              const owner = b.owner ?? assigned[b.id] ?? null;
              return (
                <div key={b.id} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
                  <div className={cn("flex h-12 w-[52px] shrink-0 flex-col items-center justify-center rounded-[10px]", owner ? "bg-info-soft text-info" : "bg-warn-soft text-warn")}>
                    <span className="text-body font-semibold">{b.hour}</span>
                    <span className="text-small">{b.meridiem}</span>
                  </div>
                  <Link href={`/leads/${b.leadId}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-body font-medium text-text">{b.name}</span>
                    <span className="truncate text-small text-text-2">{b.detail}</span>
                  </Link>
                  {owner ? (
                    <span title={owner}><Avatar name={owner} size={28} /></span>
                  ) : (
                    <button type="button" onClick={() => { setAssigned((a) => ({ ...a, [b.id]: user?.name ?? "Me" })); toast.show(`${b.name} assigned to you (sample data).`); }}
                      className="h-[30px] rounded-md bg-cta px-3 text-small font-medium text-white shadow-cta">Assign</button>
                  )}
                </div>
              );
            })}
          </Card>

          <Card>
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h2 className="text-body font-semibold text-text">Calls this week</h2>
                <p className="text-small text-text-2">Team total · all BDAs</p>
              </div>
              <span className="text-h1 font-semibold text-text">{data?.weekTotal ?? "–"}</span>
            </div>
            <div className="flex h-[170px] items-end justify-center gap-3.5 p-5" role="img" aria-label="Calls per day this week, connected and not connected">
              {(data?.week ?? []).map((d) => (
                <div key={d.day} className="flex flex-col items-center justify-end gap-1.5">
                  <div className="flex w-7 flex-col justify-end rounded-md bg-primary-soft" style={{ height: d.total * 0.75 }}>
                    <div className="w-7 rounded-md bg-primary" style={{ height: d.connected * 0.75 }} />
                  </div>
                  <span className="text-small text-text-2">{d.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-5 pb-4 text-small text-text-2">
              <span className="size-2.5 rounded-[3px] bg-primary" /> Connected
              <span className="ml-2 size-2.5 rounded-[3px] bg-primary-soft" /> Not connected
            </div>
          </Card>
        </div>
      </div>
      <p className="text-small text-muted">Numbers on this screen are sample data until the leads and call-log APIs are connected.</p>
    </>
  );
}

function Kpi({ label, value, icon, chip, note, noteClass }: { label: string; value: string | number | undefined; icon: "clock" | "calendar" | "users" | "phone"; chip: string; note?: string; noteClass: string }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-[10px]", chip)}><Icon name={icon} size={20} /></span>
        <span className="text-body font-medium text-text-2">{label}</span>
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="text-display font-bold text-text">{value ?? "–"}</span>
        {note ? <span className={cn("text-small font-medium", noteClass)}>{note}</span> : null}
      </div>
    </div>
  );
}
