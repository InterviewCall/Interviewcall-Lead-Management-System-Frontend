"use client";

import { m } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** The pill switcher used for role filters and tabs inside cards. The white pill glides to the chosen option. */
export function Segmented<T extends string>({
  options, value, onChange, ariaLabel,
}: { options: SegmentOption<T>[]; value: T; onChange: (value: T) => void; ariaLabel: string }) {
  const pillId = useId();
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex shrink-0 items-center gap-0.5 rounded-lg bg-bg p-[3px]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "relative h-7 rounded-md px-3 text-small font-medium whitespace-nowrap transition-colors",
              active ? "text-text" : "text-text-2 hover:text-text",
            )}
          >
            {active ? <m.span layoutId={pillId} transition={spring} className="absolute inset-0 rounded-md bg-surface shadow-sm" /> : null}
            <span className="relative">
              {o.label}
              {o.count !== undefined ? <span className="ml-1">{o.count}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
