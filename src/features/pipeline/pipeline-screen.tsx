"use client";

import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { m } from "motion/react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { canCloseWon, canMark } from "@/features/leads/marking";
import { HeatBars, STAGE, StageChip, TempChip, TEMPERATURE } from "@/features/leads/lead-display";
import type { StageCode, TemperatureCode } from "@/features/leads/types";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { base, spring, STAGGER } from "@/lib/motion";
import { getPipeline, pipelineKeys } from "./api";
import { useMoveCard } from "./hooks";
import { STAGE_COLOR, STAGE_SHORT } from "./stage-colors";
import type { BoardCard, BoardColumn, PipelineQuery } from "./types";

type Mode = "board" | "list";
/** Cards loaded per stage: a few for the board, many for the list. */
const BOARD_CARDS = 8;
const LIST_CARDS = 40;
/** The board shows this many cards in a column before "+ N more". */
const SHOWN_IN_COLUMN = 5;

const whenFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function PipelineScreen() {
  const { user } = useAuth();
  const role = user?.role ?? "OPS";
  const canDrag = canMark(role);
  const [mode, setMode] = useState<Mode>("board");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [temperature, setTemperature] = useState<TemperatureCode | "">("");
  const [ownerId, setOwnerId] = useState("");
  const [mobileStage, setMobileStage] = useState<StageCode>("CALL_1_PENDING");
  const [winTarget, setWinTarget] = useState<{ id: string; name: string } | null>(null);
  const toast = useToast();
  const move = useMoveCard();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageCode | null>(null);
  const query: PipelineQuery = { temperature, ownerId, perColumn: mode === "list" ? LIST_CARDS : BOARD_CARDS };
  const pipeline = useQuery({ queryKey: pipelineKeys.query(query), queryFn: () => getPipeline(query), placeholderData: keepPreviousData, refetchOnWindowFocus: true });
  const data = pipeline.data;
  const activeFilters = Number(Boolean(temperature)) + Number(Boolean(ownerId));

  function moveCard(id: string, name: string, stage: StageCode) {
    move.mutate(
      { id, stage },
      {
        onSuccess: () => toast.show(stage === "CLOSED_WON" ? `${name} is now Enrolled.` : `${name} moved to ${STAGE[stage].label}.`),
        onError: (e) => toast.show(errorMessage(e), "error"),
      },
    );
  }

  function dropOn(stage: StageCode) {
    const id = dragId;
    setDragId(null);
    setOverStage(null);
    const from = data?.columns.find((c) => c.cards.some((card) => card.id === id));
    const card = from?.cards.find((c) => c.id === id);
    if (!id || !card || !from || from.stage === stage) return;
    if (stage === "CLOSED_WON") return setWinTarget({ id, name: card.name });
    moveCard(id, card.name, stage);
  }

  const mobileColumn = data?.columns.find((c) => c.stage === mobileStage) ?? data?.columns[0];
  const owners = data?.owners ?? [];

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle={data ? `${formatNumber(data.open)} open opportunities across 7 stages · ${formatNumber(data.wonThisMonth)} won this month` : "Loading the pipeline…"}
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
          <Select aria-label="Temperature" value={temperature} onChange={(e) => setTemperature(e.target.value as TemperatureCode | "")} className="h-9 w-auto min-w-36">
            <option value="">Temperature</option>
            {(Object.keys(TEMPERATURE) as TemperatureCode[]).map((t) => <option key={t} value={t}>{TEMPERATURE[t].label}</option>)}
          </Select>
          {owners.length > 0 || ownerId ? (
            <Select aria-label="Owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="h-9 w-auto min-w-36">
              <option value="">Owner</option>
              <option value="none">Unassigned</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          ) : null}
          {activeFilters > 0 ? (
            <button type="button" onClick={() => { setTemperature(""); setOwnerId(""); }} className="px-2 text-body font-medium text-primary">Clear</button>
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
                Win rate this month
                <span className="text-h2 font-semibold text-ok" title={data.winRate === null ? "Nothing has closed this month yet" : `${data.wonThisMonth} won, ${data.lostThisMonth} lost`}>
                  {data.winRate === null ? "—" : `${data.winRate.toFixed(1)}%`}
                </span>
              </span>
            ) : null
          }
        />
        <div className="flex flex-col gap-3 p-5">
          <div className="h-3 overflow-hidden rounded-full bg-bg" role="img" aria-label="Opportunities by stage">
            <m.div
              className="flex h-full gap-0.5"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              {(data?.columns ?? []).filter((c) => c.count > 0).map((c) => (
                <m.span layout transition={spring} key={c.stage} style={{ flexGrow: c.count, backgroundColor: STAGE_COLOR[c.stage] }} className="min-w-1" />
              ))}
            </m.div>
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
            {/* Columns share the full width; empty stages fold into narrow strips so the busy ones get the room. */}
            <div className="flex w-full items-start gap-2.5">
              {data.columns.map((c, i) => (
                <BoardColumnView
                  key={c.stage}
                  column={c}
                  index={i}
                  canDrag={canDrag}
                  accepts={canDrag && (c.stage !== "CLOSED_WON" || canCloseWon(role))}
                  dragging={dragId !== null}
                  isOver={overStage === c.stage}
                  draggingId={dragId}
                  onOver={setOverStage}
                  onDrop={dropOn}
                  onDragStart={setDragId}
                  onDragEnd={() => { setDragId(null); setOverStage(null); }}
                />
              ))}
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
                  <Tile label="All open" value={data.open} />
                </div>
                {mobileColumn.cards.length === 0 ? (
                  <p className="rounded-xl border border-border bg-surface py-10 text-center text-body text-text-2 shadow-card">
                    {mobileColumn.count > 0 ? `${mobileColumn.count} closed this month.` : "Nothing in this stage."}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {mobileColumn.cards.map((card) => <li key={card.id}><OppCard card={card} /></li>)}
                  </ul>
                )}
                <MoreLink column={mobileColumn} shown={mobileColumn.cards.length} />
              </>
            ) : null}
          </div>
        </>
      ) : (
        <ListView columns={data.columns} open={data.open} />
      )}

      <ConfirmDialog
        open={winTarget !== null}
        title="Close as won?"
        confirmLabel="Close as won"
        loading={move.isPending}
        onCancel={() => setWinTarget(null)}
        onConfirm={() => {
          if (!winTarget) return;
          const target = winTarget;
          setWinTarget(null);
          moveCard(target.id, target.name, "CLOSED_WON");
        }}
      >
        Close {winTarget?.name ?? "this lead"} as won only after payment or financing is complete. The opportunity closes as won, the contact stage becomes Enrolled, and all pre-sales communication stops. Only a manager can move an enrolled lead back.
      </ConfirmDialog>
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

