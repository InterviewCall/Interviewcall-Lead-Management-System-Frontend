import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** The pill switcher used for role filters and tabs inside cards. */
export function Segmented<T extends string>({
  options, value, onChange, ariaLabel,
}: { options: SegmentOption<T>[]; value: T; onChange: (value: T) => void; ariaLabel: string }) {
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
              "h-7 rounded-md px-3 text-small font-medium whitespace-nowrap",
              active ? "bg-surface text-text shadow-sm" : "text-text-2 hover:text-text",
            )}
          >
            {o.label}
            {o.count !== undefined ? <span className="ml-1">{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
