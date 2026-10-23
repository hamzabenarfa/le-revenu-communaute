import { discussionHref } from "./discussion-query";
import { absoluteUrl, SITE_NAME } from "./site";
import type { DiscussionDetail, Person, Reply } from "./strapi/types";

type Thing = Record<string, unknown>;

/** `<` is escaped so member-written text can never close the <script> tag. */
export const serializeJsonLd = (data: Thing) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

const author = (p: Person | null): Thing | undefined =>
  p
    ? {
        "@type": "Person",
        name: p.name,
        url: absoluteUrl(`/membres/${encodeURIComponent(p.username)}`),
      }
    : undefined;

const upvotes = (n: number) => ({
  "@type": "InteractionCounter",
  interactionType: "https://schema.org/LikeAction",
  userInteractionCount: n,
});

const answer = (url: string, r: Reply): Thing => ({
  "@type": "Answer",
  text: r.content,
  datePublished: r.publishedAt ?? undefined,
  author: author(r.author),
  upvoteCount: r.usefulCount,
  url: `${url}#r-${r.documentId}`,
});

/**
 * Google's Q&A rich result for questions that have answers (QAPage), and the
 * forum markup for everything else (DiscussionForumPosting).
 */
export function discussionJsonLd(d: DiscussionDetail): Thing {
  const url = absoluteUrl(discussionHref(d.slug));
  if (d.type === "question" && d.replies.length > 0) {
    const accepted = d.replies.find((r) => r.isSolution);
    return {
      "@context": "https://schema.org",
      "@type": "QAPage",
      mainEntity: {
        "@type": "Question",
        name: d.title,
        text: d.content || d.title,
        answerCount: d.replyCount,
        upvoteCount: d.usefulCount,
        datePublished: d.publishedAt ?? undefined,
        author: author(d.author),
        ...(accepted ? { acceptedAnswer: answer(url, accepted) } : {}),
        suggestedAnswer: d.replies
          .filter((r) => r !== accepted)
          .map((r) => answer(url, r)),
      },
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    mainEntityOfPage: url,
    url,
    headline: d.title,
    text: d.content || d.title,
    datePublished: d.publishedAt ?? undefined,
    dateModified: d.lastActivityAt ?? undefined,
    author: author(d.author),
    interactionStatistic: [
      upvotes(d.usefulCount),
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: d.replyCount,
      },
    ],
    comment: d.replies.map((r) => ({
      "@type": "Comment",
      text: r.content,
      datePublished: r.publishedAt ?? undefined,
      author: author(r.author),
      url: `${url}#r-${r.documentId}`,
    })),
  };
}

export const breadcrumbJsonLd = (
  items: Array<{ name: string; path: string }>,
): Thing => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [{ name: SITE_NAME, path: "/" }, ...items].map(
    (item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    }),
  ),
});
