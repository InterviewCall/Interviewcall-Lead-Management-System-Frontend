import { Suspense, type ReactNode } from "react";
import { RoleGate } from "@/components/shell/access-denied";
import { AppShell } from "@/components/shell/app-shell";
import { RequireAuth, Splash } from "@/features/auth/guards";

// Every screen sits behind the client-side sign-in check, so none can render before the session is known.
// Opt out of instant-navigation validation (Next 16 dev "Insights"); it cannot apply here.
export const instant = false;

// RequireAuth reads the pathname, which is unknown while a dynamic route such as /leads/[id] is prerendered.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Splash />}>
      <RequireAuth>
        <AppShell>
          <RoleGate>{children}</RoleGate>
        </AppShell>
      </RequireAuth>
    </Suspense>
  );
}
