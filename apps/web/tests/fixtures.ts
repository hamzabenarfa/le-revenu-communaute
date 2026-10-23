import type { DiscussionSummary, Person } from "@/lib/strapi/types";

export const person = (overrides: Partial<Person> = {}): Person => ({
  username: "Thomas_PEA",
  name: "Thomas",
  color: "#c93400",
  photo: null,
  role: "member",
  subscriber: false,
  pro: null,
  ...overrides,
});

export const discussion = (
  overrides: Partial<DiscussionSummary> = {},
): DiscussionSummary => ({
  documentId: "d1",
  title: "Ouvrir un PEA avec 5 000 € : par où commencer ?",
  slug: "ouvrir-un-pea",
  type: "question",
  pinned: false,
  featured: "none",
  publishedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  lastActivityAt: new Date(Date.now() - 3_600_000).toISOString(),
  author: person(),
  category: {
    documentId: "c1",
    name: "Bourse & actions",
    slug: "bourse",
    color: "#007aff",
    icon: "candles",
  },
  excerpt: "Je viens d'ouvrir un PEA en ligne.",
  replyCount: 3,
  usefulCount: 19,
  views: 1210,
  solved: false,
  pollVotes: null,
  participants: [person({ username: "Vincent_ETF", name: "Vincent" })],
  isNew: false,
  indexable: true,
  ...overrides,
});
