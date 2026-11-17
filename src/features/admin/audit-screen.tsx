"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { listStaff, staffKeys } from "@/features/staff/api";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { AUDIT_PAGE_SIZE, adminKeys, fetchAudit, fetchAuditActions, type AuditEntry, type AuditFilters } from "./api";

const stamp = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
const control = "h-9 rounded-lg border border-border-strong bg-surface px-3 text-body font-normal text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/** "lead.dnc_set" reads as "Lead dnc set". Good enough to scan; the exact action stays in the filter and the tooltip. */
const readable = (action: string) => {
  const text = action.replace(/[._]/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const EMPTY: AuditFilters = { action: "", actorId: "", entityId: "", from: "", to: "", page: 1 };

/** Who did what, newest first. Admins only. Every sensitive change in the CRM writes a line here. */
export function AuditScreen() {
  const [filters, setFilters] = useState<AuditFilters>(EMPTY);
  const [open, setOpen] = useState<string | null>(null);
  const set = (patch: Partial<AuditFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const audit = useQuery({ queryKey: adminKeys.audit(filters), queryFn: () => fetchAudit(filters), placeholderData: keepPreviousData });
  const actions = useQuery({ queryKey: adminKeys.actions, queryFn: fetchAuditActions, staleTime: 60_000 });
  const people = useQuery({ queryKey: staffKeys.list({ page: 1, pageSize: 100 }), queryFn: () => listStaff({ page: 1, pageSize: 100 }), staleTime: 60_000 });
  const page = audit.data;
  const first = page && page.total > 0 ? (page.page - 1) * AUDIT_PAGE_SIZE + 1 : 0;
  const last = page ? Math.min(page.total, page.page * AUDIT_PAGE_SIZE) : 0;
  const filtered = filters.action || filters.actorId || filters.entityId || filters.from || filters.to;

  return (
    <>
      <PageHeader title="Audit log" subtitle="Who changed what, and when. Entries cannot be edited or removed." />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
          <label className="flex flex-col gap-1 text-small font-medium text-text-2">
            What happened
            <select value={filters.action} onChange={(e) => set({ action: e.target.value })} className={control}>
              <option value="">Everything</option>
              {[...new Set((actions.data ?? []).map((a) => a.split(".")[0] + "."))].map((family) => <option key={family} value={family}>All “{family.slice(0, -1)}” actions</option>)}
              {(actions.data ?? []).map((a) => <option key={a} value={a}>{readable(a)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small font-medium text-text-2">
            Who
            <select value={filters.actorId} onChange={(e) => set({ actorId: e.target.value })} className={control}>
              <option value="">Anyone</option>
              {(people.data?.staff ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small font-medium text-text-2">
            From
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value })} className={control} />
          </label>
          <label className="flex flex-col gap-1 text-small font-medium text-text-2">
            To
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} className={control} />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-small font-medium text-text-2">
            Record id
            <input value={filters.entityId} onChange={(e) => set({ entityId: e.target.value })} placeholder="A lead or account id" className={control} />
          </label>
          {filtered ? <Button variant="ghost" onClick={() => setFilters(EMPTY)}>Clear filters</Button> : null}
        </div>

        {audit.isError ? (
          <div className="p-5"><Alert>{errorMessage(audit.error)}</Alert></div>
        ) : !page ? (
          <div className="py-14"><Spinner className="mx-auto text-primary" /></div>
        ) : page.entries.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-body font-semibold text-text">{filtered ? "Nothing matches these filters" : "Nothing recorded yet"}</p>
            <p className="mt-1 text-small text-text-2">{filtered ? "Widen the dates or clear a filter." : "Changes to accounts, leads, sources and settings will appear here."}</p>
          </div>
        ) : (
          <ul className={cn(audit.isFetching && "opacity-70 transition-opacity")}>
            {page.entries.map((e) => <Row key={e.id} entry={e} expanded={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} />)}
          </ul>
        )}

        {page && page.total > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="nums text-small text-text-2">{first.toLocaleString("en-IN")}–{last.toLocaleString("en-IN")} of {page.total.toLocaleString("en-IN")}</p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page.page <= 1} onClick={() => set({ page: page.page - 1 })}>Newer</Button>
              <Button variant="secondary" disabled={last >= page.total} onClick={() => set({ page: page.page + 1 })}>Older</Button>
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}

function Row({ entry, expanded, onToggle }: { entry: AuditEntry; expanded: boolean; onToggle: () => void }) {
  const hasDetail = entry.detail !== null && Object.keys(entry.detail).length > 0;
  return (
    <li className="border-b border-border last:border-b-0">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 py-3 text-left transition hover:bg-surface-alt focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
        <span className="min-w-0 flex-1 basis-64">
          <span className="block text-body font-medium text-text" title={entry.action}>{readable(entry.action)}</span>
          <span className="block truncate text-small text-text-2">
            {entry.actor ? entry.actor.name : "System"}
            {entry.entityId ? ` · ${entry.entityType} ${entry.entityId}` : ` · ${entry.entityType}`}
          </span>
        </span>
        <time dateTime={entry.at} className="nums text-small text-text-2">{stamp.format(new Date(entry.at))}</time>
      </button>
      {expanded ? (
        <div className="bg-surface-alt px-4 py-3 text-small text-text-2">
          <p><span className="font-medium text-text">Action</span> {entry.action}{entry.ip ? <> · <span className="font-medium text-text">From</span> {entry.ip}</> : null}</p>
          {hasDetail ? (
            <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
              {Object.entries(entry.detail!).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-medium text-text">{k}</dt>
                  <dd className="min-w-0 break-words">{typeof v === "string" ? v : JSON.stringify(v)}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="mt-1">No more details.</p>}
        </div>
      ) : null}
    </li>
  );
}
