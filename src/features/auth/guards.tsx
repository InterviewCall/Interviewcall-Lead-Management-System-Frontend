"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "./auth-provider";

export const DEFAULT_HOME = "/my-day";

/** Only same-site paths are allowed as a post-login destination. */
export function safeNext(value: string | null | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login")) return value;
  return DEFAULT_HOME;
}

export function Splash({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <LogoMark height={48} />
      {children ?? <Spinner size={22} className="text-primary" />}
    </div>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <Splash>
      <div className="flex max-w-sm flex-col items-center gap-3">
        <p className="text-body text-text-2">We could not reach the server. Check your connection and try again.</p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </Splash>
  );
}

/** Wraps the signed-in part of the app: sends visitors to /login, and temporary passwords to /change-password. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user, retry } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    } else if (status === "authenticated" && user?.mustChangePassword) {
      router.replace("/change-password");
    }
  }, [status, user, pathname, router]);

  if (status === "error") return <LoadFailed onRetry={retry} />;
  if (status !== "authenticated" || !user || user.mustChangePassword) return <Splash />;
  return <>{children}</>;
}

/** For /login: a signed-in person goes straight on to the app. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, user, retry } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(user.mustChangePassword ? "/change-password" : safeNext(params.get("next")));
    }
  }, [status, user, params, router]);

  if (status === "error") return <LoadFailed onRetry={retry} />;
  if (status === "loading" || status === "authenticated") return <Splash />;
  return <>{children}</>;
}

/** Signed in, but unlike RequireAuth this also admits an account that must still change its password. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status, retry } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "error") return <LoadFailed onRetry={retry} />;
  if (status !== "authenticated") return <Splash />;
  return <>{children}</>;
}
