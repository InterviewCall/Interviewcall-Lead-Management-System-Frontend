"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { IMPORT_ROLES } from "@/components/shell/nav";
import { AssignLeadsModal, canDistribute } from "@/features/assignment/handover";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { fast, spring } from "@/lib/motion";
import { exportLeads } from "./api";
import { useLeadFilters, useLeads } from "./hooks";
import { filtersOf, sameFilters, SaveViewModal, useDeleteView, useSavedViews } from "./saved-views";
import { NewLeadModal } from "./lead-form-modal";
import { formatPhone, LIFECYCLE, LifecycleText, NextStepText, ScoreChip, STAGE, STAGE_ORDER, StageMeter, TempChip } from "./lead-display";
import { BulkStageModal, BulkTaskModal } from "./bulk-actions";
import { rememberListUrl } from "./list-url";
import { canMark, canOnboard, CONTACT_STAGES } from "./marking";
import type { LeadQuery, LeadView, LifecycleCode, SavedView, StageCode, TemperatureCode } from "./types";

const PAGE_SIZE = 25;
const TEMPS: TemperatureCode[] = ["HOT", "WARM", "COLD"];

/** The pipeline links here with the stage's label; accept that or the code. */
function stageFromParam(value: string | null): StageCode | "" {
  if (!value) return "";
  return STAGE_ORDER.find((c) => c === value || STAGE[c].label === value) ?? "";
}

function viewFromParam(value: string | null): LeadView {
  return VIEWS.find((v) => v.value === value)?.value ?? "all";
}

