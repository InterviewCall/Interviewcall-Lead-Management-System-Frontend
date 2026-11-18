import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/features/auth/login-screen";

export const instant = false;
// This is the page people find when they search for "LeadNest", so the name leads the title.
export const metadata: Metadata = {
  title: { absolute: "LeadNest · Sign in" },
  description: "Sign in to LeadNest, InterviewCall's sales CRM. Access is by invitation: ask your manager if you need an account.",
  alternates: { canonical: "/login" },
  robots: { index: true, follow: false },
};

const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LeadNest",
  alternateName: ["Lead Nest", "InterviewCall LeadNest"],
};

export default function LoginPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ ...SITE_JSON_LD, url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://crm.interviewcall.club"}/login` }) }} />
      <Suspense>
        <LoginScreen />
      </Suspense>
    </>
  );
}
