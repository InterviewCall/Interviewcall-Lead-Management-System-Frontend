"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileHeader, TabBar } from "./mobile-chrome";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // A lead's page is a workspace: on large screens the page itself stays still and its panes scroll.
  const workspace = /^\/leads\/[^/]+$/.test(pathname);
  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <MobileHeader />
        <main className={workspace ? "flex-1 px-4 pt-4 pb-24 lg:h-[calc(100dvh-4rem)] lg:flex-none lg:overflow-hidden lg:px-6 lg:pt-5 lg:pb-5" : "flex-1 px-4 pt-4 pb-24 lg:px-8 lg:pt-8 lg:pb-8"}>
          {/* Keyed by route so each screen fades in when you navigate to it. */}
          <div key={pathname} className={workspace ? "anim-fade-in mx-auto flex w-full max-w-[1480px] flex-col gap-4 lg:h-full" : "anim-fade-in mx-auto flex w-full max-w-[1136px] flex-col gap-5"}>{children}</div>
        </main>
      </div>
      <TabBar />
    </div>
  );
}
