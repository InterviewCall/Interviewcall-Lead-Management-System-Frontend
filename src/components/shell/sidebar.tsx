"use client";

import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/ui/logo";
import { Popover } from "@/components/ui/menu";
import { useAuth } from "@/features/auth/auth-provider";
import { useLogout } from "@/features/auth/hooks";
import { useLeadTotal } from "@/features/leads/hooks";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { spring } from "@/lib/motion";
import { roleLabel } from "@/lib/roles";
import { visibleGroups } from "./nav";
import { useSidebar, useSidebarShortcut } from "./sidebar-state";

const WIDTH = { open: 240, closed: 72 } as const;
/** Slow start, soft landing: the rail glides instead of snapping. */
const GLIDE = { duration: 0.3, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] };

/** A label that appears beside a collapsed icon on hover or keyboard focus. */
function Tip({ children }: { children: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 translate-x-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-small font-medium whitespace-nowrap text-white opacity-0 shadow-pop transition duration-150 group-hover/tip:translate-x-0 group-hover/tip:opacity-100 group-hover/tip:delay-300 group-focus-visible/tip:translate-x-0 group-focus-visible/tip:opacity-100"
    >
      {children}
    </span>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const logout = useLogout();
  const leadTotal = useLeadTotal();
  const { collapsed, toggle } = useSidebar();
  useSidebarShortcut(toggle);
  if (!user) return null;
  const groups = visibleGroups(user.role);
  // Text fades first and is clipped by its own box, so icons never move while the rail resizes.
  const fade = cn("min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-200", collapsed ? "opacity-0" : "opacity-100 delay-100");

  return (
    <m.aside
      initial={false}
      animate={{ width: collapsed ? WIDTH.closed : WIDTH.open }}
      transition={GLIDE}
      data-collapsed={collapsed}
      className="relative z-30 hidden shrink-0 flex-col gap-1 bg-sidebar p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh"
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand sidebar  [" : "Collapse sidebar  ["}
        className="group/edge absolute top-[22px] -right-3 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-surface text-text-2 shadow-card transition hover:scale-110 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
      >
        <m.span animate={{ rotate: collapsed ? 0 : 180 }} transition={GLIDE} className="flex">
          <Icon name="right" size={14} />
        </m.span>
      </button>

      <div className="flex items-center gap-2.5 pb-5 pl-1.5">
        <LogoMark height={32} />
        <div className={cn("flex flex-col", fade)}>
          <span className="text-body font-semibold text-white">InterviewCall</span>
          <span className="text-small text-side-text">CRM</span>
        </div>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <div className="relative h-[34px] pt-3.5 pb-1.5 pl-3">
              <p className={cn("text-cap font-semibold tracking-[0.5px] text-side-text", fade)}>{group.label}</p>
              <span aria-hidden className={cn("absolute right-2 bottom-[11px] left-2 h-px bg-white/10 transition-opacity duration-200", collapsed ? "opacity-100 delay-100" : "opacity-0")} />
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const pill = item.href === "/leads" ? (leadTotal === undefined ? null : formatNumber(leadTotal)) : (item.count ?? null);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group/tip relative flex h-10 items-center gap-3 rounded-lg border border-transparent px-3 text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40",
                    active ? "font-medium text-white" : "text-side-text hover:bg-side-active/60 hover:text-white",
                  )}
                >
                  {active ? (
                    <m.span
                      layoutId="sidebar-active"
                      transition={spring}
                      className="absolute -inset-px rounded-lg border border-[rgba(130,140,247,0.35)] bg-nav-active"
                    />
                  ) : null}
                  <Icon name={item.icon} size={18} className={cn("relative shrink-0", active && "text-white")} />
                  <span className={cn("relative flex-1", fade)}>{item.label}</span>
                  {pill ? (
                    <span className={cn("shrink-0 rounded-full bg-side-active px-2 py-px text-small font-medium text-side-text transition-opacity duration-200", collapsed ? "absolute right-2 opacity-0" : "relative opacity-100 delay-100")}>{pill}</span>
                  ) : null}
                  {pill && item.href !== "/leads" ? (
                    <span aria-hidden className={cn("absolute top-1.5 right-1.5 size-2 rounded-full bg-primary transition-opacity duration-200", collapsed ? "opacity-100 delay-100" : "opacity-0")} />
                  ) : null}
                  {collapsed ? <Tip>{item.label}</Tip> : null}
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
          <button
            type="button"
            onClick={toggleMenu}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`${user.name}, account menu`}
            className={cn(
              "group/tip relative flex w-full items-center gap-2.5 rounded-[10px] bg-side-active text-left transition-[padding] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              collapsed ? "p-1" : "p-2.5",
            )}
          >
            <Avatar name={user.name} />
            <span className={cn("flex flex-1 flex-col text-small leading-4", fade)}>
              <span className="truncate font-medium text-white">{user.name}</span>
              <span className="truncate text-side-text">{roleLabel(user.role)}</span>
            </span>
            <Icon name="chev" size={14} className={cn("shrink-0 text-side-text transition-opacity duration-200", collapsed ? "absolute opacity-0" : "relative opacity-100 delay-100")} />
            {collapsed && !open ? <Tip>{user.name}</Tip> : null}
          </button>
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
    </m.aside>
  );
}
