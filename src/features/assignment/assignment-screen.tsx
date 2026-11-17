"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber, relativeTime } from "@/lib/format";
import { fast } from "@/lib/motion";
import type { Tone } from "@/lib/roles";
import { DEPTH_LABEL, planShares, TEMPERATURE_LABEL, TEMPERATURES, VSL_DEPTHS, type BdaLoad, type QueueQuery, type QueueTab, type Temperature, type VslDepth, type WaitBucket } from "./api";
import { TempChip } from "@/features/leads/lead-display";
import { useAssignmentHistory, useBdaLoads, useDistribute, useQueue, useSetLeave } from "./hooks";
import { WorkrBatchesCard } from "./handover";

const PAGE = 8;
/** The most leads one distribution takes (the API refuses more). */
const MAX_PER_BATCH = 500;
const DEPTH_TONE: Record<VslDepth, Tone> = { BOOKED: "info", FORM: "primary", DETAILS: "violet", NONE: "neutral" };

/** Today in India, as YYYY-MM-DD: leave days are whole India days. */
const todayIst = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const bookedText = (iso: string) =>
  `Call ${new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}`;

export function AssignmentScreen() {
  const toast = useToast();
  const [tab, setTab] = useState<QueueTab>("all");
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [depth, setDepth] = useState<VslDepth | "">("");
  const [temperature, setTemperature] = useState<Temperature | "">("");
  const [wait, setWait] = useState<WaitBucket>("");
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // People whose tick differs from the default (BDAs ticked, sales managers not, unless there is no BDA to give to).
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [leaveFor, setLeaveFor] = useState<BdaLoad | null>(null);
  // Rows slide out only while an assignment is going through, not when you change a filter.
  const [handingOut, setHandingOut] = useState(false);

  const query: QueueQuery = useMemo(() => ({ tab, sourceId, depth, temperature, wait, limit }), [tab, sourceId, depth, temperature, wait, limit]);
  const queue = useQueue(query);
  const loads = useBdaLoads();
  const assign = useDistribute();
  const data = queue.data;
  const rows = data?.items ?? [];

  // BDAs first, then sales managers.
  const bdas = [...(loads.data?.bdas ?? [])].sort((a, b) => (a.role === b.role ? 0 : a.role === "BDA" ? -1 : 1));
  const available = bdas.filter((b) => !b.leaveUntil);
  const noBdaFree = !available.some((b) => b.role === "BDA");
  const isOn = (b: BdaLoad) => !b.leaveUntil && (b.role === "BDA" || noBdaFree) !== flipped.has(b.id);
  const chosen = available.filter(isOn).map((b) => b.id);
  const cursorUserId = loads.data?.cursorUserId ?? null;
  const { shares, lastId } = planShares(selected.size, chosen, cursorUserId);
  const lastPicked = bdas.find((b) => b.id === (lastId ?? cursorUserId))?.name;
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
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
    setHandingOut(true);
    setTimeout(() => setHandingOut(false), 2000);
    assign.mutate(
      { leadIds: [...selected], toUserIds: chosen },
      {
        onSuccess: ({ assigned, skipped }) => {
          toast.show(
            `${assigned} ${assigned === 1 ? "lead" : "leads"} assigned${skipped > 0 ? `, ${skipped} skipped because someone already owns ${skipped === 1 ? "it" : "them"}` : ""}.`,
          );
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
        subtitle={data ? `${formatNumber(data.counts.all)} unassigned leads · ${formatNumber(data.counts.booked)} with a booked call` : "Loading the queue…"}
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
              <Select aria-label="Source" value={sourceId ?? ""} onChange={(e) => changeFilter(setSourceId)(e.target.value ? Number(e.target.value) : null)} className="h-9 w-auto min-w-28">
                <option value="">Source</option>
                {(data?.sources ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select aria-label="VSL depth" value={depth} onChange={(e) => changeFilter(setDepth)(e.target.value as VslDepth | "")} className="h-9 w-auto min-w-32">
                <option value="">VSL depth</option>
                {VSL_DEPTHS.map((d) => <option key={d} value={d}>{DEPTH_LABEL[d]}</option>)}
              </Select>
              <Select aria-label="Temperature" value={temperature} onChange={(e) => changeFilter(setTemperature)(e.target.value as Temperature | "")} className="h-9 w-auto min-w-32">
                <option value="">Temperature</option>
                {TEMPERATURES.map((t) => <option key={t} value={t}>{TEMPERATURE_LABEL[t]}</option>)}
              </Select>
              <Select aria-label="Waiting time" value={wait} onChange={(e) => changeFilter(setWait)(e.target.value as WaitBucket)} className="h-9 w-auto min-w-36">
                <option value="">Waiting time</option>
                <option value="lt6">Under 6 h</option>
                <option value="6to24">6 to 24 h</option>
                <option value="gt24">Over 1 day</option>
              </Select>
            </div>
          </div>

          <AnimatePresence initial={false}>
          {selected.size > 0 ? (
            <m.div
              key="selection-bar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 44, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={fast}
              className="flex items-center gap-3 overflow-hidden border-b border-border bg-primary-soft px-4 text-body"
            >
              <span className="font-medium text-primary">{selected.size} selected</span>
              {data && selected.size < Math.min(data.total, MAX_PER_BATCH) ? (
                <button type="button" onClick={() => setSelected(new Set(data.matchingIds.slice(0, MAX_PER_BATCH)))} className="font-medium text-primary underline-offset-2 hover:underline">
                  {data.total > MAX_PER_BATCH ? `Select the first ${formatNumber(MAX_PER_BATCH)}` : `Select all ${formatNumber(data.total)}`}
                </button>
              ) : null}
              <span className="flex-1" />
              <button type="button" onClick={() => setSelected(new Set())} className="text-small font-medium text-primary">Clear</button>
            </m.div>
          ) : null}
          </AnimatePresence>

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
                        onChange={() => setSelected((s) => { const n = new Set(s); rows.forEach((r) => (allVisibleSelected ? n.delete(r.id) : n.add(r.id))); return n; })}
                        className="size-[18px] accent-primary"
                      />
                    </th>
                    {["Lead", "Source", "VSL depth", "Heat", "Waiting"].map((h) => (
                      <th key={h} className="px-3 text-small font-medium text-text-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queue.isPending ? (
                    <tr><td colSpan={6} className="py-14 text-center"><Spinner className="mx-auto text-primary" /></td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} className="py-14 text-center text-body text-text-2">The queue is empty. Nothing is waiting for an owner.</td></tr>
                  ) : null}
                  <AnimatePresence initial={false}>
                  {queue.isPending || rows.length === 0 ? null : rows.map((row) => (
                    <m.tr
                      key={row.id}
                      exit={handingOut ? { opacity: 0, x: 24, transition: fast } : { opacity: 0, transition: { duration: 0 } }}
                      className={cn("h-[60px] border-b border-border last:border-b-0 transition-colors", selected.has(row.id) && "bg-primary-soft/60")}
                    >
                      <td className="px-3"><input type="checkbox" aria-label={`Select ${row.name}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} className="size-[18px] accent-primary" /></td>
                      <td className="px-3">
                        <span className="flex flex-col">
                          <Link href={`/leads/${row.id}`} className="text-body font-medium text-text hover:text-primary hover:underline">{row.name}</Link>
                          <span className={cn("text-small", row.bookedAt ? "text-info" : "text-text-2")}>
                            {row.bookedAt ? bookedText(row.bookedAt) : [row.company, row.domain ?? row.email].filter(Boolean).join(" · ") || "No details yet"}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 text-body whitespace-nowrap text-text-2">{row.source}</td>
                      <td className="px-3"><Badge tone={DEPTH_TONE[row.depth]}>{DEPTH_LABEL[row.depth]}</Badge></td>
                      <td className="px-3"><TempChip code={row.temperature} /></td>
                      <td className={cn("px-3 text-body whitespace-nowrap", row.waitingHours >= 24 ? "font-medium text-warn" : "text-text-2")}>
                        {row.waitingHours >= 24 ? `${Math.floor(row.waitingHours / 24)} d` : `${row.waitingHours} h`}
                      </td>
                    </m.tr>
                  ))}
                  </AnimatePresence>
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
          <WorkrBatchesCard />
          <Card>
            <div className="flex items-start gap-3 border-b border-border px-5 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary"><Icon name="shuffle" size={18} /></span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h2 className="text-body font-semibold text-text">Distribute equally</h2>
                <p className="text-small text-text-2">
                  {selected.size} selected {selected.size === 1 ? "lead" : "leads"} · round robin{lastPicked ? `, continuing after ${lastPicked.split(" ")[0]}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1 p-3">
              {loads.isPending ? (
                <div className="py-8"><Spinner className="mx-auto text-primary" /></div>
              ) : loads.isError ? (
                <Alert>{errorMessage(loads.error)}</Alert>
              ) : bdas.length === 0 ? (
                <p className="px-2 py-6 text-center text-body text-text-2">There is no active BDA or sales manager to give leads to. Add people in Team and roles.</p>
              ) : bdas.map((b) => {
                const away = Boolean(b.leaveUntil);
                const on = isOn(b);
                return (
                  <div key={b.id} className="flex items-center gap-1">
                    <label className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2", away ? "opacity-70" : "cursor-pointer hover:bg-surface-alt")}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={away}
                        onChange={() => setFlipped((s) => { const n = new Set(s); if (n.has(b.id)) n.delete(b.id); else n.add(b.id); return n; })}
                        className="size-[18px] accent-primary"
                      />
                      <Avatar name={b.name} size={32} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cn("truncate text-body font-medium", away ? "text-muted" : "text-text")}>{b.name}</span>
                        <span className={cn("text-small", away ? "text-warn" : "text-text-2")}>{away ? `On leave until ${formatDate(b.leaveUntil!)}` : `${b.role === "SALES_MANAGER" ? "Sales manager · " : ""}${b.open} open leads`}</span>
                      </span>
                      {on && selected.size > 0 ? <span className="text-body font-semibold text-primary">+{shares[b.id] ?? 0}</span> : null}
                    </label>
                    <button
                      type="button"
                      onClick={() => setLeaveFor(b)}
                      aria-label={away ? `Change or end leave for ${b.name}` : `Mark ${b.name} on leave`}
                      title={away ? "Change or end leave" : "Mark on leave"}
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-2 hover:bg-black/5 hover:text-primary"
                    >
                      <Icon name="clock" size={16} />
                    </button>
                  </div>
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
            <CardHeader title="Hot leads received" subtitle="Last 7 days · per person" />
            <ul className="flex flex-col gap-2.5 p-5">
              {bdas.filter((b) => !b.leaveUntil).map((b) => {
                const max = Math.max(1, ...bdas.map((x) => x.hotReceived));
                return (
                  <li key={b.id} className="flex items-center gap-3 text-small">
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

      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <LeaveModal person={leaveFor} onClose={() => setLeaveFor(null)} />
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
        history.data.length === 0 ? (
          <p className="py-8 text-center text-body text-text-2">Nothing has been handed out yet.</p>
        ) : (
        <ul className="flex flex-col divide-y divide-border">
          {history.data.map((h) => (
            <li key={h.id} className="flex flex-col gap-0.5 py-3">
              <span className="text-body font-medium text-text">{h.by} {h.method === "EQUAL_DISTRIBUTION" ? "shared" : "assigned"} {h.count} {h.count === 1 ? "lead" : "leads"}</span>
              <span className="text-small text-text-2">{h.people.join(", ")}</span>
              <span className="text-small text-muted">{relativeTime(h.at)}</span>
            </li>
          ))}
        </ul>
        )
      )}
    </Modal>
  );
}

function LeaveModal({ person, onClose }: { person: BdaLoad | null; onClose: () => void }) {
  const toast = useToast();
  const save = useSetLeave();
  const [picked, setPicked] = useState<{ id: string; date: string } | null>(null);
  const today = todayIst();
  const date = picked && person && picked.id === person.id ? picked.date : person?.leaveUntil ?? today;

  function submit(until: string | null) {
    if (!person) return;
    save.mutate(
      { userId: person.id, until },
      {
        onSuccess: () => {
          toast.show(until ? `${person.name} is on leave until ${formatDate(until)}.` : `${person.name} is back.`);
          onClose();
        },
        onError: (e) => toast.show(errorMessage(e), "error"),
      },
    );
  }

  return (
    <Modal
      open={person !== null}
      title={person ? `${person.name}: leave` : "Leave"}
      subtitle="They get no new leads from equal distribution until the day after"
      onClose={onClose}
      width={440}
      footer={
        <>
          {person?.leaveUntil ? <Button variant="secondary" onClick={() => submit(null)} disabled={save.isPending}>Back at work</Button> : null}
          <Button onClick={() => submit(date)} loading={save.isPending} disabled={date < today}>Save leave</Button>
        </>
      }
    >
      <Field label="Last day away" hint="Today counts as a day away.">
        {({ id, describedBy }) => (
          <TextInput id={id} aria-describedby={describedBy} type="date" min={today} value={date} onChange={(e) => person && setPicked({ id: person.id, date: e.target.value })} />
        )}
      </Field>
    </Modal>
  );
}
