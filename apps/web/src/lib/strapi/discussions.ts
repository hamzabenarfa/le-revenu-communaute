import "server-only";
import { type FeedFilters, toDiscussionApiQuery } from "../discussion-query";
import { strapiFetch } from "./client";
import { StrapiError } from "./errors";
import type {
  DiscussionDetail,
  DiscussionSummary,
  Featured,
  Feed,
  PollOption,
  Reward,
  SimilarDiscussion,
} from "./types";
import { memberFetch, viewerFetch } from "./viewer-fetch";

export const listDiscussions = (filters: FeedFilters) =>
  viewerFetch<Feed>("/discussions", { query: toDiscussionApiQuery(filters) });

/** Returns null when the discussion does not exist, so the page can render notFound(). */
export async function getDiscussion(
  slug: string,
): Promise<DiscussionDetail | null> {
  try {
    const { data } = await viewerFetch<{ data: DiscussionDetail }>(
      `/discussions/slug/${encodeURIComponent(slug)}`,
    );
    return data;
  } catch (error) {
    if (error instanceof StrapiError && error.status === 404) return null;
    throw error;
  }
}

export const getFeatured = async () =>
  (await viewerFetch<{ data: Featured }>("/discussions/featured")).data;

export const searchDiscussions = async (q: string) =>
  (
    await viewerFetch<{ data: DiscussionSummary[] }>("/search", {
      query: new URLSearchParams({ q }),
    })
  ).data;

export const similarDiscussions = async (q: string) =>
  (
    await strapiFetch<{ data: SimilarDiscussion[] }>("/discussions/similar", {
      query: new URLSearchParams({ q }),
    })
  ).data;

/** Raw member input: Strapi validates every field (type included) and rejects bad values. */
export interface NewDiscussion {
  title: string;
  content: string;
  type: string;
  category: string;
  pollOptions?: string[];
}

/** No author is sent: Strapi derives it from the token. */
export const createDiscussion = (input: NewDiscussion, token: string) =>
  memberFetch<{ data: DiscussionDetail; reward: Reward }>(
    token,
    "/discussions",
    { method: "POST", body: { data: input } },
  );

export const createReply = (
  input: { content: string; discussion: string },
  token: string,
) =>
  memberFetch<{
    data: { documentId: string };
    reward: Reward;
    meta: { mentioned: string[] };
  }>(token, "/replies", {
    method: "POST",
    body: { data: input },
  });

export const setSolution = (
  discussion: string,
  reply: string | null,
  token: string,
) =>
  memberFetch<{
    data: { solution: string | null };
    meta: { author: string | null };
  }>(token, `/discussions/${encodeURIComponent(discussion)}/solution`, {
    method: "PUT",
    body: { data: { reply } },
  });

export const vote = (discussion: string, option: number, token: string) =>
  memberFetch<{
    data: { pollOptions: PollOption[]; myVote: number; total: number };
    reward: Reward | null;
  }>(token, `/discussions/${encodeURIComponent(discussion)}/vote`, {
    method: "POST",
    body: { data: { option } },
  });

export const toggleFollow = (discussion: string, token: string) =>
  memberFetch<{ data: { followed: boolean } }>(
    token,
    `/discussions/${encodeURIComponent(discussion)}/follow`,
    { method: "POST" },
  );

export const toggleVerified = (reply: string, token: string) =>
  memberFetch<{ data: { verified: boolean } }>(
    token,
    `/replies/${encodeURIComponent(reply)}/verify`,
    { method: "POST" },
  );
