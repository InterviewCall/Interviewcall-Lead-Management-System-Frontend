"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { fetchDuplicates, listLeads } from "./api";
import { useMarkLead } from "./hooks";
import { formatPhone, StageChip } from "./lead-display";
import type { Lead, LeadDetail } from "./types";

/**
 * Finding a duplicate of this lead and merging it in. This lead is kept; everything the duplicate holds (calls, notes,
 * follow-ups, VSL forms and bookings, its opportunity, lists and score) moves here. Managers and admins.
 */
export function MergeModal({ lead, open, onClose }: { lead: LeadDetail["lead"]; open: boolean; onClose: () => void }) {
  return open ? <MergeForm lead={lead} onClose={onClose} /> : null;
}

function MergeForm({ lead, onClose }: { lead: LeadDetail["lead"]; onClose: () => void }) {
  const toast = useToast();
  const { merge } = useMarkLead(lead.id);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Lead | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);

  const suggestions = useQuery({ queryKey: ["leads", "duplicates", lead.id], queryFn: () => fetchDuplicates(lead.id) });
  const found = useQuery({
    queryKey: ["leads", "merge-search", search],
    queryFn: () => listLeads({ view: "all", search, sourceId: null, temperature: "", stage: "", lifecycle: "", ownerId: "", listId: "", page: 1, pageSize: 8 }),
    enabled: search.length >= 2,
  });
  const results = search.length >= 2 ? (found.data?.leads ?? []).filter((l) => l.id !== lead.id) : (suggestions.data ?? []);
  const loading = search.length >= 2 ? found.isPending : suggestions.isPending;

  function confirm() {
    if (!picked) return;
    merge.mutate(picked.id, {
      onSuccess: () => {
        toast.show(`${picked.name} was merged into this lead`, "success");
        onClose();
      },
    });
  }

  return (
    <Modal
      open
      title={picked ? "Merge into this lead?" : "Find duplicates"}
      subtitle={picked ? `${lead.name} is kept. ${picked.name} becomes part of it.` : "Same-name leads are suggested. Search by name, phone or email for others."}
      onClose={merge.isPending ? () => undefined : onClose}
      width={600}
      footer={
        picked ? (
          <>
            <Button variant="secondary" onClick={() => setPicked(null)} disabled={merge.isPending}>Back</Button>
            <Button variant="danger" icon="link" onClick={confirm} loading={merge.isPending}>Merge leads</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>Close</Button>
        )
      }
    >
      {picked ? (
        <div className="flex flex-col gap-4">
          {merge.isError ? <Alert>{errorMessage(merge.error)}</Alert> : null}
          <div className="grid grid-cols-2 gap-3">
            <LeadCard title="Kept" lead={lead} tone="primary" />
            <LeadCard title="Merged in" lead={picked} tone="muted" />
          </div>
          <Alert tone="info" className="text-small">
            The duplicate&apos;s phone and email, calls, notes, follow-ups, VSL forms and bookings, opportunity and lists all move here. Empty
            details here are filled from it. If both have an open deal, the one further along stays open. This cannot be undone.
          </Alert>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <TextInput icon="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Name, phone or email" aria-label="Search leads" autoFocus />
          {suggestions.isError ? <Alert>{errorMessage(suggestions.error)}</Alert> : null}
          {loading ? (
            <div className="py-6"><Spinner className="mx-auto text-primary" /></div>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-body text-text-2">
              {search.length >= 2 ? "No other lead matches." : `No other lead is called ${lead.name}. Search to find a duplicate under another name.`}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {results.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => setPicked(l)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-alt">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-medium text-text">{l.name}</span>
                      <span className="truncate text-small text-text-2">{[l.phone ? formatPhone(l.phone) : null, l.email].filter(Boolean).join(" · ") || "No contact details"}</span>
                    </span>
                    <span className="hidden text-small text-text-2 sm:block">{l.owner?.name ?? "Unassigned"}</span>
                    <StageChip code={l.stage} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

function LeadCard({ title, lead, tone }: { title: string; lead: Lead; tone: "primary" | "muted" }) {
  const rows: Array<[string, string]> = [
    ["Phone", lead.phone ? formatPhone(lead.phone) : "—"],
    ["Email", lead.email ?? "—"],
    ["Owner", lead.owner?.name ?? "Unassigned"],
    ["Source", lead.source],
    ["Added", formatDate(lead.createdAt)],
  ];
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border p-3", tone === "primary" ? "border-primary/40 bg-primary-soft/40" : "border-border bg-surface-alt")}>
      <span className={cn("text-small font-semibold", tone === "primary" ? "text-primary" : "text-text-2")}>{title}</span>
      <span className="text-body font-semibold text-text">{lead.name}</span>
      <StageChip code={lead.stage} />
      <dl className="flex flex-col gap-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-small text-muted">{k}</dt>
            <dd className="truncate text-small text-text">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
