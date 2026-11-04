"use client";

import { m } from "motion/react";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { STAGE, STAGE_ORDER } from "./lead-display";
import type { LeadDetail, StageCode } from "./types";

const CHEVRON = "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)";
const FIRST = "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)";
const LAST = "polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)";

const dayInStage = (iso: string) => Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) + 1);

/**
 * The opportunity as a path: where the lead is, how long it has been there, and (for people who may
 * mark leads) a click on any step moves it there. The fill sweeps along the path when the stage
 * changes.
 */
export function StagePath({
  opportunity,
  canMove,
  canWin,
  busy,
  onMove,
}: {
  opportunity: NonNullable<LeadDetail["opportunity"]>;
  canMove: boolean;
  canWin: boolean;
  busy: boolean;
  onMove: (stage: StageCode) => void;
}) {
  const open = opportunity.status === "OPEN";
  const won = opportunity.status === "WON";
  const lost = opportunity.status === "LOST";
  const current = STAGE_ORDER.indexOf(opportunity.stage);
  const scroller = useRef<HTMLOListElement>(null);

  // On a phone the path is wider than the screen: keep the current step in view.
  useEffect(() => {
    const box = scroller.current;
    const step = box?.children[current] as HTMLElement | undefined;
    if (!box || !step) return;
    box.scrollTo({ left: step.offsetLeft - box.clientWidth / 2 + step.clientWidth / 2, behavior: "smooth" });
  }, [current]);

  return (
    <ol ref={scroller} aria-label="Pipeline stage" className="flex snap-x overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STAGE_ORDER.map((code, i) => {
        const done = won ? true : i < current;
        const isCurrent = i === current;
        const clickable = open && canMove && !isCurrent && !busy && (code !== "CLOSED_WON" || canWin);
        const shape = i === 0 ? FIRST : i === STAGE_ORDER.length - 1 ? LAST : CHEVRON;
        const wonStep = won && isCurrent;
        const lostStep = lost && isCurrent;
        const Tag = clickable ? "button" : "div";
        return (
          <li key={code} className={cn("min-w-[116px] flex-1 snap-center", i > 0 && "-ml-2.5")} aria-current={isCurrent ? "step" : undefined}>
            <Tag
              {...(clickable ? { type: "button" as const, onClick: () => onMove(code), title: `Move to ${STAGE[code].label}` } : {})}
              style={{ clipPath: shape }}
              className={cn(
                "relative flex h-11 w-full items-center justify-center gap-1.5 px-5 text-center text-small leading-tight font-medium transition-colors",
                i === 0 ? "pl-3" : "",
                done || isCurrent ? "text-white" : "bg-surface-alt text-text-2",
                clickable && "cursor-pointer hover:bg-primary-soft hover:text-primary focus-visible:bg-primary-soft focus-visible:text-primary",
                !open && !isCurrent && !done && "opacity-70",
              )}
            >
              {/* The colour that sweeps in, step by step. */}
              <m.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: done || isCurrent ? 1 : 0 }}
                transition={{ ...spring, delay: Math.min(i, current >= 0 ? current : i) * 0.05 }}
                style={{ transformOrigin: "left" }}
                className={cn("absolute inset-0", lostStep ? "bg-bad" : wonStep || (won && done) ? "bg-ok" : isCurrent ? "bg-primary" : "bg-primary/75")}
              />
              <span className="relative flex items-center gap-1.5">
                {done && !isCurrent ? <Icon name="check" size={13} /> : null}
                <span className="line-clamp-2">{STAGE[code].label}</span>
              </span>
            </Tag>
            {isCurrent ? (
              <m.p key={opportunity.stageChangedAt} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="mt-1 px-2 text-center text-[11px] text-muted">
                {won ? "Won" : lost ? "Lost here" : `Day ${dayInStage(opportunity.stageChangedAt)} in this stage`}
              </m.p>
            ) : (
              <p className="mt-1 h-[16.5px]" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
