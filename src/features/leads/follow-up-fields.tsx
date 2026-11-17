"use client";

import { Field, TextInput } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time. */
export function local(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function at(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return local(d);
}

/** The quick choices under the date: each gives the local value the input takes. */
export function quickDueOptions(now = new Date()): Array<{ label: string; value: string }> {
  const inAnHour = new Date(now.getTime() + 60 * 60_000);
  inAnHour.setSeconds(0, 0);
  return [
    { label: "In 1 hour", value: local(inAnHour) },
    { label: "Tomorrow, 10 am", value: at(1, 10) },
    { label: "In 3 days", value: at(3, 10) },
    { label: "Next week", value: at(7, 10) },
  ];
}

/** The ISO time the API wants, from the local value the input holds. Empty in, empty out. */
export function dueToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function DueField({ value, onChange, error, label = "Due" }: { value: string; onChange: (value: string) => void; error?: string; label?: string }) {
  const options = quickDueOptions();
  return (
    <div className="flex flex-col gap-2">
      <Field label={label} error={error}>{({ id, describedBy, invalid }) => (
        <TextInput id={id} type="datetime-local" value={value} min={local(new Date())} onChange={(e) => onChange(e.target.value)} invalid={invalid} aria-describedby={describedBy} />
      )}</Field>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn("h-7 rounded-full px-3 text-small font-medium ring-1 transition", value === o.value ? "bg-primary-soft text-primary ring-primary/30" : "bg-surface text-text-2 ring-border hover:text-text")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
