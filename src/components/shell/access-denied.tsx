"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { Icon } from "@/components/ui/icon";
import { canOpen } from "./nav";

/** Hides screens the role cannot open. The API enforces this too; this only avoids dead-end pages. */
export function RoleGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user || canOpen(user.role, pathname)) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center shadow-card">
      <span className="flex size-12 items-center justify-center rounded-full bg-warn-soft text-warn"><Icon name="lock" size={22} /></span>
      <h1 className="text-h2 font-semibold text-text">You do not have access to this screen</h1>
      <p className="max-w-sm text-body text-text-2">Ask an admin if you need it for your work.</p>
      <Link href="/my-day" className="text-body font-medium text-primary hover:underline">Back to My day</Link>
    </div>
  );
}
