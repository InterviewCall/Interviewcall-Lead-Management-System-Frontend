"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { AnimatedValue } from "@/components/motion/animated-value";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { fast } from "@/lib/motion";
import { AboutPanel } from "./about-panel";
import { ContactStageMenu } from "./contact-stage-menu";
import { useLeadDetail, useMarkLead } from "./hooks";
import { LeadTimeline } from "./lead-timeline";
import { LIFECYCLE, STAGE, TempChip } from "./lead-display";
import { canCloseWon, canMark } from "./marking";
import { MarkLostModal } from "./mark-lost-modal";
import { ScoreHistory } from "./score-history";
import { StagePath } from "./stage-path";
import type { LeadDetail, LifecycleCode, StageCode } from "./types";

type Tab = "timeline" | "details" | "score";

export function LeadDetailScreen({ id }: { id: string }) {
  const q = useLeadDetail(id);
  if (q.isPending) return <div className="py-24 text-center"><Spinner size={24} className="mx-auto text-primary" /></div>;
  if (q.isError) {
    const missing = q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 400);
    return missing ? (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-card">
        <h1 className="text-h2 font-semibold text-text">Lead not found</h1>
        <p className="max-w-sm text-body text-text-2">It may have been removed, or it is not one of the leads you can open.</p>
        <Link href="/leads" className="text-body font-medium text-primary hover:underline">Back to leads</Link>
      </div>
    ) : (
      <Alert>{errorMessage(q.error)}</Alert>
    );
  }
  return <Workspace id={id} data={q.data} />;
}

