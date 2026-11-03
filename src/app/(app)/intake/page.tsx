import type { Metadata } from "next";
import { IntakeScreen } from "@/features/intake/intake-screen";

export const instant = false;
export const metadata: Metadata = { title: "Intake monitor" };

export default function IntakePage() {
  return <IntakeScreen />;
}
