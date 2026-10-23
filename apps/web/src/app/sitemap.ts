import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { soft } from "@/components/feed-page";
import { discussionHref, postHref } from "@/lib/discussion-query";
import { absoluteUrl } from "@/lib/site";
import { getPosts } from "@/lib/strapi/community";
import { getSitemapDiscussions } from "@/lib/strapi/discussions";
import { listSpaces } from "@/lib/strapi/spaces";

const date = (iso: string | null) => (iso ? new Date(iso) : undefined);

/**
 * Built per request so it follows the content (and never bakes an empty list
 * into the build when Strapi is not running). Discussions follow the same
 * editorial rule as their robots tag: only indexable pages are listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [spaces, discussions, posts] = await Promise.all([
    soft(listSpaces()),
    soft(getSitemapDiscussions()),
    soft(getPosts(50)),
  ]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/espaces"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/charte"), changeFrequency: "yearly", priority: 0.2 },
    ...(spaces ?? []).map((s) => ({
      url: absoluteUrl(`/espaces/${encodeURIComponent(s.slug)}`),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...(discussions ?? []).map((d) => ({
      url: absoluteUrl(discussionHref(d.slug)),
      lastModified: date(d.lastModified),
      priority: 0.8,
    })),
    ...(posts ?? []).map((p) => ({
      url: absoluteUrl(postHref(p.slug)),
      lastModified: date(p.publishedAt),
      priority: 0.5,
    })),
  ];
}
