import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/features/auth/login-screen";

export const instant = false;
export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
