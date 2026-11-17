import type { Metadata } from "next";
import { AuditScreen } from "@/features/admin/audit-screen";

export const instant = false;
export const metadata: Metadata = { title: "Audit log" };

export default function AuditPage() {
  return <AuditScreen />;
}