/** "+ N more" when the column holds more than is shown. Closed Won has nothing to open it into. */
function MoreLink({ column, shown }: { column: BoardColumn; shown: number }) {
  const more = column.count - shown;
  if (more <= 0) return null;
  if (column.stage === "CLOSED_WON") return <p className="px-1 pb-1 text-small text-text-2">+ {more} more won this month</p>;
  return (
    <Link href={`/leads?stage=${column.stage}`} className="px-1 pb-1 text-small font-medium text-primary hover:underline">
      + {more} more
    </Link>
  );
}

interface BoardColumnProps {
  column: BoardColumn;
  index: number;
  canDrag: boolean;
  /** Whether this column takes a dropped card. */
  accepts: boolean;
  dragging: boolean;
  isOver: boolean;
  draggingId: string | null;
  onOver: (stage: StageCode | null) => void;
  onDrop: (stage: StageCode) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

function BoardColumnView({ column, index, canDrag, accepts, dragging, isOver, draggingId, onOver, onDrop, onDragStart, onDragEnd }: BoardColumnProps) {
  const shown = column.cards.slice(0, SHOWN_IN_COLUMN);
  const won = column.stage === "CLOSED_WON";
  // An empty stage folds into a strip, and opens again while a card is being dragged so it can take the drop.
  const folded = column.count === 0 && shown.length === 0 && !(dragging && accepts);
  if (folded) {
    return (
      <m.section
        layout
        aria-label={`${STAGE[column.stage].label}: nothing here`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...base, delay: index * STAGGER }}
        title={`${STAGE[column.stage].label}: nothing here`}
        className="relative flex min-h-[220px] w-[52px] shrink-0 flex-col items-center gap-3 overflow-hidden rounded-card bg-[#e9ebf2]/70 px-1 pt-3.5 pb-4"
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: STAGE_COLOR[column.stage] }} />
        <span className="nums font-display text-[15px] leading-5 font-bold text-muted">0</span>
        <h2 className="text-body font-semibold whitespace-nowrap text-text-2 [writing-mode:vertical-rl]">{STAGE[column.stage].label}</h2>
      </m.section>
    );
  }
  return (
    <m.section
      layout
      aria-label={STAGE[column.stage].label}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...base, delay: index * STAGGER }}
      onDragOver={(e) => {
        if (!dragging || !accepts) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isOver) onOver(column.stage);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onOver(null);
      }}
      onDrop={(e) => {
        if (!accepts) return;
        e.preventDefault();
        onDrop(column.stage);
      }}
      className={cn(
        "relative flex max-w-[420px] min-w-[180px] flex-1 basis-0 flex-col gap-2 overflow-hidden rounded-card p-2.5 pt-3 transition-colors",
        isOver ? "bg-primary-soft ring-2 ring-primary/40" : "bg-[#e9ebf2]/70",
      )}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: STAGE_COLOR[column.stage] }} />
      <header className="flex items-baseline gap-2 px-1 pb-0.5">
        <h2 title={STAGE[column.stage].label} className="min-w-0 flex-1 truncate text-body font-semibold text-text">{STAGE[column.stage].label}</h2>
        <span className="nums font-display text-[15px] leading-5 font-bold text-text-2">{column.count.toLocaleString("en-IN")}</span>
      </header>
      {shown.length === 0 ? (
        <p className={cn("rounded-lg border border-dashed px-1 py-6 text-center text-small", dragging && accepts ? "border-primary/40 text-primary" : "border-transparent text-muted")}>
          {dragging && accepts ? "Drop here" : column.count > 0 ? `${column.count} closed this month` : "Nothing here"}
        </p>
      ) : (
        shown.map((card) => (
          <OppCard key={card.id} card={card} board draggable={canDrag && !won} dimmed={draggingId === card.id} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        ))
      )}
      <MoreLink column={column} shown={shown.length} />
    </m.section>
  );
}

