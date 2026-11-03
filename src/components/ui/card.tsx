import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-surface shadow-card", className)} {...rest} />;
}

export function CardHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="text-body font-semibold text-text">{title}</h2>
        {subtitle ? <p className="text-small text-text-2">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}
