import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "InterviewCall CRM", template: "%s · InterviewCall CRM" },
  description: "Lead management for BDAs, closers and managers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1733",
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
