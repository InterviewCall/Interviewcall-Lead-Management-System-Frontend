"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import type { LeadEvent } from "@/mock/lead-detail";
import { STAGES, TEMP_TONE, type MockLead } from "@/mock/types";
import { useLeadDetail, useMarkLost, useMoveStage } from "./hooks";
import { LifecycleBadge, StageBadge } from "./lead-bits";
import { LogCallModal } from "./log-call-modal";

type Tab = "timeline" | "details" | "tasks";
type Filter = "all" | "calls" | "system";

const DOT: Record<LeadEvent["tone"], string> = {
  info: "bg-info-soft text-info", primary: "bg-primary-soft text-primary", warning: "bg-warn-soft text-warn",
  success: "bg-ok-soft text-ok", violet: "bg-violet-soft text-violet", danger: "bg-bad-soft text-bad",
  neutral: "bg-border text-text-2", plain: "bg-border text-text-2",
};
const DOT_ICON: Record<LeadEvent["tone"], "phone" | "user" | "calendar" | "form" | "target" | "info"> = {
  info: "phone", primary: "user", warning: "calendar", success: "form", violet: "target", danger: "info", neutral: "info", plain: "info",
};

export function LeadDetailScreen({ id }: { id: string }) {
  const q = useLeadDetail(id);
  const [tab, setTab] = useState<Tab>("timeline");
  const [logOpen, setLogOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);

  if (q.isPending) return <div className="py-24 text-center"><Spinner size={24} className="mx-auto text-primary" /></div>;
  if (q.isError) return <Alert>{errorMessage(q.error)}</Alert>;
  if (!q.data) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-card">
        <h1 className="text-h2 font-semibold text-text">Lead not found</h1>
        <Link href="/leads" className="text-body font-medium text-primary hover:underline">Back to leads</Link>
      </div>
    );
  }
  const { lead, detail } = q.data;
  const open = (t: Tab) => (tab === t ? "block" : "hidden xl:block");

  return (
    <>
      <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-body lg:flex">
        <Link href="/leads" className="text-text-2 hover:text-text">Leads</Link>
        <Icon name="right" size={14} className="text-muted" />
        <span className="text-text">{lead.name}</span>
      </nav>

      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={lead.name} size={64} className="text-h1" />
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-h1 font-bold text-text sm:text-display">{lead.name}</h1>
              <LifecycleBadge lead={lead} />
              <Badge tone={TEMP_TONE[lead.temperature]}>{lead.temperature} · score {detail.score}</Badge>
              <StageBadge lead={lead} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-body text-text-2">{detail.headline.map((h) => <span key={h}>{h}</span>)}</div>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="cta" className="h-10" icon="phone" onClick={() => setLogOpen(true)}>Log call</Button>
            <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3.5 text-body font-medium text-text hover:bg-surface-alt">
              <Icon name="msg" size={16} /> WhatsApp
            </a>
            <Button variant="secondary" icon="plus" onClick={() => setTab("tasks")}>Add task</Button>
          </div>
        </div>
        <dl className="grid grid-cols-1 rounded-[10px] bg-surface-alt sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Phone", lead.phone], ["Email", lead.email], ["Source", lead.source],
            ["First seen", new Date(lead.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })],
            ["Owner", lead.owner ?? "Unassigned"],
          ].map(([k, v]) => (
            <div key={k} className="flex min-w-0 flex-col gap-0.5 px-4 py-3">
              <dt className="text-small text-muted">{k}</dt>
              <dd className="truncate text-body text-text">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="xl:hidden">
        <Segmented ariaLabel="Lead sections" value={tab} onChange={setTab}
          options={[{ value: "timeline", label: "Timeline" }, { value: "details", label: "Details" }, { value: "tasks", label: "Tasks" }]} />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className={cn("flex w-full flex-col gap-5 xl:w-[280px] xl:shrink-0", open("details"))}>
          <Card>
            <CardHeader title="Profile" />
            <div className="flex flex-col gap-3.5 p-5">
              {detail.profile.map((p) => (
                <div key={p.label} className="flex flex-col gap-0.5"><span className="text-small text-muted">{p.label}</span><span className="text-body text-text">{p.value}</span></div>
              ))}
            </div>
          </Card>
          {detail.vsl.length > 0 ? (
            <Card>
              <CardHeader title="VSL form answers" subtitle={detail.vslWhen} actions={<Badge tone={TEMP_TONE[lead.temperature]}>{lead.temperature}</Badge>} />
              <div className="flex flex-col gap-3.5 p-5">
                {detail.vsl.map((a) => (
                  <div key={a.q} className="flex flex-col gap-0.5"><span className="text-small text-muted">{a.q}</span><span className="text-body text-text">{a.a}</span></div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className={cn("min-w-0 flex-1", open("timeline"))}>
          <Timeline lead={lead} events={detail.events} onLogCall={() => setLogOpen(true)} />
        </div>

        <div className={cn("flex w-full flex-col gap-5 xl:w-[300px] xl:shrink-0", tab === "timeline" ? "hidden xl:flex" : "flex")}>
          <div className={cn("flex flex-col gap-5", tab === "details" ? "hidden xl:flex" : "flex")}>
            <OpportunityCard lead={lead} onLost={() => setLostOpen(true)} />
          </div>
          {detail.slot ? (
            <Card className={cn("flex-col gap-3 p-5", tab === "tasks" ? "hidden xl:flex" : "flex")}>
              <div className="flex items-center gap-3">
                <div className="flex size-[52px] shrink-0 flex-col items-center justify-center rounded-[10px] bg-warn-soft text-warn"><span className="text-body font-semibold">{detail.slot.time}</span><span className="text-small">{detail.slot.meridiem}</span></div>
                <div className="flex min-w-0 flex-col gap-0.5"><span className="text-body font-medium text-text">{detail.slot.title}</span><span className="text-small text-text-2">{detail.slot.sub}</span></div>
              </div>
              <Link href="/assignment" className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border-strong text-small font-medium text-text hover:bg-surface-alt"><Icon name="swap" size={16} /> Reassign this call</Link>
            </Card>
          ) : null}
          <Card className={tab === "details" ? "hidden xl:block" : "block"}>
            <CardHeader title="Open tasks" actions={detail.tasks.length ? <Badge tone="warning">{detail.tasks.length} due</Badge> : null} />
            {detail.tasks.length === 0 ? <p className="px-5 py-6 text-body text-text-2">No open tasks.</p> : detail.tasks.map((t) => <TaskRow key={t.id} title={t.title} due={t.due} />)}
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[72px] z-20 flex gap-3 border-t border-border bg-surface px-4 py-3 lg:hidden">
        <Button variant="secondary" className="flex-1" icon="plus" onClick={() => setTab("tasks")}>Add task</Button>
        <Button variant="cta" className="flex-1" icon="phone" onClick={() => setLogOpen(true)}>Log call</Button>
      </div>

      <LogCallModal lead={lead} open={logOpen} onClose={() => setLogOpen(false)} />
      <LostModal lead={lead} open={lostOpen} onClose={() => setLostOpen(false)} />
    </>
  );
}

function TaskRow({ title, due }: { title: string; due: string }) {
  const [done, setDone] = useState(false);
  return (
    <label className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
      <input type="checkbox" checked={done} onChange={() => setDone((v) => !v)} className="size-[18px] accent-primary" />
      <span className={cn("flex min-w-0 flex-col gap-0.5", done && "opacity-50")}>
        <span className={cn("text-body text-text", done && "line-through")}>{title}</span>
        <span className="text-small text-text-2">{due}</span>
      </span>
    </label>
  );
}

function Timeline({ lead, events, onLogCall }: { lead: MockLead; events: LeadEvent[]; onLogCall: () => void }) {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [mode, setMode] = useState<"Call" | "WhatsApp" | "Note">("Call");
  const shown = events.filter((e) => filter === "all" || (filter === "calls" ? e.kind === "call" : e.kind === "system"));
  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-5">
        <div className="flex gap-1.5">
          {(["Call", "WhatsApp", "Note"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
              className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 text-small font-medium", mode === m ? "bg-primary-soft text-primary" : "text-text-2 hover:bg-surface-alt")}>
              <Icon name={m === "Call" ? "phone" : m === "WhatsApp" ? "msg" : "note"} size={14} />{m}
            </button>
          ))}
        </div>
        <button type="button" onClick={mode === "Call" ? onLogCall : () => toast.show(`${mode} logging arrives with the leads API.`, "info")}
          className="flex h-16 items-start rounded-lg bg-surface-alt p-3 text-left text-body text-muted hover:bg-border/60">
          {mode === "Call" ? "Add notes about this call…" : mode === "WhatsApp" ? "Log a WhatsApp message…" : "Write a note…"}
        </button>
        <p className="text-small text-muted">Logging a call for {lead.name} opens the call form.</p>
      </div>
      <div className="flex items-center gap-2 px-5 py-3.5">
        <h2 className="flex-1 text-body font-semibold text-text">Timeline</h2>
        {(["all", "calls", "system"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={cn("h-[26px] rounded-md px-2.5 text-small font-medium capitalize", filter === f ? "bg-bg text-text" : "text-text-2")}>{f}</button>
        ))}
      </div>
      <ol className="flex flex-col px-5 pb-5">
        {shown.map((e, i) => (
          <li key={e.id} className={cn("flex gap-3.5", i < shown.length - 1 && "pb-[18px]")}>
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", DOT[e.tone])}><Icon name={DOT_ICON[e.tone]} size={14} /></span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body text-text">{e.title}</span>
              <span className="text-small text-text-2">{e.sub}</span>
              {e.detail ? <p className="mt-1.5 max-w-[300px] rounded-lg bg-surface-alt p-2.5 text-small text-text-2">{e.detail}</p> : null}
            </div>
            <span className="shrink-0 text-small whitespace-nowrap text-muted">{e.when}</span>
          </li>
        ))}
        {shown.length === 0 ? <li className="py-8 text-center text-body text-text-2">Nothing here yet.</li> : null}
      </ol>
    </Card>
  );
}

function OpportunityCard({ lead, onLost }: { lead: MockLead; onLost: () => void }) {
  const toast = useToast();
  const move = useMoveStage();
  const current = STAGES.indexOf(lead.stage);
  const next = STAGES[current + 1];
  const lost = lead.lifecycle === "Lost";
  return (
    <Card>
      <CardHeader title="Opportunity" actions={<Badge tone={lost ? "danger" : "success"}>{lost ? "Lost" : "Open"}</Badge>} />
      <ol className="flex flex-col p-5">
        {STAGES.map((s, i) => {
          const isCurrent = i === current;
          return (
            <li key={s} className="flex h-[34px] items-center gap-3">
              <span className={cn("flex size-[18px] shrink-0 items-center justify-center rounded-full border", i <= current ? "border-primary" : "border-border-strong")}>
                {isCurrent ? <span className="size-1.5 rounded-full bg-primary" /> : i < current ? <Icon name="check" size={10} className="text-primary" /> : null}
              </span>
              <span className={cn("flex-1 text-body", isCurrent ? "font-medium text-text" : "text-text-2")}>{s}</span>
              {isCurrent ? <Badge tone="primary">Current</Badge> : null}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2 px-5 pb-5">
        {next && !lost ? (
          <Button variant="primary" className="h-[38px]" icon="arrowR" loading={move.isPending}
            onClick={() => move.mutate({ id: lead.id, stage: next }, { onSuccess: () => toast.show(`Moved to ${next} (sample data).`), onError: (e) => toast.show(errorMessage(e), "error") })}>
            Move to {next}
          </Button>
        ) : null}
        {!lost ? <button type="button" onClick={onLost} className="h-[38px] rounded-lg text-body font-medium text-bad hover:bg-bad-soft">Mark as lost…</button> : null}
      </div>
    </Card>
  );
}

const LOST_REASONS = ["Not interested", "Cannot afford", "No response after many attempts", "Wrong number or fake lead", "Chose a competitor", "Other"];

function LostModal({ lead, open, onClose }: { lead: MockLead; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const lost = useMarkLost();
  const [reason, setReason] = useState(LOST_REASONS[0]!);
  return (
    <Modal open={open} title={`Mark ${lead.name} as lost?`} subtitle="Pick the closest reason. It feeds the “why opportunities were lost” report." onClose={onClose} width={440}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" loading={lost.isPending} onClick={() => lost.mutate({ id: lead.id, reason }, { onSuccess: () => { toast.show(`${lead.name} marked as lost (sample data).`); onClose(); } })}>Mark as lost</Button>
      </>}>
      <Select aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>{LOST_REASONS.map((r) => <option key={r}>{r}</option>)}</Select>
    </Modal>
  );
}