function Workspace({ id, data }: { id: string; data: LeadDetail }) {
  const { user } = useAuth();
  const toast = useToast();
  const mark = useMarkLead(id);
  const [tab, setTab] = useState<Tab>("timeline");
  const [lostOpen, setLostOpen] = useState(false);
  const [winTarget, setWinTarget] = useState(false);
  const { lead, opportunity, events, scoreEntries, vsl } = data;
  const role = user?.role ?? "OPS";
  const editable = canMark(role);
  const busy = mark.contactStage.isPending || mark.moveStage.isPending || mark.lose.isPending || mark.reopen.isPending;
  const soon = (what: string) => toast.show(`${what} arrives with the calls and tasks step. Everything you see here is real.`, "info");
  const digits = lead.phone?.replace(/\D/g, "") ?? "";

  const fail = (e: unknown) => toast.show(errorMessage(e), "error");

  function changeContactStage(to: LifecycleCode) {
    const from = lead.lifecycle;
    mark.contactStage.mutate(to, {
      onSuccess: () => toast.show(`Contact stage is now ${LIFECYCLE[to].label}`, "success", { label: "Undo", onClick: () => mark.contactStage.mutate(from, { onError: fail }) }),
      onError: fail,
    });
  }

  function moveTo(stage: StageCode) {
    if (stage === "CLOSED_WON") return setWinTarget(true);
    const from = opportunity?.stage;
    mark.moveStage.mutate(stage, {
      onSuccess: () => toast.show(`Moved to ${STAGE[stage].label}`, "success", from ? { label: "Undo", onClick: () => mark.moveStage.mutate(from, { onError: fail }) } : undefined),
      onError: fail,
    });
  }

  const lost = opportunity?.status === "LOST";
  return (
    <div className="flex min-h-0 flex-col gap-4 lg:h-full">
      {/* ---- the header stays put; only the panes below it scroll ---- */}
      <m.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0, transition: fast }} className="shrink-0 rounded-xl border border-border bg-surface shadow-card">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3 px-4 pt-4 sm:px-5">
          <Link href="/leads" aria-label="Back to leads" className="mt-1 hidden size-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-2 transition hover:bg-surface-alt lg:flex">
            <Icon name="back" size={16} />
          </Link>
          <Avatar name={lead.name} size={52} className="text-h2" />
          <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="min-w-0 text-h1 font-bold text-text sm:text-[22px]">{lead.name}</h1>
              <ContactStageMenu current={lead.lifecycle} role={role} editable={editable} busy={busy} onPick={changeContactStage} />
              <TempChip code={lead.temperature} />
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-alt px-2.5 text-small font-medium text-text-2 ring-1 ring-border" title="Lead score">
                <Icon name="zap" size={12} className="text-primary" />
                <AnimatedValue value={lead.score} className="tabular-nums" />
              </span>
              {lead.doNotContact ? <Badge tone="danger">Do not contact</Badge> : null}
            </div>
            <p className="flex flex-wrap gap-x-2 text-body text-text-2">
              {[lead.company, lead.domain, lead.ctc, lead.graduationYear ? `Class of ${lead.graduationYear}` : null].filter(Boolean).map((x, i, all) => (
                <span key={String(x)}>{x}{i < all.length - 1 ? <span className="pl-2 text-muted">·</span> : null}</span>
              ))}
              {!lead.company && !lead.domain && !lead.ctc && !lead.graduationYear ? <span className="text-muted">No profile details yet</span> : null}
            </p>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            {lead.phone ? (
              <a href={`tel:${lead.phone}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-cta px-3.5 text-body font-medium text-white shadow-cta transition hover:brightness-110 active:scale-[0.97]">
                <Icon name="phone" size={16} /> Call
              </a>
            ) : null}
            {digits ? (
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3.5 text-body font-medium text-text transition hover:bg-surface-alt active:scale-[0.97]">
                <Icon name="msg" size={16} /> WhatsApp
              </a>
            ) : null}
            <Button variant="secondary" icon="note" onClick={() => soon("Logging a call")}>Log call</Button>
            <Button variant="secondary" icon="plus" onClick={() => soon("Tasks")}>Task</Button>
          </div>
        </div>

        {/* ---- the opportunity path ---- */}
        <div className="px-4 pt-3 pb-3 sm:px-5">
          {opportunity ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <StagePath opportunity={opportunity} canMove={editable} canWin={canCloseWon(role)} busy={busy} onMove={moveTo} />
                </div>
                {opportunity.status === "OPEN" && editable ? (
                  <button type="button" onClick={() => setLostOpen(true)} className="hidden h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-small font-medium text-text-2 ring-1 ring-border transition hover:bg-bad-soft hover:text-bad hover:ring-transparent sm:inline-flex">
                    <Icon name="x" size={13} /> Mark lost
                  </button>
                ) : null}
              </div>
              <AnimatePresence initial={false}>
                {lost ? (
                  <m.div key="lost" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto", transition: fast }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-bad-soft px-3 py-2 text-body text-bad">
                      <Icon name="x" size={14} />
                      <span className="font-medium">Lost: {opportunity.lostReason ?? "no reason given"}</span>
                      {opportunity.lostNote ? <span className="text-bad/80">· {opportunity.lostNote}</span> : null}
                      <span className="flex-1" />
                      {editable ? <Button variant="secondary" className="h-8" icon="refresh" loading={mark.reopen.isPending} onClick={() => mark.reopen.mutate(undefined, { onSuccess: () => toast.show("Opportunity reopened at Call 1 Pending"), onError: fail })}>Reopen</Button> : null}
                    </div>
                  </m.div>
                ) : null}
              </AnimatePresence>
              {opportunity.status === "OPEN" && editable ? (
                <button type="button" onClick={() => setLostOpen(true)} className="inline-flex items-center gap-1.5 self-end rounded-md px-2 py-1 text-small font-medium text-text-2 hover:bg-bad-soft hover:text-bad sm:hidden">
                  <Icon name="x" size={13} /> Mark as lost
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-alt px-3 py-2 text-body text-text-2">
              No opportunity yet.
              <span className="flex-1" />
              {editable ? <Button variant="secondary" className="h-8" icon="plus" loading={mark.reopen.isPending} onClick={() => mark.reopen.mutate(undefined, { onSuccess: () => toast.show("Opportunity opened at Call 1 Pending"), onError: fail })}>Open opportunity</Button> : null}
            </div>
          )}
        </div>
      </m.header>

      {/* ---- on a phone the sections are tabs; from lg up the details are always on the left ---- */}
      <div className="lg:hidden">
        <Segmented ariaLabel="Lead sections" value={tab} onChange={setTab} options={[{ value: "timeline", label: "Timeline" }, { value: "details", label: "Details" }, { value: "score", label: "Score" }]} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <m.aside initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { ...fast, delay: 0.05 } }} className={cn("thin-scroll lg:w-[320px] lg:shrink-0 lg:overflow-y-auto lg:overscroll-contain xl:w-[340px]", tab === "details" ? "block" : "hidden lg:block")}>
          <AboutPanel lead={lead} vsl={vsl} />
        </m.aside>

        <m.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { ...fast, delay: 0.1 } }} className={cn("flex min-w-0 flex-1 flex-col lg:min-h-0", tab === "details" ? "hidden lg:flex" : "flex")}>
          <div className="mb-3 hidden items-center gap-3 lg:flex">
            <Segmented ariaLabel="Activity" value={tab === "score" ? "score" : "timeline"} onChange={setTab} options={[{ value: "timeline", label: "Timeline", count: events.length }, { value: "score", label: "Score history" }]} />
          </div>
          <div className="thin-scroll lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <AnimatePresence mode="wait" initial={false}>
              {tab === "score" ? (
                <m.div key="score" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: fast }} exit={{ opacity: 0, transition: { duration: 0.08 } }}>
                  <ScoreHistory score={lead.score} entries={scoreEntries} />
                </m.div>
              ) : (
                <m.div key="timeline" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: fast }} exit={{ opacity: 0, transition: { duration: 0.08 } }}>
                  <LeadTimeline events={events} />
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </m.section>
      </div>

      {/* ---- phone: actions stay in reach ---- */}
      <div aria-hidden className="h-[72px] lg:hidden" />
      <div className="fixed inset-x-0 bottom-[72px] z-20 flex gap-2 border-t border-border bg-surface px-4 py-3 lg:hidden">
        {lead.phone ? (
          <a href={`tel:${lead.phone}`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-cta px-3.5 text-body font-medium text-white shadow-cta active:scale-[0.97]">
            <Icon name="phone" size={16} /> Call
          </a>
        ) : null}
        {digits ? (
          <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-3.5 text-body font-medium text-text active:scale-[0.97]">
            <Icon name="msg" size={16} /> WhatsApp
          </a>
        ) : null}
        <Button variant="secondary" className="h-10" icon="note" onClick={() => soon("Logging a call")} aria-label="Log call" />
      </div>

      <MarkLostModal
        open={lostOpen}
        leadName={lead.name}
        loading={mark.lose.isPending}
        error={mark.lose.isError ? errorMessage(mark.lose.error) : null}
        onClose={() => { setLostOpen(false); mark.lose.reset(); }}
        onConfirm={(input) => mark.lose.mutate(input, { onSuccess: () => { setLostOpen(false); toast.show("Marked as lost"); } })}
      />
      <ConfirmDialog
        open={winTarget}
        title="Close as won?"
        confirmLabel="Close as won"
        loading={mark.moveStage.isPending}
        onCancel={() => setWinTarget(false)}
        onConfirm={() => mark.moveStage.mutate("CLOSED_WON", { onSuccess: () => { setWinTarget(false); toast.show(`${lead.name} is now Enrolled`); }, onError: (e) => { setWinTarget(false); fail(e); } })}
      >
        Only do this after payment or financing is complete. The opportunity closes as won, the contact stage becomes Enrolled, and all pre-sales communication stops. Only a manager can move an enrolled lead back.
      </ConfirmDialog>
    </div>
  );
}
