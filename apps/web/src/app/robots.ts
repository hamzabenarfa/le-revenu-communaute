import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Forms and per-visitor pages: nothing to rank, and they would waste crawl budget.
      disallow: ["/publier", "/connexion", "/recherche"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
