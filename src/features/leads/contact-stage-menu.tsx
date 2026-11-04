"use client";

import { Icon } from "@/components/ui/icon";
import { Popover } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/roles";
import { LIFECYCLE } from "./lead-display";
import { CONTACT_STAGES, contactStageAccess } from "./marking";
import type { LifecycleCode } from "./types";
import { m, AnimatePresence } from "motion/react";
import { fast } from "@/lib/motion";

const TONE_CHIP = {
  neutral: "bg-surface-alt text-text-2 border border-border",
  primary: "bg-primary-soft text-primary",
  success: "bg-ok-soft text-ok",
  warning: "bg-warn-soft text-warn",
  danger: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
} as const;

/**
 * The contact stage as a chip. For people who may mark leads it opens a list of every stage with
 * what it means; stages they may not pick are greyed out with the reason underneath.
 */
export function ContactStageMenu({
  current,
  role,
  editable,
  busy,
  onPick,
}: {
  current: LifecycleCode;
  role: Role;
  editable: boolean;
  busy: boolean;
  onPick: (stage: LifecycleCode) => void;
}) {
  const meta = LIFECYCLE[current];
  const chip = (
    <AnimatePresence mode="wait" initial={false}>
      <m.span key={current} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: fast }} exit={{ opacity: 0, y: -4, transition: { duration: 0.08 } }} className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-current opacity-70" />
        {meta.label}
      </m.span>
    </AnimatePresence>
  );
  if (!editable) {
    return <span className={cn("inline-flex h-7 items-center rounded-full px-2.5 text-small font-medium", TONE_CHIP[meta.tone])} title="Contact stage">{chip}</span>;
  }
  return (
    <Popover
      align="left"
      className="w-[340px] max-w-[calc(100vw-2rem)] p-1.5"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-haspopup="listbox"
          aria-expanded={open}
          title="Contact stage: click to change"
          className={cn("inline-flex h-7 items-center gap-1 rounded-full pr-1.5 pl-2.5 text-small font-medium transition hover:brightness-95 active:scale-[0.97] disabled:opacity-60", TONE_CHIP[meta.tone])}
        >
          {chip}
          <Icon name="chev" size={14} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      )}
    >
      {({ close }) => (
        <div role="listbox" aria-label="Contact stage" className="flex flex-col">
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">Contact stage</p>
          {CONTACT_STAGES.map(({ code, hint }) => {
            const access = contactStageAccess(role, current, code);
            const selected = code === current;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={!access.ok}
                onClick={() => {
                  close();
                  if (!selected) onPick(code);
                }}
                className={cn(
                  "flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                  access.ok ? "hover:bg-surface-alt" : "cursor-not-allowed opacity-55",
                  selected && "bg-primary-soft/60",
                )}
              >
                <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-white" : "border-border-strong")}>
                  {selected ? <Icon name="check" size={10} /> : null}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-body font-medium text-text">{LIFECYCLE[code].label}</span>
                  <span className="text-small text-text-2">{access.ok ? hint : (access.why ?? hint)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}
