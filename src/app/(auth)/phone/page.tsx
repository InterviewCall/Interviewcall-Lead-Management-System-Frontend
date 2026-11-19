import type { Metadata } from "next";
import { PhoneScreen } from "@/features/auth/phone-screen";

export const instant = false;
export const metadata: Metadata = { title: "Your phone number" };

export default function PhonePage() {
  return <PhoneScreen />;
}
