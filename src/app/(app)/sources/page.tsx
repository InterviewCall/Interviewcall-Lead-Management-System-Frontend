import type { Metadata } from "next";
import { SourcesScreen } from "@/features/sources/sources-screen";

export const instant = false;
export const metadata: Metadata = { title: "Lead sources" };

export default function SourcesPage() {
  return <SourcesScreen />;
}
