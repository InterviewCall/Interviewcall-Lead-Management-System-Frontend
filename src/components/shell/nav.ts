import type { IconName } from "@/components/ui/icon";
import type { Role } from "@/lib/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Roles that see this entry. Omitted means everyone. */
  roles?: readonly Role[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Only these roles may hand leads out (the API enforces the same rule). */
export const ASSIGN_ROLES: readonly Role[] = ["SALES_MANAGER", "ADMIN"];
/** Only these roles may add a lead by hand (a BDA owns what they add). The API enforces the same rule. */
export const ADD_LEAD_ROLES: readonly Role[] = ["SALES_MANAGER", "ADMIN", "BDA"];
/** Only these roles may import leads. The API enforces the same rule. */
export const IMPORT_ROLES: readonly Role[] = ["SALES_MANAGER", "ADMIN"];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/my-day", label: "My day", icon: "home" },
      { href: "/leads", label: "Leads", icon: "users" },
      { href: "/pipeline", label: "Pipeline", icon: "kanban" },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/assignment", label: "Assignment", icon: "shuffle", roles: ASSIGN_ROLES },
      { href: "/imports", label: "Imports", icon: "upload", roles: IMPORT_ROLES },
    ],
  },
  {
    label: "Insights",
    items: [{ href: "/reports", label: "Reports", icon: "bars" }],
  },
  {
    label: "Admin",
    items: [
      { href: "/intake", label: "Intake monitor", icon: "pulse", roles: ["OPS", "ADMIN"] },
      { href: "/team", label: "Team and roles", icon: "shield", roles: ["ADMIN"] },
      { href: "/sources", label: "Lead sources", icon: "tag", roles: ["ADMIN"] },
      { href: "/custom-fields", label: "Custom fields", icon: "list", roles: ["ADMIN"] },
      { href: "/outcomes", label: "Call outcomes", icon: "phone", roles: ["ADMIN", "SALES_MANAGER"] },
      { href: "/audit", label: "Audit log", icon: "file", roles: ["ADMIN"] },
      { href: "/settings", label: "Settings", icon: "filter", roles: ["ADMIN"] },
    ],
  },
];

export function visibleGroups(role: Role): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
}

export function canOpen(role: Role, href: string): boolean {
  const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => href === i.href || href.startsWith(`${i.href}/`));
  return !item?.roles || item.roles.includes(role);
}

export function titleFor(pathname: string): string {
  if (pathname.startsWith("/leads/")) return "Lead";
  if (pathname === "/more") return "More";
  const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return item?.label ?? "InterviewCall CRM";
}

/** The five tabs on the phone layout. Everything else lives under "More". */
export const TAB_BAR: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/my-day", label: "My day", icon: "home" },
  { href: "/leads", label: "Leads", icon: "users" },
  { href: "/pipeline", label: "Pipeline", icon: "kanban" },
  { href: "/reports", label: "Reports", icon: "bars" },
  { href: "/more", label: "More", icon: "menu" },
];
