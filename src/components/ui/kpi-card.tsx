import { AnimatedValue } from "@/components/motion/animated-value";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

const TONES = {
  primary: "text-primary",
  info: "text-info",
  violet: "text-violet",
  success: "text-ok",
  warning: "text-warn",
  danger: "text-bad",
} as const;

export type KpiTone = keyof typeof TONES;

/**
 * A figure with its label, used at the top of most screens. The number is the point: large display figures, a small
 * coloured icon beside the label, and a hint underneath (how it compares, what is late).
 */
export function KpiCard({
  label, value, icon, tone = "primary", hint, loading = false,
}: { label: string; value: string | number; icon: IconName; tone?: KpiTone; hint?: string; loading?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={16} className={cn("shrink-0", TONES[tone])} />
        <span className="truncate text-small font-medium text-text-2 sm:text-body">{label}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <AnimatedValue value={loading ? "–" : value} className={cn("nums font-display text-[26px] leading-8 font-bold tracking-[-0.5px] text-text sm:text-display", loading && "animate-pulse text-muted")} />
        {hint ? <span className="text-small text-text-2">{hint}</span> : null}
      </div>
    </div>
  );
}
