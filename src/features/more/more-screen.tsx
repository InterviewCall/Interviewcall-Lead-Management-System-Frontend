"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
import { useLogout } from "@/features/auth/hooks";
import { TAB_BAR, visibleGroups } from "@/components/shell/nav";
import { ROLE_LABEL, ROLE_TONE } from "@/lib/roles";

/** Phone-first page for everything that does not fit in the bottom tab bar. */
export function MoreScreen() {
  const { user } = useAuth();
  const logout = useLogout();
  if (!user) return null;
  const onTabBar = new Set(TAB_BAR.map((t) => t.href));
  const groups = visibleGroups(user.role)
    .map((g) => ({ ...g, items: g.items.filter((i) => !onTabBar.has(i.href)) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <Card className="flex items-center gap-4 p-5">
        <Avatar name={user.name} size={52} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-h2 font-semibold text-text">{user.name}</p>
          <p className="truncate text-body text-text-2">{user.email}</p>
        </div>
        <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
      </Card>

      {groups.map((g) => (
        <Section key={g.label} label={g.label}>
          {g.items.map((i) => <Row key={i.href} href={i.href} icon={i.icon} label={i.label} />)}
        </Section>
      ))}

      <Section label="ACCOUNT">
        <Row href="/change-password" icon="key" label="Change password" />
        <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending} className="flex h-14 w-full items-center gap-3 px-4 text-left text-body font-medium text-bad disabled:opacity-60">
          <Icon name="logout" size={18} /> Sign out
        </button>
      </Section>
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-cap font-semibold tracking-[0.5px] text-text-2 uppercase">{label}</h2>
      <Card className="divide-y divide-border overflow-hidden">{children}</Card>
    </section>
  );
}

function Row({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} className="flex h-14 items-center gap-3 px-4 text-body font-medium text-text hover:bg-surface-alt">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name={icon} size={16} /></span>
      <span className="flex-1">{label}</span>
      <Icon name="right" size={16} className="text-muted" />
    </Link>
  );
}
