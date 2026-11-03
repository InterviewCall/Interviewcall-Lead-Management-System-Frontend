/** The roles the API knows. Keep in step with `Role` in the backend's @app/rbac. */
export const ROLES = ["BDA", "SALES_MANAGER", "CLOSER", "OPS", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  BDA: "BDA",
  SALES_MANAGER: "Sales Manager",
  CLOSER: "Closer",
  OPS: "Ops",
  ADMIN: "Admin",
};

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "violet";

export const ROLE_TONE: Record<Role, Tone> = {
  BDA: "neutral",
  SALES_MANAGER: "info",
  CLOSER: "violet",
  OPS: "warning",
  ADMIN: "primary",
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role as Role] ?? role;
}
