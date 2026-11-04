"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { KpiCard } from "@/components/ui/kpi-card";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber, relativeTime } from "@/lib/format";
import type { Tone } from "@/lib/roles";
import {
  createSourceKey, fetchSummary, intakeKeys, KEY_HEADER, listEvents, listSourceKeys, retryEvent, revokeSourceKey, SYSTEM_LABEL,
  type EventFilter, type EventStatus, type SourceHealth, type SourceSystem,
} from "./api";

const STATUS_TONE: Record<EventStatus, Tone> = { Processed: "success", Failed: "warning", Dead: "danger", Received: "info" };

function stamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });
}

export function IntakeScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<EventFilter>("all");
  const [keysOpen, setKeysOpen] = useState(false);
  const events = useQuery({ queryKey: intakeKeys.events(filter), queryFn: () => listEvents(filter), refetchInterval: 15_000, placeholderData: keepPreviousData });
  const summary = useQuery({ queryKey: intakeKeys.summary, queryFn: fetchSummary, refetchInterval: 15_000 });

  const retry = useMutation({
    mutationFn: retryEvent,
    onSuccess: () => { toast.show("Queued again. It will be processed in a moment."); void queryClient.invalidateQueries({ queryKey: ["intake"] }); },
    onError: (e) => toast.show(errorMessage(e), "error"),
  });

  const s = summary.data;
  const shown = events.data ?? [];
  const retrying = retry.isPending ? retry.variables : null;
  const share = s && s.received > 0 ? `${Math.round((s.processed / s.received) * 100)}% of today` : "Nothing yet today";

  return (
    <>
      <PageHeader
        title="Intake monitor"
        subtitle="Leads arriving from the VSL: people who gave their details, filled the form or booked a call. Failed events are retried automatically; dead ones can be retried here."
        actions={user?.role === "ADMIN" ? <Button variant="secondary" icon="key" onClick={() => setKeysOpen(true)}>Source keys</Button> : null}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Received today" value={s ? formatNumber(s.received) : "–"} icon="download" tone="primary" hint={s ? `${formatNumber(s.created)} new ${s.created === 1 ? "lead" : "leads"}` : undefined} loading={summary.isPending} />
        <KpiCard label="Processed" value={s ? formatNumber(s.processed) : "–"} icon="check" tone="success" hint={share} loading={summary.isPending} />
        <KpiCard label="Failed, will retry" value={s ? formatNumber(s.failed) : "–"} icon="clock" tone="warning" hint={s && s.failed > 0 ? "retried automatically" : "all clear"} loading={summary.isPending} />
        <KpiCard label="Dead, needs review" value={s ? formatNumber(s.dead) : "–"} icon="warn" tone="danger" hint={s && s.dead > 0 ? "open them below" : "all clear"} loading={summary.isPending} />
      </div>

      {summary.isError ? <Alert>{errorMessage(summary.error)}</Alert> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {summary.isPending ? <Card className="p-10 lg:col-span-2"><Spinner className="mx-auto text-primary" /></Card> : summary.data.sources.filter((src) => src.id !== "WORKR" || src.status !== "Never").map((src) => <SourceCard key={src.id} source={src} />)}
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          title="Recent events"
          subtitle="Newest first · payloads are removed 30 days after processing"
          actions={
            <Segmented
              ariaLabel="Event status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "failed", label: "Failed", count: s?.failed },
                { value: "dead", label: "Dead", count: s?.dead },
                { value: "processed", label: "Processed" },
              ]}
            />
          }
        />
        {events.isError ? (
          <div className="p-5"><Alert>{errorMessage(events.error)}</Alert></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="h-10 border-b border-border bg-surface-alt">
                  {["Received", "Source", "Event", "Status", "Tries", "Lead / error"].map((h) => (
                    <th key={h} className="px-4 text-cap font-semibold tracking-[0.5px] text-text-2 uppercase">{h}</th>
                  ))}
                  <th className="w-24" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {events.isPending ? (
                  <tr><td colSpan={7} className="py-14 text-center"><Spinner className="mx-auto text-primary" /></td></tr>
                ) : shown.length === 0 ? (
                  <tr><td colSpan={7} className="py-14 text-center text-body text-text-2">{filter === "all" ? "Nothing has arrived yet. Events show up here as soon as a sender calls the intake API." : "No events here."}</td></tr>
                ) : shown.map((e) => (
                  <tr key={e.id} className="h-[52px] border-b border-border last:border-b-0">
                    <td className="px-4 text-small whitespace-nowrap text-text-2">{stamp(e.at)}</td>
                    <td className="px-4 text-body whitespace-nowrap text-text">{e.source}</td>
                    <td className="px-4"><code className="rounded bg-bg px-1.5 py-0.5 text-small text-text">{e.event}</code></td>
                    <td className="px-4"><Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge></td>
                    <td className="px-4 text-body text-text-2">{e.tries}</td>
                    <td className={cn("max-w-[360px] truncate px-4 text-body", e.status === "Failed" || e.status === "Dead" ? "text-bad" : "text-text")} title={e.detail}>
                      {e.leadId ? <Link href={`/leads/${e.leadId}`} className="font-medium text-primary hover:underline">{e.detail}</Link> : e.detail}
                    </td>
                    <td className="px-4 text-right">
                      {e.status === "Failed" || e.status === "Dead" ? (
                        <button type="button" disabled={retrying === e.id} onClick={() => retry.mutate(e.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2.5 text-small font-medium text-text hover:bg-surface-alt disabled:opacity-60">
                          {retrying === e.id ? <Spinner size={14} /> : <Icon name="refresh" size={14} />} Retry
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {keysOpen ? <KeysModal onClose={() => setKeysOpen(false)} /> : null}
    </>
  );
}

function SourceCard({ source }: { source: SourceHealth }) {
  const max = Math.max(1, ...source.spark);
  const points = source.spark.map((v, i) => `${(i / Math.max(1, source.spark.length - 1)) * 100},${28 - (v / max) * 26}`).join(" ");
  const tone: Tone = source.status === "Healthy" ? "success" : source.status === "Quiet" ? "warning" : "neutral";
  const label = source.status === "Never" ? "No events yet" : source.status === "Quiet" ? `Quiet · ${relativeTime(source.lastEvent).replace(" ago", "")}` : "Healthy";
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-body font-semibold text-text">{source.name}</h2>
          <p className="truncate text-small text-text-2">{source.events}</p>
        </div>
        <Badge tone={tone}>{label}</Badge>
      </div>
      <dl className="flex flex-col gap-1.5 text-small">
        <div className="flex gap-3"><dt className="w-[90px] shrink-0 text-muted">Last event</dt><dd className="text-text">{relativeTime(source.lastEvent)}</dd></div>
        <div className="flex gap-3"><dt className="w-[90px] shrink-0 text-muted">Today</dt><dd className="text-text">{formatNumber(source.today)} {source.today === 1 ? "event" : "events"}</dd></div>
      </dl>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" role="img" aria-label={`Events per hour, last 12 hours, for ${source.name}`}>
        <m.polyline points={points} fill="none" stroke={source.status === "Quiet" ? "#d97706" : "#4f46e5"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
    </Card>
  );
}

function KeysModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const keys = useQuery({ queryKey: intakeKeys.sourceKeys, queryFn: listSourceKeys });
  const [name, setName] = useState("");
  const [system, setSystem] = useState<SourceSystem>("VSL_FORM");
  const [fresh, setFresh] = useState<{ key: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: intakeKeys.sourceKeys });

  const create = useMutation({
    mutationFn: createSourceKey,
    onSuccess: (r) => { setFresh({ key: r.key, name: r.sourceKey.name }); setName(""); setCopied(false); refresh(); },
  });
  const revoke = useMutation({
    mutationFn: revokeSourceKey,
    onSuccess: () => { setConfirming(null); toast.show("Key revoked. The sender can no longer use it."); refresh(); },
    onError: (e) => toast.show(errorMessage(e), "error"),
  });

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      toast.show("Could not copy. Select the key and copy it by hand.", "error");
    }
  }

  return (
    <Modal open title="Source keys" subtitle="Each sender service signs its events with its own key" onClose={onClose} width={580} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="flex flex-col gap-4">
        {fresh ? (
          <div className="flex flex-col gap-2 rounded-lg border border-ok/30 bg-ok-soft p-3.5">
            <p className="text-body font-semibold text-ok">Key “{fresh.name}” created. Copy it now.</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 rounded-md bg-surface px-2.5 py-2 text-small break-all text-text">{fresh.key}</code>
              <Button variant="secondary" icon={copied ? "check" : "copy"} onClick={() => void copy(fresh.key)}>{copied ? "Copied" : "Copy"}</Button>
            </div>
            <p className="text-small text-text-2">This is the only time it is shown; the CRM keeps just a fingerprint. The sender sends it in the <code className="rounded bg-surface px-1 text-text">{KEY_HEADER}</code> header. If it is lost, make a new key and revoke this one.</p>
          </div>
        ) : null}

        {keys.isError ? <Alert>{errorMessage(keys.error)}</Alert> : keys.isPending ? <Spinner className="mx-auto text-primary" /> : keys.data.length === 0 ? (
          <p className="text-body text-text-2">No keys yet. Make one below for each service that should send events.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {keys.data.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <div className="flex min-w-0 flex-1 basis-48 flex-col">
                  <span className="truncate text-body font-medium text-text">{k.name}</span>
                  <span className="truncate text-small text-text-2">{SYSTEM_LABEL[k.system]} · <code>{k.prefix}…</code> · {k.active ? `used ${relativeTime(k.lastUsedAt).toLowerCase()}` : "revoked"}</span>
                </div>
                {!k.active ? <Badge>Revoked</Badge> : confirming === k.id ? (
                  <span className="flex items-center gap-2">
                    <Button variant="danger" loading={revoke.isPending} onClick={() => revoke.mutate(k.id)}>Revoke now</Button>
                    <Button variant="ghost" onClick={() => setConfirming(null)}>Keep</Button>
                  </span>
                ) : (
                  <Button variant="secondary" onClick={() => setConfirming(k.id)}>Revoke</Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form className="flex flex-col gap-2.5 border-t border-border pt-4" onSubmit={(e) => { e.preventDefault(); create.mutate({ name, system }); }}>
          <h3 className="text-body font-semibold text-text">Make a new key</h3>
          <div className="flex flex-wrap gap-2">
            <TextInput className="min-w-44 flex-1" value={name} onChange={(e) => { setName(e.target.value); create.reset(); }} placeholder="Name, e.g. VSL form service" aria-label="Key name" maxLength={60} />
            <Select className="w-52" value={system} onChange={(e) => setSystem(e.target.value as SourceSystem)} aria-label="Service">
              {(Object.keys(SYSTEM_LABEL) as SourceSystem[]).filter((s) => s !== "WORKR").map((s) => <option key={s} value={s}>{SYSTEM_LABEL[s]}</option>)}
            </Select>
            <Button type="submit" icon="plus" loading={create.isPending} disabled={name.trim().length < 3}>Create</Button>
          </div>
          {create.isError ? <Alert>{errorMessage(create.error)}</Alert> : null}
        </form>
      </div>
    </Modal>
  );
}
