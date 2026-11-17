import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-border bg-surface shadow-card", className)} {...rest} />;
}

export function CardHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-border px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
        <h2 className="text-[15px] leading-5 font-semibold text-text">{title}</h2>
        {subtitle ? <p className="text-small text-text-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="max-w-full min-w-0">{actions}</div> : null}
    </div>
  );
}