interface OppCardProps {
  card: BoardCard;
  /** Board cards glide to their new column. Phone cards stay plain. */
  board?: boolean;
  draggable?: boolean;
  dimmed?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}

function subtitle(card: BoardCard): string {
  const parts = [card.company, card.domain].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" · ") : card.source;
}

function OppCard({ card, board = false, draggable = false, dimmed = false, onDragStart, onDragEnd }: OppCardProps) {
  const unassigned = card.owner === null;
  const link = (
    <Link
      href={`/leads/${card.id}`}
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", card.id);
              onDragStart?.(card.id);
            }
          : undefined
      }
      onDragEnd={draggable ? onDragEnd : undefined}
      className={cn(
        "relative flex flex-col gap-2 overflow-hidden rounded-[10px] border border-border bg-surface p-3 pl-3.5 shadow-card transition hover:border-border-strong hover:shadow-raise",
        draggable && "cursor-grab active:cursor-grabbing",
        dimmed && "opacity-40",
      )}
    >
      {card.temperature ? <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", HEAT_EDGE[card.temperature])} /> : null}
      <span className="flex items-start gap-2">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-semibold text-text">{card.name}</span>
          <span className="truncate text-small text-text-2">{subtitle(card)}</span>
        </span>
        {card.temperature ? (
          <span title={`${TEMPERATURE[card.temperature].label} lead`} className="mt-1"><HeatBars code={card.temperature} /></span>
        ) : null}
      </span>
      <span className="flex items-center justify-between gap-2 text-small">
        {unassigned ? (
          <span className="flex items-center gap-1.5 font-medium text-warn"><Icon name="user" size={14} /> Unassigned</span>
        ) : (
          <CardNext next={card.next} compact={board} />
        )}
        {card.owner ? <Avatar name={card.owner.name} size={22} /> : null}
      </span>
    </Link>
  );
  if (!board) return link;
  return (
    <m.div layout="position" layoutId={`opp-${card.id}`} transition={spring}>
      {link}
    </m.div>
  );
}

