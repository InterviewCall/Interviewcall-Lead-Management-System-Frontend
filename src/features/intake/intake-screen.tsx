"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { KpiCard } from "@/components/ui/kpi-card";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/roles";
import { intakeKeys, listEvents, listSources, retryEvent, runReconciliation, type EventStatus, type SourceHealth } from "./api";

type Filter = "all" | "failed" | "dead" | "processed";
const STATUS_TONE: Record<EventStatus, Tone> = { Processed: "success", Failed: "warning", Dead: "danger", Received: "info" };

function stamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });
}

export function IntakeScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const events = useQuery({ queryKey: intakeKeys.events, queryFn: listEvents });
  const sources = useQuery({ queryKey: intakeKeys.health, queryFn: listSources });
  const [filter, setFilter] = useState<Filter>("all");
  const [keysOpen, setKeysOpen] = useState(false);

  const retry = useMutation({
    mutationFn: retryEvent,
    onSuccess: () => { toast.show("Event processed."); void queryClient.invalidateQueries({ queryKey: ["intake"] }); },
    onError: (e) => toast.show(errorMessage(e), "error"),
  });
  const reconcile = useMutation({
    mutationFn: runReconciliation,
    onSuccess: (r) => toast.show(`Checked ${r.checked.toLocaleString("en-IN")} events, ${r.recovered} recovered.`),
    onError: (e) => toast.show(errorMessage(e), "error"),
  });

  const all = events.data ?? [];
  const failed = all.filter((e) => e.status === "Failed").length;
  const dead = all.filter((e) => e.status === "Dead").length;
  const shown = all.filter((e) => (filter === "failed" ? e.status === "Failed" : filter === "dead" ? e.status === "Dead" : filter === "processed" ? e.status === "Processed" : true));
  const retrying = retry.isPending ? retry.variables : null;

  return (
    <>
      <PageHeader
        title="Intake monitor"
        subtitle="Events arriving from WorkR and the VSL services. Failed events can be retried here."
        actions={
          <>
            <Button variant="secondary" icon="refresh" loading={reconcile.isPending} onClick={() => reconcile.mutate()}>Run reconciliation</Button>
            <Button variant="secondary" icon="key" onClick={() => setKeysOpen(true)}>Source keys</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Received today" value="1,284" icon="download" tone="primary" hint="+9% vs yesterday" />
        <KpiCard label="Processed" value="1,279" icon="check" tone="success" hint="99.6%" />
        <KpiCard label="Failed, will retry" value={failed} icon="clock" tone="warning" hint="next retry in 4 min" loading={events.isPending} />
        <KpiCard label="Dead, needs review" value={dead} icon="warn" tone="danger" hint="open them below" loading={events.isPending} />
      </div>

      {sources.isError ? <Alert>{errorMessage(sources.error)}</Alert> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {sources.isPending ? <Card className="p-10 lg:col-span-3"><Spinner className="mx-auto text-primary" /></Card> : sources.data.map((s) => <SourceCard key={s.id} source={s} />)}
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
              options={[{ value: "all", label: "All" }, { value: "failed", label: "Failed", count: failed }, { value: "dead", label: "Dead", count: dead }, { value: "processed", label: "Processed" }]}
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
                  <tr><td colSpan={7} className="py-14 text-center text-body text-text-2">No events here.</td></tr>
                ) : shown.map((e) => (
                  <tr key={e.id} className="h-[52px] border-b border-border last:border-b-0">
                    <td className="px-4 text-small whitespace-nowrap text-text-2">{stamp(e.at)}</td>
                    <td className="px-4 text-body whitespace-nowrap text-text">{e.source}</td>
                    <td className="px-4"><code className="rounded bg-bg px-1.5 py-0.5 text-small text-text">{e.event}</code></td>
                    <td className="px-4"><Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge></td>
                    <td className="px-4 text-body text-text-2">{e.tries}</td>
                    <td className={cn("px-4 text-body", e.status === "Failed" || e.status === "Dead" ? "text-bad" : "text-text")}>{e.detail}</td>
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

      <p className="text-small text-muted">Intake figures are sample data until the intake API is connected.</p>
      <KeysModal open={keysOpen} onClose={() => setKeysOpen(false)} sources={sources.data ?? []} />
    </>
  );
}

function SourceCard({ source }: { source: SourceHealth }) {
  const max = Math.max(1, ...source.spark);
  const points = source.spark.map((v, i) => `${(i / (source.spark.length - 1)) * 100},${28 - (v / max) * 26}`).join(" ");
  const quiet = source.status === "Quiet";
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-body font-semibold text-text">{source.name}</h2>
          <p className="truncate text-small text-text-2">{source.events}</p>
        </div>
        <Badge tone={quiet ? "warning" : "success"}>{quiet ? `Quiet ${source.lastEvent.replace(" ago", "")}` : "Healthy"}</Badge>
      </div>
      <dl className="flex flex-col gap-1.5 text-small">
        <div className="flex gap-3"><dt className="w-[90px] shrink-0 text-muted">Last event</dt><dd className="text-text">{source.lastEvent}</dd></div>
        <div className="flex gap-3"><dt className="w-[90px] shrink-0 text-muted">Nightly check</dt><dd className="text-text">{source.nightly}</dd></div>
      </dl>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" role="img" aria-label={`Events per hour, last 12 hours, for ${source.name}`}>
        <polyline points={points} fill="none" stroke={quiet ? "#d97706" : "#4f46e5"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </Card>
  );
}

function KeysModal({ open, onClose, sources }: { open: boolean; onClose: () => void; sources: SourceHealth[] }) {
  return (
    <Modal open={open} title="Source keys" subtitle="Each sender signs its events with its own key" onClose={onClose} width={520} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="flex flex-col gap-3">
        <ul className="divide-y divide-border rounded-lg border border-border">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-body font-medium text-text">{s.name}</span>
              <span className="text-small text-muted">Managed on the server</span>
            </li>
          ))}
        </ul>
        <Alert tone="info" className="text-small">Keys are set in the intake service&apos;s environment and are never shown here. Viewing and rotating them from this screen needs the intake API.</Alert>
      </div>
    </Modal>
  );
}
