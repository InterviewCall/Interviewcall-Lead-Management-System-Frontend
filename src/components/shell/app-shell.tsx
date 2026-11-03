"use client";

import type { ReactNode } from "react";
import { MobileHeader, TabBar } from "./mobile-chrome";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <MobileHeader />
        <main className="flex-1 px-4 pt-4 pb-24 lg:px-8 lg:pt-8 lg:pb-8">
          <div className="mx-auto flex w-full max-w-[1136px] flex-col gap-5">{children}</div>
        </main>
      </div>
      <TabBar />
    </div>
  );
}
