import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
        <h1 className="font-display text-h1 font-bold text-text">{title}</h1>
        {subtitle ? <p className="text-body text-text-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
