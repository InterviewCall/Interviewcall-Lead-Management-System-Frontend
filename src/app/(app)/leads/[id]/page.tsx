import type { Metadata } from "next";
import { LeadDetailScreen } from "@/features/leads/lead-detail-screen";

export const instant = false;
export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  return <LeadDetailScreen id={id} />;
}
