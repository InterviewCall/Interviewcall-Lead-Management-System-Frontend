"use client";

import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/ui/logo";
import { Popover } from "@/components/ui/menu";
import { useAuth } from "@/features/auth/auth-provider";
import { useLogout } from "@/features/auth/hooks";
import { useLeadTotal } from "@/features/leads/hooks";
import { useWaitingCount } from "@/features/assignment/hooks";
import { useMyDay } from "@/features/my-day/hooks";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { spring } from "@/lib/motion";
import { roleLabel } from "@/lib/roles";
import { visibleGroups } from "./nav";
import { useSidebarHover } from "./sidebar-state";

const WIDTH = { open: 240, closed: 72 } as const;
/** Slow start, soft landing: the rail glides instead of snapping. */
const GLIDE = { duration: 0.3, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] };

/** Tells the sidebar whether the account menu is open, so it stays open while the menu is in use. */
function ReportOpen({ open, onChange }: { open: boolean; onChange: (open: boolean) => void }) {
  useEffect(() => onChange(open), [open, onChange]);
  return null;
}

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const logout = useLogout();
  const leadTotal = useLeadTotal();
  const myDay = useMyDay();
  const waiting = useWaitingCount();
  const hover = useSidebarHover();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user) return null;
  const collapsed = !hover.open && !menuOpen;
  const groups = visibleGroups(user.role);
  // Text fades first and is clipped by its own box, so icons never move while the rail resizes.
  const fade = cn("min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-200", collapsed ? "opacity-0" : "opacity-100 delay-100");

  return (
    // The sidebar takes its room in the layout, so the page narrows alongside it as it opens and widens as it closes.
    <m.div
      initial={false}
      animate={{ width: collapsed ? WIDTH.closed : WIDTH.open }}
      transition={GLIDE}
      className="relative z-40 hidden shrink-0 lg:block"
    >
    <aside
      data-collapsed={collapsed}
      {...hover.handlers}
      className="sticky top-0 flex h-dvh w-full flex-col gap-1 bg-sidebar p-4"
    >

      <div className="flex items-center gap-2.5 pb-5 pl-1.5">
        <LogoMark height={32} />
        <div className={cn("flex flex-col", fade)}>
          <span className="font-display text-[15px] leading-5 font-bold tracking-[-0.2px] text-white">LeadNest</span>
          <span className="text-small text-side-text">by InterviewCall</span>
        </div>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <div className="relative h-[34px] pt-3.5 pb-1.5 pl-3">
              <p className={cn("text-small font-medium text-side-text/80", fade)}>{group.label}</p>
              <span aria-hidden className={cn("absolute right-2 bottom-[11px] left-2 h-px bg-white/10 transition-opacity duration-200", collapsed ? "opacity-100 delay-100" : "opacity-0")} />
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const pill =
                item.href === "/leads" ? (leadTotal === undefined ? null : formatNumber(leadTotal))
                : item.href === "/my-day" ? (myDay.data && myDay.data.kpis.due > 0 ? formatNumber(myDay.data.kpis.due) : null)
                : item.href === "/assignment" ? (waiting ? formatNumber(waiting) : null)
                : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-3 rounded-lg border border-transparent px-3 text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40",
                    active ? "font-medium text-white" : "text-side-text hover:bg-side-active/60 hover:text-white",
                  )}
                >
                  {active ? (
                    <m.span layoutId="sidebar-active" transition={spring} className="absolute -inset-px rounded-lg bg-nav-active">
                      <span className="absolute top-2 bottom-2 -left-px w-[3px] rounded-full bg-[#8b85ff]" />
                    </m.span>
                  ) : null}
                  <Icon name={item.icon} size={18} className={cn("relative shrink-0", active && "text-white")} />
                  <span className={cn("relative flex-1", fade)}>{item.label}</span>
                  {pill ? (
                    <span className={cn("nums shrink-0 rounded-full px-2 py-px text-small font-medium transition-opacity duration-200", active ? "bg-white/10 text-white" : "bg-white/5 text-side-text", collapsed ? "absolute right-2 opacity-0" : "relative opacity-100 delay-100")}>{pill}</span>
                  ) : null}
                  {pill && item.href !== "/leads" ? (
                    <span aria-hidden className={cn("absolute top-1.5 right-1.5 size-2 rounded-full bg-[#8b85ff] ring-2 ring-ink transition-opacity duration-200", collapsed ? "opacity-100 delay-100" : "opacity-0")} />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="min-h-4 flex-1" />

      <Popover
        up
        align="left"
        className="w-52"
        trigger={({ open, toggle: toggleMenu }) => (
          <>
          <ReportOpen open={open} onChange={setMenuOpen} />
          <button
            type="button"
            onClick={toggleMenu}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`${user.name}, account menu`}
            className={cn(
              "relative flex w-full items-center gap-2.5 rounded-[10px] bg-side-active text-left transition-[padding] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              collapsed ? "p-1" : "p-2.5",
            )}
          >
            <Avatar name={user.name} />
            <span className={cn("flex flex-1 flex-col text-small leading-4", fade)}>
              <span className="truncate font-medium text-white">{user.name}</span>
              <span className="truncate text-side-text">{roleLabel(user.role)}</span>
            </span>
            <Icon name="chev" size={14} className={cn("shrink-0 text-side-text transition-opacity duration-200", collapsed ? "absolute opacity-0" : "relative opacity-100 delay-100")} />
          </button>
          </>
        )}
      >
        <div role="menu" className="py-1">
          <Link role="menuitem" href="/change-password" className="flex items-center gap-2.5 px-3 py-2 text-body text-text hover:bg-surface-alt">
            <Icon name="key" size={16} /> Change password
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-body text-bad hover:bg-surface-alt"
          >
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      </Popover>
    </aside>
    </m.div>
  );
}
