"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { STAGES, type Stage, type Temperature } from "@/mock/types";
import { LEAD_OWNERS, LEAD_SOURCES, type LeadView } from "./api";
import { useCreateLead, useLeads } from "./hooks";
import { LifecycleBadge, NextStep, OwnerCell, StageBadge, TempBadge } from "./lead-bits";

const PAGE_SIZE = 8;

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
  const [source, setSource] = useState("");
  const [stage, setStage] = useState<Stage | "">(() => {
    const wanted = params.get("stage");
    return STAGES.find((s) => s === wanted) ?? "";
  });
  const [owner, setOwner] = useState("");
  const [temperature, setTemperature] = useState<Temperature | "">("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const newOpen = params.get("new") === "1";

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo(
    () => ({ view, search, source, stage, owner, temperature, page, pageSize: PAGE_SIZE, me: user?.name ?? "" }),
    [view, search, source, stage, owner, temperature, page, user?.name],
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
    toast.show("Bulk actions arrive with the leads API.", "info");
  }

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={data ? `${formatNumber(data.counts.all)} leads · ${formatNumber(data.counts.unassigned)} unassigned · ${formatNumber(data.counts.booked)} with a booked call` : "Loading…"}
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast.show("Export arrives with the leads API.", "info")}>Export CSV</Button>
            <Link href="/imports" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3.5 text-body font-medium text-text hover:bg-surface-alt">
              <Icon name="upload" size={16} /> Import CSV
            </Link>
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
              className={cn("flex items-center gap-2 border-b-2 px-1 pt-1 pb-3 text-body font-medium whitespace-nowrap", active ? "border-primary text-primary" : "border-transparent text-text-2 hover:text-text")}
            >
              {v.label}
              <span className={cn("rounded-full px-[7px] text-small font-medium", active ? "bg-primary-soft text-primary" : "bg-border text-text-2")}>
                {data ? formatNumber(data.counts[v.value]) : "–"}
              </span>
            </button>
          );
        })}
        <button type="button" onClick={() => toast.show("Saved views arrive with the leads API.", "info")} className="flex items-center gap-1.5 pb-2 text-body font-medium whitespace-nowrap text-primary">
          <Icon name="plus" size={14} /> Save view
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-full min-w-56 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:w-[280px]">
          <Icon name="search" size={16} className="text-muted" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, email or phone" aria-label="Search leads" className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted" />
        </label>
        <Select aria-label="Stage" value={stage} onChange={(e) => { setStage(e.target.value as Stage | ""); resetPage(); }} className="h-9 w-auto min-w-32">
          <option value="">Stage</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select aria-label="Source" value={source} onChange={(e) => { setSource(e.target.value); resetPage(); }} className="h-9 w-auto min-w-32">
          <option value="">Source</option>
          {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select aria-label="Owner" value={owner} onChange={(e) => { setOwner(e.target.value); resetPage(); }} className="h-9 w-auto min-w-32">
          <option value="">Owner</option>
          <option value="__none">Unassigned</option>
          {LEAD_OWNERS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select aria-label="Temperature" value={temperature} onChange={(e) => { setTemperature(e.target.value as Temperature | ""); resetPage(); }} className="h-9 w-auto min-w-36">
          <option value="">Temperature</option>
          <option value="Hot">Hot</option>
          <option value="Warm">Warm</option>
          <option value="Cold">Cold</option>
        </Select>
        <button type="button" onClick={() => toast.show("More filters arrive with the leads API.", "info")} className="flex h-9 items-center gap-1.5 px-3 text-body font-medium text-primary">
          <Icon name="filter" size={14} /> More filters
        </button>
      </div>

      <Card className="overflow-hidden">
        {selected.size > 0 ? (
          <div className="flex h-12 flex-wrap items-center gap-3 border-b border-border bg-primary-soft px-4">
            <span className="text-body font-medium text-primary">{selected.size} selected</span>
            {["Assign to…", "Change lifecycle", "Add task"].map((label) => (
              <button key={label} type="button" onClick={bulk} className="h-[30px] rounded-md bg-surface px-3 text-small font-medium text-text shadow-sm">{label}</button>
            ))}
            <span className="flex-1" />
            <button type="button" onClick={() => setSelected(new Set())} className="text-small font-medium text-primary">Clear selection</button>
          </div>
        ) : null}

        {leads.isError ? (
          <div className="p-5"><Alert>{errorMessage(leads.error)}</Alert></div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] border-collapse text-left">
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
                    {["Lead", "Source", "Lifecycle", "Opportunity", "Temp.", "Owner", "Next step"].map((h) => (
                      <th key={h} className="px-3 text-cap font-semibold tracking-[0.5px] text-text-2 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.isPending ? (
                    <tr><td colSpan={8} className="py-16 text-center"><Spinner className="mx-auto text-primary" /></td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={8} className="py-16 text-center text-body text-text-2">No leads match these filters.</td></tr>
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
                                <span className="truncate text-small text-text-2">{lead.email}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 text-body whitespace-nowrap text-text-2">{lead.source}</td>
                          <td className="px-3"><LifecycleBadge lead={lead} /></td>
                          <td className="px-3"><StageBadge lead={lead} /></td>
                          <td className="px-3"><TempBadge lead={lead} /></td>
                          <td className="px-3"><OwnerCell owner={lead.owner} /></td>
                          <td className="px-3"><NextStep next={lead.next} /></td>
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
                        <TempBadge lead={lead} />
                      </span>
                      <span className="flex flex-wrap items-center gap-2"><StageBadge lead={lead} /><NextStep next={lead.next} /></span>
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

      <p className="text-small text-muted">Lead data on this screen is sample data until the leads API is connected.</p>

      <NewLeadModal open={newOpen} onClose={() => router.replace("/leads")} />
    </>
  );
}

function NewLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <NewLeadForm onClose={onClose} /> : null;
}

function NewLeadForm({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const create = useCreateLead();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("WorkR");
  const [touched, setTouched] = useState(false);
  const nameError = touched && name.trim().length < 2 ? "Enter a name" : undefined;
  const emailError = touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "Enter a valid email" : undefined;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (name.trim().length < 2 || emailError !== undefined || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    create.mutate(
      { name: name.trim(), email: email.trim(), phone: phone.trim(), source },
      { onSuccess: (lead) => { toast.show(`${lead.name} added (sample data).`); onClose(); } },
    );
  }

  return (
    <Modal open title="New lead" subtitle="Adds a sample lead until the leads API is connected." onClose={onClose} width={480}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="new-lead-form" loading={create.isPending}>Add lead</Button></>}>
      <form id="new-lead-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Full name" error={nameError}>{({ id, describedBy, invalid }) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />}</Field>
        <Field label="Email" error={emailError}>{({ id, describedBy, invalid }) => <TextInput id={id} type="email" icon="mail" value={email} onChange={(e) => setEmail(e.target.value)} invalid={invalid} aria-describedby={describedBy} />}</Field>
        <Field label="Phone">{({ id }) => <TextInput id={id} type="tel" icon="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" />}</Field>
        <Field label="Source">{({ id }) => (
          <Select id={id} value={source} onChange={(e) => setSource(e.target.value)}>{["WorkR", "VSL · Job switch", "Meta ads", "CSV import", "Manual"].map((s) => <option key={s}>{s}</option>)}</Select>
        )}</Field>
      </form>
    </Modal>
  );
}