function numberFromParam(value: string | null): number | null {
  const n = value === null ? NaN : Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** A day as YYYY-MM-DD in India time, `back` days before today. */
function istDay(back = 0): string {
  return new Date(Date.now() + 5.5 * 3600_000 - back * 86_400_000).toISOString().slice(0, 10);
}

const DATE_PRESETS: Array<{ label: string; range: () => { from: string; to: string } }> = [
  { label: "Today", range: () => ({ from: istDay(), to: istDay() }) },
  { label: "Last 7 days", range: () => ({ from: istDay(6), to: istDay() }) },
  { label: "Last 30 days", range: () => ({ from: istDay(29), to: istDay() }) },
  { label: "This month", range: () => ({ from: `${istDay().slice(0, 8)}01`, to: istDay() }) },
];

const VIEWS: Array<{ value: LeadView; label: string }> = [
  { value: "all", label: "All leads" },
  { value: "mine", label: "My leads" },
  { value: "unassigned", label: "Unassigned" },
  { value: "booked", label: "Booked calls" },
  { value: "hot", label: "Hot leads" },
  { value: "due", label: "Follow-up due" },
];

export function LeadsScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [view, setView] = useState<LeadView>(() => viewFromParam(params.get("view")));
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [sourceId, setSourceId] = useState<number | null>(() => numberFromParam(params.get("source")));
  const [stage, setStage] = useState<StageCode | "">(() => stageFromParam(params.get("stage")));
  const [lifecycle, setLifecycle] = useState<LifecycleCode | "">(() => CONTACT_STAGES.find((s) => s.code === params.get("contact"))?.code ?? "");
  const [ownerId, setOwnerId] = useState(params.get("owner") ?? "");
  const [listId, setListId] = useState(params.get("list") ?? "");
  const [temperature, setTemperature] = useState<TemperatureCode | "">(() => TEMPS.find((t) => t === params.get("temp")) ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [moreOpen, setMoreOpen] = useState(Boolean(params.get("from") || params.get("to")));
  const [saveOpen, setSaveOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(() => numberFromParam(params.get("page")) ?? 1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState<"assign" | "stage" | "task" | null>(null);
  const filters = useLeadFilters();
  const canSeeOwners = user?.role !== "BDA";
  const newOpen = params.get("new") === "1";

  useEffect(() => {
    if (searchInput === search) return;
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  const query = useMemo<LeadQuery>(
    () => ({ view, search, sourceId, stage, lifecycle, ownerId, listId, temperature, from, to, page, pageSize: PAGE_SIZE }),
    [view, search, sourceId, stage, lifecycle, ownerId, listId, temperature, from, to, page],
  );
  // The tab, filters and page live in the address, so going into a lead and coming back (or reloading) lands on the same list.
  const listUrl = useMemo(() => {
    const out = new URLSearchParams();
    if (view !== "all") out.set("view", view);
    if (search) out.set("q", search);
    if (sourceId !== null) out.set("source", String(sourceId));
    if (stage) out.set("stage", stage);
    if (lifecycle) out.set("contact", lifecycle);
    if (ownerId) out.set("owner", ownerId);
    if (listId) out.set("list", listId);
    if (temperature) out.set("temp", temperature);
    if (from) out.set("from", from);
    if (to) out.set("to", to);
    if (page > 1) out.set("page", String(page));
    const text = out.toString();
    return text ? `${pathname}?${text}` : pathname;
  }, [pathname, view, search, sourceId, stage, lifecycle, ownerId, listId, temperature, from, to, page]);
  const paramsText = params.toString();
  useEffect(() => {
    rememberListUrl(listUrl);
    const shown = new URLSearchParams(paramsText);
    shown.delete("new");
    const want = new URL(listUrl, "http://x").searchParams;
    if (shown.toString() !== want.toString()) {
      const keepNew = new URLSearchParams(paramsText).get("new") === "1";
      router.replace(keepNew ? `${listUrl}${listUrl.includes("?") ? "&" : "?"}new=1` : listUrl, { scroll: false });
    }
  }, [listUrl, paramsText, router]);
  const savedViews = useSavedViews();
  const deleteView = useDeleteView();
  const current = useMemo(() => filtersOf(query), [query]);
  const activeSaved = savedViews.data?.find((v) => sameFilters(v.filters, current));
  const canExport = user?.role === "ADMIN" || user?.role === "SALES_MANAGER";
  const dateError = from && to && from > to ? "The end date comes before the start date" : "";
  const anyFilter = sourceId !== null || stage || lifecycle || ownerId || listId || temperature || searchInput || from || to;

  function apply(v: SavedView) {
    const f = v.filters;
    setView(f.view ?? "all");
    setSearchInput(f.search ?? "");
    setSearch(f.search ?? "");
    setSourceId(f.sourceId ?? null);
    setTemperature(f.temperature ?? "");
    setStage(f.stage ?? "");
    setLifecycle(f.lifecycle ?? "");
    setOwnerId(f.ownerId ?? "");
    setListId(f.listId ?? "");
    setFrom(f.from ?? "");
    setTo(f.to ?? "");
    setMoreOpen(Boolean(f.from || f.to));
    setPage(1);
  }

  async function download() {
    setExporting(true);
    try {
      const { blob, filename } = await exportLeads(query);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.show(`${filename} downloaded`, "success");
    } catch (e) {
      toast.show(errorMessage(e), "error");
    } finally {
      setExporting(false);
    }
  }
  const leads = useLeads(query);
  const data = leads.data;
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rowFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rowTo = Math.min(page * PAGE_SIZE, total);

  const resetPage = () => setPage(1);
  const rows = data?.leads ?? [];
  const allSelected = rows.length > 0 && rows.every((l) => selected.has(l.id));

  function finishBulk() {
    setBulkOpen(null);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={data ? `${formatNumber(data.counts.all)} leads · ${formatNumber(data.counts.unassigned)} unassigned · ${formatNumber(data.counts.booked)} with a booked call` : "Loading…"}
        actions={
          <>
            {canExport ? (
              <Button variant="secondary" icon="download" loading={exporting} disabled={Boolean(dateError) || total === 0} onClick={() => void download()} title={total === 0 ? "No leads to export" : `Download the ${formatNumber(Math.min(total, 5000))} leads in this list${total > 5000 ? " (the first 5,000)" : ""}`}>Export CSV</Button>
            ) : null}
            {user && IMPORT_ROLES.includes(user.role) ? (
              <Link href="/imports" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3.5 text-body font-medium text-text hover:bg-surface-alt">
                <Icon name="upload" size={16} /> Import CSV
              </Link>
            ) : null}
          </>
        }
      />


      <div role="tablist" aria-label="Saved views" className="flex gap-6 overflow-x-auto border-b border-border">
        {VIEWS.map((v) => {
          const active = !activeSaved && v.value === view;
          return (
            <button
              key={v.value}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setView(v.value);
                resetPage();
              }}
              className={cn("relative flex items-center gap-2 px-1 pt-1 pb-3 text-body font-medium whitespace-nowrap transition-colors", active ? "text-primary" : "text-text-2 hover:text-text")}
            >
              {active ? <m.span layoutId="leads-view-underline" transition={spring} className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" /> : null}
              {v.label}
              <span className={cn("rounded-full px-[7px] text-small font-medium", active ? "bg-primary-soft text-primary" : "bg-border text-text-2")}>
                {data ? formatNumber(data.counts[v.value]) : "–"}
              </span>
            </button>
          );
        })}
        {savedViews.data?.map((v) => {
          const active = activeSaved?.id === v.id;
          const canDelete = v.mine || user?.role === "ADMIN";
          return (
            <span key={v.id} className="group/view relative flex items-center">
              <button
                role="tab"
                aria-selected={active}
                onClick={() => apply(v)}
                title={v.shared ? `Shared by ${v.by}` : "Your saved view"}
                className={cn("relative flex items-center gap-1.5 px-1 pt-1 pb-3 text-body font-medium whitespace-nowrap transition-colors", active ? "text-primary" : "text-text-2 hover:text-text")}
              >
                {active ? <m.span layoutId="leads-view-underline" transition={spring} className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" /> : null}
                {v.shared ? <Icon name="users" size={13} /> : null}
                {v.name}
              </button>
              {canDelete ? (
                <button type="button" aria-label={`Delete the view ${v.name}`} onClick={() => deleteView.mutate(v)} className="-ml-0.5 mb-2 flex size-5 items-center justify-center rounded text-muted opacity-0 transition group-hover/view:opacity-100 focus-visible:opacity-100 hover:bg-bad-soft hover:text-bad">
                  <Icon name="x" size={12} />
                </button>
              ) : null}
            </span>
          );
        })}
        {!activeSaved ? (
          <button type="button" onClick={() => setSaveOpen(true)} className="flex items-center gap-1.5 pb-2 text-body font-medium whitespace-nowrap text-primary">
            <Icon name="plus" size={14} /> Save view
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-full min-w-56 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:w-[280px]">
          <Icon name="search" size={16} className="text-muted" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, email or phone" aria-label="Search leads" className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted" />
        </label>
        <Select aria-label="Contact stage" value={lifecycle} onChange={(e) => { setLifecycle(e.target.value as LifecycleCode | ""); resetPage(); }} className="h-9 w-auto min-w-32">
          <option value="">Contact stage</option>
          {CONTACT_STAGES.map((s) => <option key={s.code} value={s.code}>{LIFECYCLE[s.code].label}</option>)}
        </Select>
        <Select aria-label="Pipeline stage" value={stage} onChange={(e) => { setStage(e.target.value as StageCode | ""); resetPage(); }} className="h-9 w-auto min-w-32">
          <option value="">Pipeline stage</option>
          {STAGE_ORDER.map((c) => <option key={c} value={c}>{STAGE[c].label}</option>)}
        </Select>
        <Select aria-label="Source" value={sourceId ?? ""} onChange={(e) => { setSourceId(e.target.value ? Number(e.target.value) : null); resetPage(); }} className="h-9 w-auto min-w-32">
          <option value="">Source</option>
          {filters.data?.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select aria-label="List" value={listId} onChange={(e) => { setListId(e.target.value); resetPage(); }} className="h-9 w-auto min-w-32">
          <option value="">List</option>
          {filters.data?.lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({formatNumber(l.members)})</option>)}
        </Select>
        {canSeeOwners ? (
          <Select aria-label="Owner" value={ownerId} onChange={(e) => { setOwnerId(e.target.value); resetPage(); }} className="h-9 w-auto min-w-32">
            <option value="">Owner</option>
            <option value="none">Unassigned</option>
            {filters.data?.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        ) : null}
        <Select aria-label="Temperature" value={temperature} onChange={(e) => { setTemperature(e.target.value as TemperatureCode | ""); resetPage(); }} className="h-9 w-auto min-w-36">
          <option value="">Temperature</option>
          {TEMPS.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
        </Select>
        <AnimatePresence initial={false}>
          {anyFilter ? (
            <m.button
              key="clear"
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, transition: fast }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              onClick={() => { setSourceId(null); setStage(""); setLifecycle(""); setOwnerId(""); setListId(""); setTemperature(""); setSearchInput(""); setSearch(""); setFrom(""); setTo(""); resetPage(); }}
              className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-body font-medium text-text-2 hover:bg-black/5"
            >
              <Icon name="x" size={14} /> Clear filters
            </m.button>
          ) : null}
        </AnimatePresence>
        <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)} className="flex h-9 items-center gap-1.5 px-3 text-body font-medium text-primary">
          <Icon name="filter" size={14} /> More filters{from || to ? " · 1" : ""}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {moreOpen ? (
          <m.div key="more" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={fast} className="overflow-hidden">
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <label className="flex flex-col gap-1 text-small font-medium text-text-2">
                Added from
                <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); resetPage(); }} className="h-9 rounded-lg border border-border-strong bg-surface px-3 text-body font-normal text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <label className="flex flex-col gap-1 text-small font-medium text-text-2">
                Added to
                <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); resetPage(); }} className="h-9 rounded-lg border border-border-strong bg-surface px-3 text-body font-normal text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>
              <div className="flex flex-wrap gap-1.5 pb-0.5">
                {DATE_PRESETS.map((p) => (
                  <button key={p.label} type="button" onClick={() => { const r = p.range(); setFrom(r.from); setTo(r.to); resetPage(); }} className="h-7 rounded-full bg-surface px-3 text-small font-medium text-text-2 ring-1 ring-border transition hover:text-text">{p.label}</button>
                ))}
                {from || to ? <button type="button" onClick={() => { setFrom(""); setTo(""); resetPage(); }} className="h-7 rounded-full px-3 text-small font-medium text-primary hover:bg-primary-soft">Any date</button> : null}
              </div>
              {dateError ? <p role="alert" className="w-full text-small text-bad">{dateError}</p> : null}
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
      <SaveViewModal filters={current} canShare={canExport} open={saveOpen} onClose={() => setSaveOpen(false)} onSaved={() => undefined} />

      <Card className="overflow-hidden">
        <AnimatePresence initial={false}>
        {selected.size > 0 ? (
          <m.div
            key="bulk-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={fast}
            className="flex min-h-12 flex-wrap items-center gap-3 overflow-hidden border-b border-border bg-primary-soft px-4"
          >
            <span className="text-body font-medium text-primary">{selected.size} selected</span>
            {canDistribute(user?.role) ? (
              <BulkButton icon="shuffle" onClick={() => setBulkOpen("assign")}>Assign to…</BulkButton>
            ) : null}
            {user && (canMark(user.role) || canOnboard(user.role)) ? (
              <BulkButton icon="target" onClick={() => setBulkOpen("stage")}>Change contact stage</BulkButton>
            ) : null}
            {user && canMark(user.role) ? (
              <BulkButton icon="clock" onClick={() => setBulkOpen("task")}>Add follow-up</BulkButton>
            ) : null}
            <span className="flex-1" />
            <button type="button" onClick={() => setSelected(new Set())} className="text-small font-medium text-primary">Clear selection</button>
          </m.div>
        ) : null}
        </AnimatePresence>

        {leads.isError ? (
          <div className="p-5"><Alert>{errorMessage(leads.error)}</Alert></div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="h-10 border-b border-border bg-surface-alt">
                    <th className="w-10 px-3">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={allSelected}
                        onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((l) => l.id)))}
                        className="size-[18px] accent-primary"
                      />
                    </th>
                    {["Lead", "Source", "Contact stage", "Pipeline", "Heat", "Score", "Owner", "Next step"].map((h) => (
                      <th key={h} className="px-2 text-small font-medium text-text-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.isPending ? (
                    Array.from({ length: 8 }, (_, i) => (
                      <tr key={i} className="h-[64px] border-b border-border last:border-b-0">
                        <td className="px-3"><span className="block size-[18px] rounded bg-bg" /></td>
                        <td className="px-2"><span className="flex items-center gap-2.5"><span className="size-8 animate-pulse rounded-full bg-bg" /><span className="flex flex-col gap-1.5"><span className="h-3 w-32 animate-pulse rounded bg-bg" /><span className="h-2.5 w-44 animate-pulse rounded bg-bg/70" /></span></span></td>
                        {[64, 96, 104, 56, 56, 96, 96].map((w, j) => <td key={j} className="px-2"><span className="block h-3 animate-pulse rounded bg-bg" style={{ width: w }} /></td>)}
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={9}><EmptyLeads /></td></tr>
                  ) : (
                    rows.map((lead) => {
                      const isSelected = selected.has(lead.id);
                      return (
                        <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className={cn("group/row h-[64px] cursor-pointer border-b border-border last:border-b-0 transition-colors hover:bg-surface-alt", isSelected && "bg-primary-soft/70 hover:bg-primary-soft")}>
                          <td className="px-3" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" aria-label={`Select ${lead.name}`} checked={isSelected} onChange={() => toggle(lead.id)} className="size-[18px] accent-primary" />
                          </td>
                          <td className="px-2">
                            <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2.5">
                              <Avatar name={lead.name} />
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate text-body font-semibold text-text group-hover/row:text-primary">{lead.name}</span>
                                <span className="truncate text-small text-text-2">{lead.email ?? formatPhone(lead.phone)}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-2 text-body whitespace-nowrap text-text-2">{lead.source}</td>
                          <td className="px-2"><LifecycleText code={lead.lifecycle} /></td>
                          <td className="px-2"><StageMeter code={lead.stage} /></td>
                          <td className="px-2"><TempChip code={lead.temperature} /></td>
                          <td className="px-2"><ScoreChip score={lead.score} /></td>
                          <td className="px-2">{lead.owner ? <span className="flex items-center gap-2"><Avatar name={lead.owner.name} size={24} /><span className="truncate text-body text-text">{lead.owner.name}</span></span> : <span className="flex items-center gap-2 text-small font-medium text-warn"><span className="size-6 rounded-full border-[1.5px] border-dashed border-warn/60" />Unassigned</span>}</td>
                          <td className="px-2"><NextStepText next={lead.next} /></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Phone cards */}
            <ul className="divide-y divide-border md:hidden">
              {leads.isPending ? (
                <li className="py-12 text-center"><Spinner className="mx-auto text-primary" /></li>
              ) : rows.length === 0 ? (
                <li><EmptyLeads /></li>
              ) : (
                rows.map((lead) => (
                  <li key={lead.id}>
                    <Link href={`/leads/${lead.id}`} className="flex flex-col gap-2 px-4 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={lead.name} size={36} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-body font-medium text-text">{lead.name}</span>
                          <span className="truncate text-small text-text-2">{lead.source}</span>
                        </span>
                        <TempChip code={lead.temperature} />
                      </span>
                      <span className="flex flex-wrap items-end gap-x-4 gap-y-2"><StageMeter code={lead.stage} /><NextStepText next={lead.next} /></span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-small text-text-2">{total === 0 ? "No leads" : `Showing ${rowFrom}–${rowTo} of ${formatNumber(total)} leads`}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="secondary" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      {bulkOpen === "assign" ? <AssignLeadsModal leadIds={[...selected]} onClose={() => setBulkOpen(null)} onDone={finishBulk} /> : null}
      {bulkOpen === "stage" && user ? <BulkStageModal leadIds={[...selected]} role={user.role} onClose={() => setBulkOpen(null)} onDone={finishBulk} /> : null}
      {bulkOpen === "task" ? <BulkTaskModal leadIds={[...selected]} onClose={() => setBulkOpen(null)} onDone={finishBulk} /> : null}
      <NewLeadModal open={newOpen} onClose={() => router.replace(listUrl, { scroll: false })} />
    </>
  );
}

/** Nothing matches: say so, and offer the way back to everything. */
function EmptyLeads() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-bg text-muted"><Icon name="search" size={20} /></span>
      <p className="text-body font-semibold text-text">No leads match these filters</p>
      <p className="max-w-[44ch] text-small text-text-2">Try a different search, or clear the filters to see every lead you can open.</p>
      <Link href="/leads" className="mt-1 text-body font-medium text-primary hover:underline">Clear filters</Link>
    </div>
  );
}

/** A button in the bar that appears when leads are selected. */
function BulkButton({ icon, onClick, children }: { icon: IconName; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="flex h-[30px] items-center gap-1.5 rounded-md bg-surface px-3 text-small font-medium text-text shadow-sm transition hover:text-primary hover:shadow">
      <Icon name={icon} size={14} className="text-text-2" />
      {children}
    </button>
  );
}
