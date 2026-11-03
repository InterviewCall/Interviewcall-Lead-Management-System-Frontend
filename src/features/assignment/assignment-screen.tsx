"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber, relativeTime } from "@/lib/format";
import type { Tone } from "@/lib/roles";
import { TEMP_TONE, type Temperature } from "@/mock/types";
import { currentCursor, planShares, VSL_DEPTHS, type QueueQuery, type QueueTab, type VslDepth, type WaitBucket } from "./api";
import { useAssign, useAssignmentHistory, useBdaLoads, useQueue } from "./hooks";

const PAGE = 8;
const DEPTH_TONE: Record<VslDepth, Tone> = { "Booked slot": "info", "Full form": "primary", Details: "violet", "Signup only": "neutral" };

export function AssignmentScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<QueueTab>("all");
  const [source, setSource] = useState("");
  const [depth, setDepth] = useState<VslDepth | "">("");
  const [temperature, setTemperature] = useState<Temperature | "">("");
  const [wait, setWait] = useState<WaitBucket>("");
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);

  const query: QueueQuery = useMemo(() => ({ tab, source, depth, temperature, wait, limit }), [tab, source, depth, temperature, wait, limit]);
  const queue = useQueue(query);
  const loads = useBdaLoads();
  const assign = useAssign();
  const data = queue.data;
  const rows = data?.items ?? [];

  const bdas = loads.data?.bdas ?? [];
  const available = bdas.filter((b) => !b.leaveUntil);
  const chosen = available.filter((b) => !excluded.has(b.name)).map((b) => b.name);
  const start = chosen.length ? currentCursor() % chosen.length : 0;
  const shares = planShares(selected.size, chosen, start);
  const lastPicked = selected.size > 0 && chosen.length > 0 ? chosen[(start + selected.size - 1) % chosen.length] : loads.data?.cursorAfter;
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.lead.id));
  const canAssign = selected.size > 0 && chosen.length > 0;

  function changeFilter<T>(set: (v: T) => void) {
    return (value: T) => {
      set(value);
      setLimit(PAGE);
      setSelected(new Set());
    };
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (!canAssign) return;
    assign.mutate(
      { leadIds: [...selected], bdas: chosen, by: user?.name ?? "You" },
      {
        onSuccess: ({ assigned }) => {
          toast.show(`${assigned} ${assigned === 1 ? "lead" : "leads"} assigned (sample data).`);
          setSelected(new Set());
        },
        onError: (e) => toast.show(errorMessage(e), "error"),
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Assignment"
        subtitle={data ? `${formatNumber(data.counts.all)} unassigned leads · ${data.counts.booked} booked calls need an owner today` : "Loading the queue…"}
        actions={
          <>
            <Button variant="secondary" icon="list" onClick={() => setHistoryOpen(true)}>Assignment history</Button>
            <Button onClick={submit} disabled={!canAssign} loading={assign.isPending}>Assign selected</Button>
          </>
        }
      />

      <div className="flex flex-col items-start gap-4 lg:flex-row">
        <Card className="min-w-0 w-full flex-1 overflow-hidden">
          <CardHeader title="Unassigned queue" subtitle="Booked calls first, then by VSL depth and temperature" />
          <div className="flex flex-col gap-3 border-b border-border p-4">
            <div role="tablist" aria-label="Queue" className="flex gap-1">
              {([["all", "All", data?.counts.all], ["booked", "Booked", data?.counts.booked], ["hot", "Hot", data?.counts.hot]] as const).map(([value, label, count]) => (
                <button
                  key={value}
                  role="tab"
                  type="button"
                  aria-selected={tab === value}
                  onClick={() => changeFilter(setTab)(value)}
                  className={cn("h-8 rounded-md px-3 text-body font-medium", tab === value ? "bg-primary-soft text-primary" : "text-text-2 hover:bg-black/5")}
                >
                  {label} {count ?? ""}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select aria-label="Source" value={source} onChange={(e) => changeFilter(setSource)(e.target.value)} className="h-9 w-auto min-w-28">
                <option value="">Source</option>
                {(data?.sources ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Select aria-label="VSL depth" value={depth} onChange={(e) => changeFilter(setDepth)(e.target.value as VslDepth | "")} className="h-9 w-auto min-w-32">
                <option value="">VSL depth</option>
                {VSL_DEPTHS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
              <Select aria-label="Temperature" value={temperature} onChange={(e) => changeFilter(setTemperature)(e.target.value as Temperature | "")} className="h-9 w-auto min-w-32">
                <option value="">Temperature</option>
                {(["Hot", "Warm", "Cold"] as const).map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Select aria-label="Waiting time" value={wait} onChange={(e) => changeFilter(setWait)(e.target.value as WaitBucket)} className="h-9 w-auto min-w-36">
                <option value="">Waiting time</option>
                <option value="lt6">Under 6 h</option>
                <option value="6to24">6 to 24 h</option>
                <option value="gt24">Over 1 day</option>
              </Select>
            </div>
          </div>

          {selected.size > 0 ? (
            <div className="flex h-11 items-center gap-3 border-b border-border bg-primary-soft px-4 text-body">
              <span className="font-medium text-primary">{selected.size} selected</span>
              {data && selected.size < data.total ? (
                <button type="button" onClick={() => setSelected(new Set(data.matchingIds))} className="font-medium text-primary underline-offset-2 hover:underline">
                  Select all {formatNumber(data.total)}
                </button>
              ) : null}
              <span className="flex-1" />
              <button type="button" onClick={() => setSelected(new Set())} className="text-small font-medium text-primary">Clear</button>
            </div>
          ) : null}

          {queue.isError ? (
            <div className="p-5"><Alert>{errorMessage(queue.error)}</Alert></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="h-10 border-b border-border bg-surface-alt">
                    <th className="w-12 px-3">
                      <input
                        type="checkbox"
                        aria-label="Select all shown"
                        checked={allVisibleSelected}
                        onChange={() => setSelected((s) => { const n = new Set(s); rows.forEach((r) => (allVisibleSelected ? n.delete(r.lead.id) : n.add(r.lead.id))); return n; })}
                        className="size-[18px] accent-primary"
                      />
                    </th>
                    {["Lead", "Source", "VSL depth", "Temp.", "Waiting"].map((h) => (
                      <th key={h} className="px-3 text-cap font-semibold tracking-[0.5px] text-text-2 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queue.isPending ? (
                    <tr><td colSpan={6} className="py-14 text-center"><Spinner className="mx-auto text-primary" /></td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} className="py-14 text-center text-body text-text-2">The queue is empty. Nothing is waiting for an owner.</td></tr>
                  ) : rows.map(({ lead, depth: d, waitingHours, subtitle }) => (
                    <tr key={lead.id} className={cn("h-[60px] border-b border-border last:border-b-0", selected.has(lead.id) && "bg-primary-soft/60")}>
                      <td className="px-3"><input type="checkbox" aria-label={`Select ${lead.name}`} checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} className="size-[18px] accent-primary" /></td>
                      <td className="px-3">
                        <span className="flex flex-col">
                          <span className="text-body font-medium text-text">{lead.name}</span>
                          <span className={cn("text-small", d === "Booked slot" ? "text-info" : "text-text-2")}>{subtitle}</span>
                        </span>
                      </td>
                      <td className="px-3 text-body whitespace-nowrap text-text-2">{lead.source}</td>
                      <td className="px-3"><Badge tone={DEPTH_TONE[d]}>{d}</Badge></td>
                      <td className="px-3"><Badge tone={TEMP_TONE[lead.temperature]}>{lead.temperature}</Badge></td>
                      <td className={cn("px-3 text-body whitespace-nowrap", waitingHours >= 24 ? "font-medium text-warn" : "text-text-2")}>
                        {waitingHours >= 24 ? `${Math.floor(waitingHours / 24)} d` : `${waitingHours} h`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-small text-text-2">{data ? `Showing ${rows.length} of ${formatNumber(data.total)} unassigned leads` : ""}</p>
            {data && rows.length < data.total ? (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="text-body font-medium text-primary hover:underline">Load more</button>
            ) : null}
          </div>
        </Card>

        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[400px]">
          <Card>
            <div className="flex items-start gap-3 border-b border-border px-5 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary"><Icon name="shuffle" size={18} /></span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h2 className="text-body font-semibold text-text">Distribute equally</h2>
                <p className="text-small text-text-2">
                  {selected.size} selected {selected.size === 1 ? "lead" : "leads"} · round robin{lastPicked ? `, continuing after ${lastPicked.split(" ")[0]}` : ""}
                </p>
              </div>
              <Badge tone="primary">Preview</Badge>
            </div>
            <div className="flex flex-col gap-1 p-3">
              {loads.isPending ? (
                <div className="py-8"><Spinner className="mx-auto text-primary" /></div>
              ) : loads.isError ? (
                <Alert>{errorMessage(loads.error)}</Alert>
              ) : bdas.map((b) => {
                const away = Boolean(b.leaveUntil);
                const on = !away && !excluded.has(b.name);
                return (
                  <label key={b.name} className={cn("flex items-center gap-3 rounded-lg px-2 py-2", away ? "opacity-70" : "cursor-pointer hover:bg-surface-alt")}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={away}
                      onChange={() => setExcluded((s) => { const n = new Set(s); if (n.has(b.name)) n.delete(b.name); else n.add(b.name); return n; })}
                      className="size-[18px] accent-primary"
                    />
                    <Avatar name={b.name} size={32} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("truncate text-body font-medium", away ? "text-muted" : "text-text")}>{b.name}</span>
                      <span className={cn("text-small", away ? "text-warn" : "text-text-2")}>{away ? `On leave until ${b.leaveUntil}` : `${b.open} open leads`}</span>
                    </span>
                    {on && selected.size > 0 ? <span className="text-body font-semibold text-primary">+{shares[b.name] ?? 0}</span> : null}
                  </label>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 border-t border-border p-4">
              <Alert tone="info" className="text-small">Booked calls are given out first and Hot leads are spread across everyone. Every move is logged with who did it.</Alert>
              <Button size="lg" variant="cta" onClick={submit} disabled={!canAssign} loading={assign.isPending}>
                {canAssign ? `Assign ${selected.size} ${selected.size === 1 ? "lead" : "leads"}` : "Select leads to assign"}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Hot leads received" subtitle="Last 30 days · per BDA" />
            <ul className="flex flex-col gap-2.5 p-5">
              {bdas.filter((b) => !b.leaveUntil).map((b) => {
                const max = Math.max(1, ...bdas.map((x) => x.hotReceived));
                return (
                  <li key={b.name} className="flex items-center gap-3 text-small">
                    <span className="w-12 shrink-0 truncate text-text-2">{b.name.split(" ")[0]}</span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-bg"><span className="block h-full rounded-full bg-primary" style={{ width: `${(b.hotReceived / max) * 100}%` }} /></span>
                    <span className="w-6 shrink-0 text-right font-medium text-text">{b.hotReceived}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>

      <p className="text-small text-muted">The queue and assignments are sample data until the assignment API is connected.</p>
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}

function HistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const history = useAssignmentHistory(open);
  return (
    <Modal open={open} title="Assignment history" subtitle="Who handed out leads, and to whom" onClose={onClose} width={520}>
      {history.isPending ? (
        <div className="py-8"><Spinner className="mx-auto text-primary" /></div>
      ) : history.isError ? (
        <Alert>{errorMessage(history.error)}</Alert>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {history.data.map((h) => (
            <li key={h.id} className="flex flex-col gap-0.5 py-3">
              <span className="text-body font-medium text-text">{h.by} assigned {h.count} {h.count === 1 ? "lead" : "leads"}</span>
              <span className="text-small text-text-2">{h.bdas.join(", ")}</span>
              <span className="text-small text-muted">{relativeTime(h.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
