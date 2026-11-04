"use client";

import { m } from "motion/react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { base, spring } from "@/lib/motion";

export const STEPS = ["Upload", "Map columns", "Setup", "Review", "Import"] as const;

export function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto border-b border-border px-5 py-4" aria-label="Import steps">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex shrink-0 items-center gap-2" aria-current={active ? "step" : undefined}>
            <m.span
              animate={{ scale: active ? 1.08 : 1 }}
              transition={spring}
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-small font-semibold transition-colors duration-200",
                done ? "bg-ok text-white" : active ? "bg-primary text-white" : "bg-bg text-text-2",
              )}
            >
              {done ? <Icon name="check" size={14} /> : i + 1}
            </m.span>
            <span className={cn("text-body font-medium whitespace-nowrap", active ? "text-text" : "text-text-2", !active && "max-sm:hidden")}>{label}</span>
            {i < STEPS.length - 1 ? (
              <span className="relative mx-1 h-px w-5 overflow-hidden bg-border-strong sm:w-8">
                <m.span
                  className="absolute inset-0 origin-left bg-ok"
                  initial={false}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={base}
                />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
