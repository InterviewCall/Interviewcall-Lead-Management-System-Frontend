import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const STYLE = {
  error: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  warning: "bg-warn-soft text-warn",
  success: "bg-ok-soft text-ok",
} as const;

export function Alert({ tone = "error", children, className }: { tone?: keyof typeof STYLE; children: ReactNode; className?: string }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-body", STYLE[tone], className)}>
      <Icon name={tone === "info" || tone === "success" ? "info" : "warn"} size={16} className="mt-0.5" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
