import { cn } from "@/lib/cn";

const COLORS = [
  "bg-primary-soft text-primary",
  "bg-ok-soft text-ok",
  "bg-warn-soft text-warn",
  "bg-bad-soft text-bad",
  "bg-info-soft text-info",
] as const;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : (parts[0]![1] ?? "");
  return (first + last).toUpperCase();
}

/** The same name always gets the same colour. */
function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length]!;
}

export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size >= 40 ? 14 : 12 }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium", colorFor(name), className)}
    >
      {initialsOf(name)}
    </span>
  );
}
