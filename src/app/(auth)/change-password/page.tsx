import type { Metadata } from "next";
import { ChangePasswordScreen } from "@/features/auth/change-password-screen";

export const instant = false;
export const metadata: Metadata = { title: "Choose a new password" };

export default function ChangePasswordPage() {
  return <ChangePasswordScreen />;
}
