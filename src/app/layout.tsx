import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "./globals.css";
import { Providers } from "./providers";

/** Where the app lives. Set NEXT_PUBLIC_SITE_URL if it moves; search results and share previews use it. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crm.interviewcall.club";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "LeadNest", template: "%s · LeadNest" },
  description: "LeadNest is InterviewCall's sales CRM for BDAs, closers and managers.",
  applicationName: "LeadNest",
  // Only the sign-in page is meant to be found. Every screen behind it says so itself (see the (app) layout).
  openGraph: { siteName: "LeadNest", title: "LeadNest", description: "InterviewCall's sales CRM. Sign in with your work email.", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#151834",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
