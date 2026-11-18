import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crm.interviewcall.club";

/** Search engines may list the sign-in page and nothing else. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/login$"], disallow: ["/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
