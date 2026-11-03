import type { Metadata } from "next";
import { TeamScreen } from "@/features/staff/team-screen";

export const instant = false;
export const metadata: Metadata = { title: "Team and roles" };

export default function TeamPage() {
  return <TeamScreen />;
}
