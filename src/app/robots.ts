import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crm.interviewcall.club";

/**
 * Search engines may list the sign-in page and nothing else. The sitemap
 * stays readable so Search Console can fetch it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/login$", "/sitemap.xml$"], disallow: ["/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
