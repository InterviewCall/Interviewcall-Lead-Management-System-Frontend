import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/roles";

const TONE: Record<Tone, { box: string; dot: string }> = {
  neutral: { box: "bg-surface-alt border border-border text-text-2", dot: "bg-muted" },
  primary: { box: "bg-primary-soft text-primary", dot: "bg-primary" },
  success: { box: "bg-ok-soft text-ok", dot: "bg-ok" },
  warning: { box: "bg-warn-soft text-warn", dot: "bg-warn" },
  danger: { box: "bg-bad-soft text-bad", dot: "bg-bad" },
  info: { box: "bg-info-soft text-info", dot: "bg-info" },
  violet: { box: "bg-violet-soft text-violet", dot: "bg-violet" },
};

/** Pill with a leading dot: pipeline stages, roles and statuses. */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-2 text-small font-medium whitespace-nowrap",
        t.box,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", t.dot)} />
      {children}
    </span>
  );
}
