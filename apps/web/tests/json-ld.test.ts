import { describe, expect, it } from "vitest";
import {
  breadcrumbJsonLd,
  discussionJsonLd,
  serializeJsonLd,
} from "@/lib/json-ld";
import type { DiscussionDetail, Reply } from "@/lib/strapi/types";
import { discussion, person } from "./fixtures";

const reply = (overrides: Partial<Reply> = {}): Reply => ({
  documentId: "r1",
  content: "Commencez par un ETF monde.",
  publishedAt: "2026-10-01T10:00:00.000Z",
  author: person({ username: "Vincent_ETF", name: "Vincent" }),
  usefulCount: 4,
  verified: false,
  isSolution: false,
  liked: false,
  mine: false,
  ...overrides,
});

const detail = (
  overrides: Partial<DiscussionDetail> = {},
): DiscussionDetail => ({
  ...discussion(),
  content: "Je viens d'ouvrir un PEA en ligne.",
  articleTitle: null,
  pollOptions: null,
  solution: null,
  usefulTotal: 0,
  replies: [],
  related: [],
  viewer: null,
  ...overrides,
});

describe("discussionJsonLd", () => {
  it("marks up an answered question as a QAPage with its accepted answer", () => {
    const best = reply({ documentId: "r2", isSolution: true });
    const data = discussionJsonLd(
      detail({ replies: [reply(), best], replyCount: 2 }),
    );
    expect(data["@type"]).toBe("QAPage");
    expect(data.mainEntity).toMatchObject({
      "@type": "Question",
      name: "Ouvrir un PEA avec 5 000 € : par où commencer ?",
      answerCount: 2,
      acceptedAnswer: {
        "@type": "Answer",
        url: "http://localhost:3000/discussions/ouvrir-un-pea#r-r2",
      },
      suggestedAnswer: [{ url: expect.stringContaining("#r-r1") }],
    });
  });

  it("uses DiscussionForumPosting for unanswered questions and discussions", () => {
    expect(discussionJsonLd(detail())["@type"]).toBe("DiscussionForumPosting");
    expect(
      discussionJsonLd(detail({ type: "discussion", replies: [reply()] })),
    ).toMatchObject({
      "@type": "DiscussionForumPosting",
      comment: [{ "@type": "Comment", text: "Commencez par un ETF monde." }],
    });
  });
});

describe("serializeJsonLd", () => {
  it("cannot be used to close the script tag from member content", () => {
    const json = serializeJsonLd(
      discussionJsonLd(
        detail({ content: "</script><script>alert(1)</script>" }),
      ),
    );
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).text).toBe("</script><script>alert(1)</script>");
  });
});

describe("breadcrumbJsonLd", () => {
  it("starts at the community home with absolute URLs", () => {
    expect(
      breadcrumbJsonLd([{ name: "Bourse", path: "/espaces/bourse" }])
        .itemListElement,
    ).toEqual([
      expect.objectContaining({ position: 1, item: "http://localhost:3000/" }),
      expect.objectContaining({
        position: 2,
        name: "Bourse",
        item: "http://localhost:3000/espaces/bourse",
      }),
    ]);
  });
});
