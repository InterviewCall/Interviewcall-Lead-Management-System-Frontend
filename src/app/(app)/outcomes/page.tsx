import type { Metadata } from "next";
import { OutcomesScreen } from "@/features/outcomes/outcomes-screen";

export const instant = false;
export const metadata: Metadata = { title: "Call outcomes" };

export default function OutcomesPage() {
  return <OutcomesScreen />;
}
