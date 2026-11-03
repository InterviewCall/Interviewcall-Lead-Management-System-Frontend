import type { Metadata } from "next";
import { Suspense } from "react";
import { LeadsScreen } from "@/features/leads/leads-screen";

export const instant = false;
export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsScreen />
    </Suspense>
  );
}
