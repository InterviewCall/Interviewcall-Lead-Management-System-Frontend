"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { openPalette } from "./command-palette";
import { ADD_LEAD_ROLES } from "./nav";

export function Topbar() {
  const { user } = useAuth();
  const canAdd = Boolean(user && ADD_LEAD_ROLES.includes(user.role));
  return (
    <header className="sticky top-0 z-20 hidden h-16 items-center gap-4 border-b border-border bg-surface px-8 lg:flex">
      <button
        type="button"
        onClick={openPalette}
        className="group flex h-10 w-[420px] max-w-full items-center gap-2.5 rounded-xl border border-border bg-surface-alt px-3 text-left transition hover:border-border-strong hover:bg-surface"
      >
        <Icon name="search" size={16} className="text-muted group-hover:text-text-2" />
        <span className="min-w-0 flex-1 truncate text-body text-muted">Find a lead by name, phone or email</span>
        <kbd className="rounded-md border border-border bg-surface px-1.5 py-px text-[11px] font-medium text-muted">⌘K</kbd>
      </button>
      <div className="flex-1" />
      <NotificationBell />
      {canAdd ? (
        <Link href="/leads?new=1" className="flex h-9 items-center gap-2 rounded-lg bg-cta px-3.5 text-body font-semibold text-white shadow-cta transition hover:brightness-110 active:scale-[0.97]">
          <Icon name="plus" size={16} />
          New lead
        </Link>
      ) : null}
    </header>
  );
}
