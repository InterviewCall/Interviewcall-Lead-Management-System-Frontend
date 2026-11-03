import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

const TONES = {
  primary: { chip: "bg-primary-soft text-primary", wash: "to-[#eef2ff]" },
  info: { chip: "bg-info-soft text-info", wash: "to-[#e0f2fe]" },
  violet: { chip: "bg-violet-soft text-violet", wash: "to-[#ede9fe]" },
  success: { chip: "bg-ok-soft text-ok", wash: "to-[#dcfce7]" },
  warning: { chip: "bg-warn-soft text-warn", wash: "to-[#fef3c7]" },
  danger: { chip: "bg-bad-soft text-bad", wash: "to-[#fee2e2]" },
} as const;

export type KpiTone = keyof typeof TONES;

/** Number card with a tinted corner, used at the top of most screens. */
export function KpiCard({
  label, value, icon, tone = "primary", hint, loading = false,
}: { label: string; value: string | number; icon: IconName; tone?: KpiTone; hint?: string; loading?: boolean }) {
  const t = TONES[tone];
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-gradient-to-br from-white from-55% p-3.5 shadow-card sm:gap-2.5 sm:p-5", t.wash)}>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px]", t.chip)}>
          <Icon name={icon} size={20} />
        </span>
        <span className="text-small font-medium text-text-2 sm:text-body">{label}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={cn("text-h1 font-bold text-text sm:text-display", loading && "animate-pulse text-muted")}>{loading ? "–" : value}</span>
        {hint ? <span className="text-small text-text-2">{hint}</span> : null}
      </div>
    </div>
  );
}
