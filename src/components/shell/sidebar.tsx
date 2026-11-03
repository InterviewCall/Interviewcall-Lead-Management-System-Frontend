"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { LogoMark } from "@/components/ui/logo";
import { Popover } from "@/components/ui/menu";
import { useAuth } from "@/features/auth/auth-provider";
import { useLogout } from "@/features/auth/hooks";
import { cn } from "@/lib/cn";
import { roleLabel } from "@/lib/roles";
import { visibleGroups } from "./nav";

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const logout = useLogout();
  if (!user) return null;
  const groups = visibleGroups(user.role);

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-sidebar p-4 lg:flex lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
      <div className="flex items-center gap-2.5 pb-5 pl-1">
        <LogoMark height={32} />
        <div className="flex flex-col">
          <span className="text-body font-semibold text-white">InterviewCall</span>
          <span className="text-small text-side-text">CRM</span>
        </div>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="pt-3.5 pb-1.5 pl-3 text-cap font-semibold tracking-[0.5px] text-side-text">{group.label}</p>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg border px-3 text-body transition",
                    active
                      ? "border-[rgba(130,140,247,0.35)] bg-nav-active font-medium text-white"
                      : "border-transparent text-side-text hover:bg-side-active/60 hover:text-white",
                  )}
                >
                  <Icon name={item.icon} size={18} className={active ? "text-white" : undefined} />
                  <span className="flex-1">{item.label}</span>
                  {item.count ? (
                    <span className="rounded-full bg-side-active px-2 py-px text-small font-medium text-side-text">{item.count}</span>
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
        className="w-52"
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex w-full items-center gap-2.5 rounded-[10px] bg-side-active p-2.5 text-left"
          >
            <Avatar name={user.name} />
            <span className="flex min-w-0 flex-1 flex-col text-small leading-4">
              <span className="truncate font-medium text-white">{user.name}</span>
              <span className="truncate text-side-text">{roleLabel(user.role)}</span>
            </span>
            <Icon name="chev" size={14} className="text-side-text" />
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
    </aside>
  );
}
