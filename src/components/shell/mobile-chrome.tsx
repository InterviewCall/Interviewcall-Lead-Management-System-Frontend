"use client";

import { m } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { TAB_BAR, titleFor } from "./nav";

/** Phone header: back arrow on detail pages, title, bell. */
export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const detail = pathname.startsWith("/leads/");
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface px-4 lg:hidden">
      {detail ? (
        <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-1 flex size-9 items-center justify-center rounded-lg">
          <Icon name="back" size={20} className="text-text" />
        </button>
      ) : null}
      <h1 className="flex-1 truncate text-h2 font-semibold text-text">{titleFor(pathname)}</h1>
      {detail ? null : (
        <Link href="/leads?new=1" aria-label="New lead" className="flex h-9 items-center gap-1.5 rounded-lg bg-cta px-3 text-body font-medium text-white shadow-cta active:brightness-95">
          <Icon name="plus" size={16} />
          New
        </Link>
      )}
      <Link href="/leads" aria-label="Search leads" className="flex size-9 items-center justify-center rounded-lg text-text-2">
        <Icon name="search" size={18} />
      </Link>
      <button type="button" aria-label="Notifications" className="flex size-9 items-center justify-center rounded-lg text-text-2">
        <Icon name="bell" size={18} />
      </button>
    </header>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex h-[72px] items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {TAB_BAR.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn("relative flex flex-1 flex-col items-center justify-center gap-1 text-small font-medium transition-colors active:scale-95", active ? "text-primary" : "text-muted")}
          >
            {active ? <m.span layoutId="tabbar-active" transition={spring} className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-primary" /> : null}
            <Icon name={tab.icon} size={22} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
