"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import { fast } from "@/lib/motion";
import { useInbox, useInboxActions } from "./hooks";
import type { AppNotification, NotificationType } from "./types";

const LOOK: Record<NotificationType, { icon: IconName; chip: string }> = {
  NEW_ASSIGNMENT: { icon: "users", chip: "bg-info-soft text-info" },
  BOOKED_SLOT_UNASSIGNED: { icon: "calendar", chip: "bg-warn-soft text-warn" },
  SLOT_SOON: { icon: "clock", chip: "bg-primary-soft text-primary" },
  FOLLOWUP_OVERDUE: { icon: "clock", chip: "bg-bad-soft text-bad" },
  DUPLICATE_REVIEW: { icon: "users", chip: "bg-violet-soft text-violet" },
  LEAD_REENGAGED: { icon: "zap", chip: "bg-ok-soft text-ok" },
};

/** The bell: unread count on the button, the latest alerts in a panel under it. */
export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const inbox = useInbox();
  const { read, readAll } = useInboxActions();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = inbox.data?.unread ?? 0;
  const items = inbox.data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openOne(n: AppNotification) {
    if (!n.read) read.mutate(n.id);
    setOpen(false);
    router.push(n.lead ? `/leads/${n.lead.id}` : "/my-day");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn("relative flex items-center justify-center rounded-lg text-text-2 hover:bg-surface-alt", compact ? "size-9" : "size-10 border border-border")}
      >
        <Icon name="bell" size={18} />
        {unread > 0 ? (
          <span data-testid="bell-count" className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bad px-1 text-[11px] leading-none font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      <AnimatePresence>
        {open ? (
          <m.div
            role="dialog"
            aria-label="Notifications"
            style={{ transformOrigin: "top right" }}
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: fast }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
            className="fixed inset-x-3 top-[60px] z-40 overflow-hidden rounded-xl border border-border bg-surface shadow-pop sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[390px]"
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <h2 className="flex-1 text-body font-semibold text-text">Notifications</h2>
              <button
                type="button"
                disabled={unread === 0 || readAll.isPending}
                onClick={() => readAll.mutate()}
                className="text-small font-medium text-primary disabled:text-text-2 disabled:opacity-60"
              >
                Mark all read
              </button>
            </div>
            {inbox.isError && !inbox.data ? (
              <p className="px-4 py-8 text-center text-body text-text-2">Could not load your notifications.</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                <p className="text-body font-medium text-text">Nothing new</p>
                <p className="text-small text-text-2">New assignments, booked calls and follow-ups that go overdue show up here.</p>
              </div>
            ) : (
              <ul className="max-h-[min(70vh,480px)] overflow-y-auto" aria-label="Notifications list">
                {items.map((n) => {
                  const look = LOOK[n.type];
                  return (
                    <li key={n.id} className="bg-surface">
                      <button
                        type="button"
                        onClick={() => openOne(n)}
                        className={cn("flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-alt", !n.read && "bg-primary-soft/40")}
                      >
                        <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", look.chip)}>
                          <Icon name={look.icon} size={16} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className={cn("text-body text-text", !n.read && "font-medium")}>{n.message}</span>
                          <span className="truncate text-small text-text-2">
                            {n.lead ? `${n.lead.name} · ` : ""}
                            {relativeTime(n.createdAt)}
                          </span>
                        </span>
                        {!n.read ? <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-primary" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/my-day" onClick={() => setOpen(false)} className="flex h-11 items-center justify-center border-t border-border text-small font-medium text-primary hover:bg-surface-alt">
              Go to My day
            </Link>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
