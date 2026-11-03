"use client";

import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { companyRole } from "@/mock/people";
import { TEMP_TONE, type MockLead, type Temperature } from "@/mock/types";
import { NextStep, OwnerCell, StageBadge, TempBadge } from "@/features/leads/lead-bits";
import { getPipeline, pipelineKeys, type PipelineColumn, type PipelineQuery } from "./api";
import { STAGE_COLOR, STAGE_SHORT } from "./stage-colors";

type Mode = "board" | "list";
const CARDS_PER_COLUMN = 3;

export function PipelineScreen() {
  const [mode, setMode] = useState<Mode>("board");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<PipelineQuery>({ temperature: "", owner: "" });
  const [mobileStage, setMobileStage] = useState<string>("Call 1 Pending");
  const pipeline = useQuery({ queryKey: pipelineKeys.all(filters), queryFn: () => getPipeline(filters), placeholderData: keepPreviousData });
  const data = pipeline.data;
  const activeFilters = Number(Boolean(filters.temperature)) + Number(Boolean(filters.owner));
  const totalShown = data ? data.columns.reduce((n, c) => n + c.count, 0) : 0;
  const mobileColumn = data?.columns.find((c) => c.stage === mobileStage) ?? data?.columns[0];

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle={data ? `${formatNumber(data.open)} open opportunities across 7 stages · ${data.won} won this month` : "Loading the pipeline…"}
        actions={
          <>
            <Segmented ariaLabel="View" value={mode} onChange={setMode} options={[{ value: "board", label: "Board" }, { value: "list", label: "List" }]} />
            <Button variant="secondary" icon="filter" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
              Filters{activeFilters > 0 ? ` · ${activeFilters}` : ""}
            </Button>
          </>
        }
      />

      {filtersOpen ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label="Temperature" value={filters.temperature} onChange={(e) => setFilters((f) => ({ ...f, temperature: e.target.value as Temperature | "" }))} className="h-9 w-auto min-w-36">
            <option value="">Temperature</option>
            {(["Hot", "Warm", "Cold"] as const).map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select aria-label="Owner" value={filters.owner} onChange={(e) => setFilters((f) => ({ ...f, owner: e.target.value }))} className="h-9 w-auto min-w-36">
            <option value="">Owner</option>
            <option value="__none">Unassigned</option>
            {(data?.owners ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
          {activeFilters > 0 ? (
            <button type="button" onClick={() => setFilters({ temperature: "", owner: "" })} className="px-2 text-body font-medium text-primary">Clear</button>
          ) : null}
        </div>
      ) : null}

      {pipeline.isError ? <Alert>{errorMessage(pipeline.error)}</Alert> : null}

      <Card>
        <CardHeader
          title="Where open opportunities sit today"
          actions={
            data ? (
              <span className="flex items-baseline gap-2 text-small text-text-2">
                Win rate this month <span className="text-h2 font-semibold text-ok">{data.winRate.toFixed(1)}%</span>
              </span>
            ) : null
          }
        />
        <div className="flex flex-col gap-3 p-5">
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-bg" role="img" aria-label="Opportunities by stage">
            {(data?.columns ?? []).filter((c) => c.count > 0).map((c) => (
              <span key={c.stage} style={{ flexGrow: c.count, backgroundColor: STAGE_COLOR[c.stage] }} className="min-w-1" />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {(data?.columns ?? []).map((c) => (
              <li key={c.stage} className="flex items-center gap-1.5 text-small text-text-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: STAGE_COLOR[c.stage] }} />
                {STAGE_SHORT[c.stage]} · {c.count}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {pipeline.isPending ? (
        <div className="flex justify-center py-16"><Spinner className="text-primary" /></div>
      ) : !data ? null : mode === "board" ? (
        <>
          {/* Desktop board */}
          <div className="-mx-4 hidden overflow-x-auto px-4 pb-2 md:block lg:-mx-6 lg:px-6">
            <div className="flex w-max items-start gap-3">
              {data.columns.map((c) => <BoardColumn key={c.stage} column={c} />)}
            </div>
          </div>

          {/* Phone: one stage at a time */}
          <div className="flex flex-col gap-3 md:hidden">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Stage">
              {data.columns.map((c) => {
                const active = c.stage === mobileColumn?.stage;
                return (
                  <button
                    key={c.stage}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setMobileStage(c.stage)}
                    className={cn("h-8 shrink-0 rounded-full border px-3 text-small font-medium whitespace-nowrap", active ? "border-primary bg-primary text-white" : "border-border-strong bg-surface text-text-2")}
                  >
                    {STAGE_SHORT[c.stage]} · {c.count}
                  </button>
                );
              })}
            </div>
            {mobileColumn ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Tile label="In this stage" value={mobileColumn.count} />
                  <Tile label="Hot" value={mobileColumn.leads.filter((l) => l.temperature === "Hot").length} tone="text-bad" />
                </div>
                {mobileColumn.leads.length === 0 ? (
                  <p className="rounded-xl border border-border bg-surface py-10 text-center text-body text-text-2 shadow-card">Nothing in this stage.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {mobileColumn.leads.map((l) => <li key={l.id}><OppCard lead={l} /></li>)}
                  </ul>
                )}
              </>
            ) : null}
          </div>
        </>
      ) : (
        <ListView data={data.columns} total={totalShown} />
      )}

      <p className="text-small text-muted">Pipeline figures on this screen are built from sample leads until the leads API is connected.</p>
    </>
  );
}

function Tile({ label, value, tone = "text-text" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-card">
      <span className="text-small text-text-2">{label}</span>
      <span className={cn("text-display font-bold", tone)}>{value}</span>
    </div>
  );
}

function BoardColumn({ column }: { column: PipelineColumn }) {
  const shown = column.leads.slice(0, CARDS_PER_COLUMN);
  const more = column.count - shown.length;
  return (
    <section aria-label={column.stage} className="flex w-[232px] shrink-0 flex-col gap-2.5 rounded-xl bg-black/[0.035] p-2.5">
      <header className="flex items-center gap-2 px-1 pt-0.5">
        <span className="size-2 rounded-full" style={{ backgroundColor: STAGE_COLOR[column.stage] }} />
        <h2 className="min-w-0 flex-1 truncate text-body font-semibold text-text">{column.stage}</h2>
        <span className="rounded-full bg-surface px-2 text-small font-medium text-text-2">{column.count}</span>
      </header>
      {shown.length === 0 ? <p className="px-1 py-4 text-center text-small text-muted">Nothing here</p> : shown.map((l) => <OppCard key={l.id} lead={l} />)}
      {more > 0 ? (
        <Link href={`/leads?stage=${encodeURIComponent(column.stage)}`} className="px-1 pb-1 text-small font-medium text-primary hover:underline">
          + {more} more
        </Link>
      ) : null}
    </section>
  );
}

function OppCard({ lead }: { lead: MockLead }) {
  const { company, role } = companyRole(lead);
  const unassigned = lead.owner === null;
  return (
    <Link href={`/leads/${lead.id}`} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-sm transition hover:border-primary/40 hover:shadow-card">
      <span className="flex items-start gap-2">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-medium text-text">{lead.name}</span>
          <span className="truncate text-small text-text-2">{company} · {role}</span>
        </span>
        <Badge tone={TEMP_TONE[lead.temperature]}>{lead.temperature}</Badge>
      </span>
      <span className="flex items-center justify-between gap-2 text-small">
        {unassigned ? (
          <span className="flex items-center gap-1.5 font-medium text-warn"><Icon name="user" size={14} /> Unassigned</span>
        ) : (
          <span className={cn("flex min-w-0 items-center gap-1.5 truncate", lead.next.kind === "booked" ? "text-info" : "text-text-2")}>
            {lead.next.kind === "booked" ? <Icon name="calendar" size={14} /> : null}
            <span className="truncate">{lead.next.text}</span>
          </span>
        )}
        {lead.owner ? <Avatar name={lead.owner} size={22} /> : null}
      </span>
    </Link>
  );
}

function ListView({ data, total }: { data: PipelineColumn[]; total: number }) {
  const rows = data.flatMap((c) => c.leads);
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="h-10 border-b border-border bg-surface-alt">
              {["Lead", "Company", "Stage", "Temp.", "Owner", "Next step"].map((h) => (
                <th key={h} className="px-4 text-cap font-semibold tracking-[0.5px] text-text-2 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="py-14 text-center text-body text-text-2">No opportunities match these filters.</td></tr>
            ) : rows.map((l) => {
              const { company, role } = companyRole(l);
              return (
                <tr key={l.id} className="h-14 border-b border-border last:border-b-0 hover:bg-surface-alt">
                  <td className="px-4">
                    <Link href={`/leads/${l.id}`} className="flex items-center gap-2.5">
                      <Avatar name={l.name} size={28} />
                      <span className="truncate text-body font-medium text-text">{l.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 text-body whitespace-nowrap text-text-2">{company} · {role}</td>
                  <td className="px-4"><StageBadge lead={l} /></td>
                  <td className="px-4"><TempBadge lead={l} /></td>
                  <td className="px-4"><OwnerCell owner={l.owner} /></td>
                  <td className="px-4"><NextStep next={l.next} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-4 py-3 text-small text-text-2">{formatNumber(total)} opportunities</div>
    </Card>
  );
}
