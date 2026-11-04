"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { IMPORT_ROLES } from "@/components/shell/nav";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { fast, spring } from "@/lib/motion";
import { useLeadFilters, useLeads } from "./hooks";
import { formatPhone, LIFECYCLE, LifecycleChip, NextStepText, ScoreChip, STAGE, STAGE_ORDER, StageChip, TempChip } from "./lead-display";
import { CONTACT_STAGES } from "./marking";
import type { LeadQuery, LeadView, LifecycleCode, StageCode, TemperatureCode } from "./types";

const PAGE_SIZE = 25;
const TEMPS: TemperatureCode[] = ["HOT", "WARM", "COLD"];

/** The pipeline links here with the stage's label; accept that or the code. */
function stageFromParam(value: string | null): StageCode | "" {
  if (!value) return "";
  return STAGE_ORDER.find((c) => c === value || STAGE[c].label === value) ?? "";
}

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
  const [view, setView] = useState<LeadView>("all");
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [stage, setStage] = useState<StageCode | "">(() => stageFromParam(params.get("stage")));
  const [lifecycle, setLifecycle] = useState<LifecycleCode | "">(() => CONTACT_STAGES.find((s) => s.code === params.get("contact"))?.code ?? "");
  const [ownerId, setOwnerId] = useState("");
  const [listId, setListId] = useState(params.get("list") ?? "");
  const [temperature, setTemperature] = useState<TemperatureCode | "">("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filters = useLeadFilters();
  const canSeeOwners = user?.role !== "BDA";
  const newOpen = params.get("new") === "1";

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo<LeadQuery>(
    () => ({ view, search, sourceId, stage, lifecycle, ownerId, listId, temperature, page, pageSize: PAGE_SIZE }),
    [view, search, sourceId, stage, lifecycle, ownerId, listId, temperature, page],
  );
  const leads = useLeads(query);
  const data = leads.data;
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const resetPage = () => setPage(1);
  const rows = data?.leads ?? [];
  const allSelected = rows.length > 0 && rows.every((l) => selected.has(l.id));

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulk() {
    toast.show("Bulk actions arrive in a later step. Your leads are real.", "info");
  }

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={data ? `${formatNumber(data.counts.all)} leads · ${formatNumber(data.counts.unassigned)} unassigned · ${formatNumber(data.counts.booked)} with a booked call` : "Loading…"}
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast.show("Export arrives in a later step.", "info")}>Export CSV</Button>
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
          const active = v.value === view;
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
        <button type="button" onClick={() => toast.show("Saved views arrive in a later step.", "info")} className="flex items-center gap-1.5 pb-2 text-body font-medium whitespace-nowrap text-primary">
          <Icon name="plus" size={14} /> Save view
        </button>
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
          {sourceId !== null || stage || lifecycle || ownerId || listId || temperature || searchInput ? (
            <m.button
              key="clear"
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, transition: fast }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              onClick={() => { setSourceId(null); setStage(""); setLifecycle(""); setOwnerId(""); setListId(""); setTemperature(""); setSearchInput(""); setSearch(""); resetPage(); router.replace("/leads"); }}
              className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-body font-medium text-text-2 hover:bg-black/5"
            >
              <Icon name="x" size={14} /> Clear filters
            </m.button>
          ) : null}
        </AnimatePresence>
        <button type="button" onClick={() => toast.show("More filters arrive in a later step.", "info")} className="flex h-9 items-center gap-1.5 px-3 text-body font-medium text-primary">
          <Icon name="filter" size={14} /> More filters
        </button>
      </div>

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
            {["Assign to…", "Change lifecycle", "Add task"].map((label) => (
              <button key={label} type="button" onClick={bulk} className="h-[30px] rounded-md bg-surface px-3 text-small font-medium text-text shadow-sm">{label}</button>
            ))}
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
              <table className="w-full min-w-[1100px] border-collapse text-left">
                <thead>
                  <tr className="h-10 border-b border-border bg-surface-alt">
                    <th className="w-12 px-3">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={allSelected}
                        onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((l) => l.id)))}
                        className="size-[18px] accent-primary"
                      />
                    </th>
                    {["Lead", "Source", "Contact stage", "Pipeline stage", "Temp.", "Score", "Owner", "Next step"].map((h) => (
                      <th key={h} className="px-3 text-cap font-semibold tracking-[0.5px] text-text-2 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.isPending ? (
                    <tr><td colSpan={9} className="py-16 text-center"><Spinner className="mx-auto text-primary" /></td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={9} className="py-16 text-center text-body text-text-2">No leads match these filters.</td></tr>
                  ) : (
                    rows.map((lead) => {
                      const isSelected = selected.has(lead.id);
                      return (
                        <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className={cn("h-[60px] cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-alt", isSelected && "bg-primary-soft hover:bg-primary-soft")}>
                          <td className="px-3" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" aria-label={`Select ${lead.name}`} checked={isSelected} onChange={() => toggle(lead.id)} className="size-[18px] accent-primary" />
                          </td>
                          <td className="px-3">
                            <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2.5">
                              <Avatar name={lead.name} />
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate text-body font-medium text-text">{lead.name}</span>
                                <span className="truncate text-small text-text-2">{lead.email ?? formatPhone(lead.phone)}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 text-body whitespace-nowrap text-text-2">{lead.source}</td>
                          <td className="px-3"><LifecycleChip code={lead.lifecycle} /></td>
                          <td className="px-3"><StageChip code={lead.stage} /></td>
                          <td className="px-3"><TempChip code={lead.temperature} /></td>
                          <td className="px-3"><ScoreChip score={lead.score} /></td>
                          <td className="px-3">{lead.owner ? <span className="flex items-center gap-2"><Avatar name={lead.owner.name} size={24} /><span className="truncate text-body text-text">{lead.owner.name}</span></span> : <span className="text-small text-muted">Unassigned</span>}</td>
                          <td className="px-3"><NextStepText next={lead.next} /></td>
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
                <li className="py-12 text-center text-body text-text-2">No leads match these filters.</li>
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
                      <span className="flex flex-wrap items-center gap-2"><StageChip code={lead.stage} /><ScoreChip score={lead.score} /><NextStepText next={lead.next} /></span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-small text-text-2">{total === 0 ? "No leads" : `Showing ${from}–${to} of ${formatNumber(total)} leads`}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="secondary" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      <NewLeadModal open={newOpen} onClose={() => router.replace("/leads")} />
    </>
  );
}

function NewLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const canImport = user ? IMPORT_ROLES.includes(user.role) : false;
  if (!open) return null;
  return (
    <Modal open title="New lead" subtitle="Adding a single lead by hand arrives in a later step." onClose={onClose} width={480}
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button>{canImport ? <Link href="/imports" className="inline-flex h-9 items-center rounded-lg bg-cta px-3.5 text-body font-medium text-white shadow-cta hover:brightness-110">Import a CSV</Link> : null}</>}>
      <p className="text-body text-text-2">
        {canImport ? "To add leads today, import a CSV file. Duplicates are skipped by email and phone, and every new lead gets its first stage and score." : "To add leads today, ask an admin or sales manager to import a CSV file."}
      </p>
    </Modal>
  );
}
