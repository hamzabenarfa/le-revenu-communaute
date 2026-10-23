import "server-only";
import { strapiFetch } from "./client";
import { StrapiError } from "./errors";
import type {
  Charter,
  CommunityEvent,
  CommunityStats,
  Leaderboard,
  Me,
  MemberCard,
  Notification,
  Person,
  PostDetail,
  PostSummary,
  Profile,
  Reward,
  SiteArticle,
  Space,
} from "./types";
import { memberFetch, viewerFetch } from "./viewer-fetch";

const orNull = async <T>(promise: Promise<T>): Promise<T | null> => {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof StrapiError && error.status === 404) return null;
    throw error;
  }
};

export const getStats = async () =>
  (await strapiFetch<{ data: CommunityStats }>("/community/stats")).data;
export const getSpaces = async () =>
  (await strapiFetch<{ data: Space[] }>("/spaces")).data;
export const getMe = async (token: string) =>
  (await memberFetch<{ data: Me }>(token, "/profiles/me")).data;
export const getProfile = (username: string) =>
  orNull(
    viewerFetch<{ data: Profile }>(
      `/profiles/${encodeURIComponent(username)}`,
    ).then((r) => r.data),
  );
export const getMemberCard = (username: string) =>
  orNull(
    strapiFetch<{ data: MemberCard }>(
      `/profiles/${encodeURIComponent(username)}/card`,
    ).then((r) => r.data),
  );
export const getLeaderboard = (period: "month" | "all") =>
  viewerFetch<Leaderboard>("/leaderboard", {
    query: new URLSearchParams({ period }),
  });
export const getEvents = async (category?: string | null) =>
  (
    await viewerFetch<{ data: CommunityEvent[] }>("/events", {
      query: category ? new URLSearchParams({ category }) : undefined,
    })
  ).data;
export const getPosts = async (limit = 3) =>
  (
    await strapiFetch<{ data: PostSummary[] }>("/posts", {
      query: new URLSearchParams({ limit: String(limit) }),
    })
  ).data;
export const getPost = (slug: string) =>
  orNull(
    viewerFetch<{ data: PostDetail }>(
      `/posts/slug/${encodeURIComponent(slug)}`,
    ).then((r) => r.data),
  );
export const getSiteArticles = async () =>
  (
    await strapiFetch<{ data: SiteArticle[] }>("/site-articles", {
      query: new URLSearchParams({ sort: "position:asc" }),
    })
  ).data;
export const getCharter = async () =>
  (await strapiFetch<{ data: Charter }>("/charter")).data;
export const getNotifications = async (token: string) =>
  (await memberFetch<{ data: Notification[] }>(token, "/notifications/me"))
    .data;
export const getMentionable = async (
  token: string,
  q: string,
  context: string[],
) =>
  (
    await memberFetch<{ data: Array<Person & { near: boolean }> }>(
      token,
      "/members/mentions",
      {
        query: new URLSearchParams({ q, context: context.join(",") }),
      },
    )
  ).data;

export const toggleUseful = (
  targetType: string,
  targetId: string,
  token: string,
) =>
  memberFetch<{ data: { liked: boolean; count: number } }>(
    token,
    "/usefuls/toggle",
    { method: "POST", body: { data: { targetType, targetId } } },
  );
export const toggleRsvp = (event: string, token: string) =>
  memberFetch<{ data: CommunityEvent }>(
    token,
    `/events/${encodeURIComponent(event)}/rsvp`,
    { method: "POST" },
  );
export const markAllRead = (token: string) =>
  memberFetch(token, "/notifications/read-all", { method: "POST" });
export const markRead = (id: string, token: string) =>
  memberFetch(token, `/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
export const sendReport = (
  input: { targetType: string; targetId: string; reason: string },
  token: string,
) => memberFetch(token, "/reports", { method: "POST", body: { data: input } });
export const updateProfile = (
  input: { displayName?: string; bio?: string; interests?: string[] },
  token: string,
) =>
  memberFetch<{ data: Me; reward: Reward | null }>(token, "/profiles/me", {
    method: "PUT",
    body: { data: input },
  });
export const createPost = (
  input: { title: string; content: string; category: string | null },
  token: string,
) =>
  memberFetch<{
    data: { slug: string };
    reward: Reward;
    meta: { mentioned: string[] };
  }>(token, "/posts", { method: "POST", body: { data: input } });
export const createComment = (
  input: { content: string; post: string },
  token: string,
) =>
  memberFetch<{
    data: { documentId: string };
    reward: Reward;
    meta: { mentioned: string[] };
  }>(token, "/comments", { method: "POST", body: { data: input } });
export const uploadPhoto = (body: FormData, token: string) =>
  memberFetch<{ data: Me }>(token, "/profiles/me/photo", {
    method: "POST",
    body,
    timeoutMs: 20000,
  });
export const removePhoto = (token: string) =>
  memberFetch<{ data: Me }>(token, "/profiles/me/photo", { method: "DELETE" });
