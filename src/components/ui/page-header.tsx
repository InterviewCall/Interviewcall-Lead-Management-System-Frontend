import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
        <h1 className="text-h1 font-semibold text-text">{title}</h1>
        {subtitle ? <p className="text-body text-text-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
