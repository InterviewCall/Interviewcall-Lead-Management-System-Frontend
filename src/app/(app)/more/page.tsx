import type { Metadata } from "next";
import { MoreScreen } from "@/features/more/more-screen";

export const instant = false;
export const metadata: Metadata = { title: "More" };

export default function MorePage() {
  return <MoreScreen />;
}