const HEAT_EDGE = { HOT: "bg-hot", WARM: "bg-warm", COLD: "bg-cold" } as const;

/** The next step in the little room a card has. */
/** On a board card the icon says what it is (clock: follow-up, calendar: booked call), so only the time is written. */
function CardNext({ next, compact = false }: { next: BoardCard["next"]; compact?: boolean }) {
  if (next.kind === "none" || !next.at) return <span className="truncate text-muted">No follow-up set</span>;
  const when = whenFormat.format(new Date(next.at));
  const full = next.kind === "booked" ? `Call ${when}` : `Follow up ${when}`;
  return (
    <span title={full} className={cn("flex min-w-0 items-center gap-1.5", next.kind === "booked" ? "text-info" : "text-text-2")}>
      <Icon name={next.kind === "booked" ? "calendar" : "clock"} size={14} className="shrink-0" />
      <span className="truncate">{compact ? when : full}</span>
    </span>
  );
}

function ListView({ columns, open }: { columns: BoardColumn[]; open: number }) {
  const rows = columns.filter((c) => c.stage !== "CLOSED_WON").flatMap((c) => c.cards.map((card) => ({ card, stage: c.stage })));
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="h-10 border-b border-border bg-surface-alt">
              {["Lead", "Company", "Stage", "Heat", "Owner", "Next step"].map((h) => (
                <th key={h} className="px-4 text-small font-medium text-text-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="py-14 text-center text-body text-text-2">No opportunities match these filters.</td></tr>
            ) : rows.map(({ card, stage }) => (
              <tr key={card.id} className="h-14 border-b border-border last:border-b-0 hover:bg-surface-alt">
                <td className="px-4">
                  <Link href={`/leads/${card.id}`} className="flex items-center gap-2.5">
                    <Avatar name={card.name} size={28} />
                    <span className="truncate text-body font-medium text-text">{card.name}</span>
                  </Link>
                </td>
                <td className="max-w-[320px] truncate px-4 text-body text-text-2" title={subtitle(card) || undefined}>{subtitle(card)}</td>
                <td className="px-4"><StageChip code={stage} /></td>
                <td className="px-4 whitespace-nowrap"><TempChip code={card.temperature} /></td>
                <td className="px-4">
                  {card.owner ? (
                    <span className="flex items-center gap-2"><Avatar name={card.owner.name} size={24} /><span className="truncate text-body text-text">{card.owner.name}</span></span>
                  ) : (
                    <span className="text-body text-muted">Unassigned</span>
                  )}
                </td>
                <td className="px-4 whitespace-nowrap"><CardNext next={card.next} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-small text-text-2">
        <span>
          {rows.length < open
            ? `Showing ${formatNumber(rows.length)} of ${formatNumber(open)} open opportunities, the newest in each stage`
            : `${formatNumber(open)} open opportunities`}
        </span>
        {rows.length < open ? <Link href="/leads" className="font-medium text-primary hover:underline">Open the full leads list</Link> : null}
      </div>
    </Card>
  );
}
