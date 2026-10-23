"use server";

import { refresh } from "next/cache";
import { sanitizeFeedFilters } from "@/lib/discussion-query";
import { getSessionToken } from "@/lib/session";
import * as community from "@/lib/strapi/community";
import * as discussions from "@/lib/strapi/discussions";
import type {
  CommunityEvent,
  Feed,
  Me,
  MemberCard,
  Notification,
  Person,
  PollOption,
  SimilarDiscussion,
} from "@/lib/strapi/types";
import { type ActionResult, NEEDS_LOGIN, str, toFailure } from "./result";

const TARGETS = ["discussion", "reply", "post", "comment"] as const;
const REASONS = [
  "disrespect",
  "solicitation",
  "market-rumor",
  "personal-data",
  "other",
] as const;

/** Runs a member-only call: no session, no request to Strapi. */
async function asMember<T>(
  run: (token: string) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const token = await getSessionToken();
  if (!token) return NEEDS_LOGIN;
  try {
    return await run(token);
  } catch (error) {
    return toFailure(error);
  }
}

/** Next feed page for infinite scroll; read as the visitor, like the server-rendered first page. */
export async function loadFeedPage(input: {
  category: unknown;
  tab: unknown;
  page: unknown;
}): Promise<ActionResult<Feed>> {
  const filters = sanitizeFeedFilters(input);
  if (!filters) return { ok: false, error: "Page de discussions invalide." };
  try {
    return { ok: true, data: await discussions.listDiscussions(filters) };
  } catch (error) {
    return toFailure(error);
  }
}

export async function publishDiscussion(input: {
  title: unknown;
  content: unknown;
  type: unknown;
  category: unknown;
  pollOptions?: unknown;
}): Promise<ActionResult<{ slug: string }>> {
  return asMember(async (token) => {
    const options = Array.isArray(input.pollOptions)
      ? input.pollOptions
          .filter((o): o is string => typeof o === "string")
          .slice(0, 10)
      : undefined;
    // Values go to Strapi as typed by the member; Strapi trims and validates them.
    const { data, reward } = await discussions.createDiscussion(
      {
        title: String(input.title ?? "").slice(0, 400),
        content: String(input.content ?? "").slice(0, 12000),
        type: String(input.type ?? ""),
        category: String(input.category ?? "").slice(0, 64),
        ...(options ? { pollOptions: options } : {}),
      },
      token,
    );
    // Header points and badges come from the shared layout: refresh it.
    refresh();
    return { ok: true, data: { slug: data.slug }, reward };
  });
}

export async function publishReply(
  discussionId: unknown,
  content: unknown,
): Promise<ActionResult<{ documentId: string; mentioned: string[] }>> {
  return asMember(async (token) => {
    const id = str(discussionId);
    if (!id) return { ok: false, error: "Discussion inconnue." };
    const { data, reward, meta } = await discussions.createReply(
      { content: String(content ?? "").slice(0, 6000), discussion: id },
      token,
    );
    refresh();
    return {
      ok: true,
      data: { documentId: data.documentId, mentioned: meta.mentioned },
      reward,
    };
  });
}

export async function toggleUseful(
  targetType: unknown,
  targetId: unknown,
): Promise<ActionResult<{ liked: boolean; count: number }>> {
  return asMember(async (token) => {
    const type = TARGETS.find((t) => t === targetType);
    const id = str(targetId);
    if (!type || !id) return { ok: false, error: "Message inconnu." };
    const { data } = await community.toggleUseful(type, id, token);
    return { ok: true, data };
  });
}

export async function votePoll(
  discussionId: unknown,
  option: unknown,
): Promise<
  ActionResult<{ pollOptions: PollOption[]; myVote: number; total: number }>
> {
  return asMember(async (token) => {
    const id = str(discussionId);
    if (!id || typeof option !== "number" || !Number.isInteger(option))
      return { ok: false, error: "Vote invalide." };
    const { data, reward } = await discussions.vote(id, option, token);
    if (reward) refresh();
    return { ok: true, data, reward };
  });
}

export async function followDiscussion(
  discussionId: unknown,
): Promise<ActionResult<{ followed: boolean }>> {
  return asMember(async (token) => {
    const id = str(discussionId);
    if (!id) return { ok: false, error: "Discussion inconnue." };
    return { ok: true, data: (await discussions.toggleFollow(id, token)).data };
  });
}

export async function chooseSolution(
  discussionId: unknown,
  replyId: unknown,
): Promise<ActionResult<{ solution: string | null; author: string | null }>> {
  return asMember(async (token) => {
    const id = str(discussionId);
    if (!id) return { ok: false, error: "Discussion inconnue." };
    const { data, meta } = await discussions.setSolution(
      id,
      str(replyId),
      token,
    );
    refresh();
    return { ok: true, data: { solution: data.solution, author: meta.author } };
  });
}

export async function verifyReply(
  replyId: unknown,
): Promise<ActionResult<{ verified: boolean }>> {
  return asMember(async (token) => {
    const id = str(replyId);
    if (!id) return { ok: false, error: "Réponse inconnue." };
    const { data } = await discussions.toggleVerified(id, token);
    refresh();
    return { ok: true, data };
  });
}

export async function rsvpEvent(
  eventId: unknown,
): Promise<ActionResult<CommunityEvent>> {
  return asMember(async (token) => {
    const id = str(eventId);
    if (!id) return { ok: false, error: "Événement inconnu." };
    return { ok: true, data: (await community.toggleRsvp(id, token)).data };
  });
}

export async function reportMessage(
  targetType: unknown,
  targetId: unknown,
  reason: unknown,
): Promise<ActionResult> {
  return asMember(async (token) => {
    const type = TARGETS.find((t) => t === targetType);
    const why = REASONS.find((r) => r === reason);
    const id = str(targetId);
    if (!type || !id || !why)
      return { ok: false, error: "Signalement invalide." };
    await community.sendReport(
      { targetType: type, targetId: id, reason: why },
      token,
    );
    return { ok: true, data: null };
  });
}

export async function loadNotifications(): Promise<
  ActionResult<Notification[]>
> {
  return asMember(async (token) => ({
    ok: true,
    data: await community.getNotifications(token),
  }));
}

export async function readNotifications(id: unknown): Promise<ActionResult> {
  return asMember(async (token) => {
    const nid = id === null ? null : str(id);
    if (nid) await community.markRead(nid, token);
    else await community.markAllRead(token);
    refresh();
    return { ok: true, data: null };
  });
}

export async function loadMemberCard(
  username: unknown,
): Promise<ActionResult<MemberCard | null>> {
  const u = str(username, 40);
  if (!u) return { ok: true, data: null };
  try {
    return { ok: true, data: await community.getMemberCard(u) };
  } catch (error) {
    return toFailure(error);
  }
}

export async function loadMentions(
  q: unknown,
  context: unknown,
): Promise<ActionResult<Array<Person & { near: boolean }>>> {
  return asMember(async (token) => {
    const query = typeof q === "string" ? q.slice(0, 24) : "";
    const ctx = Array.isArray(context)
      ? context.filter((c): c is string => typeof c === "string").slice(0, 50)
      : [];
    return {
      ok: true,
      data: await community.getMentionable(token, query, ctx),
    };
  });
}

export async function loadSimilar(
  q: unknown,
): Promise<ActionResult<SimilarDiscussion[]>> {
  const query = typeof q === "string" ? q.slice(0, 100) : "";
  if (query.trim().length < 3) return { ok: true, data: [] };
  try {
    return { ok: true, data: await discussions.similarDiscussions(query) };
  } catch (error) {
    return toFailure(error);
  }
}

export async function saveProfile(input: {
  displayName?: unknown;
  bio?: unknown;
  interests?: unknown;
}): Promise<ActionResult<Me>> {
  return asMember(async (token) => {
    const data: { displayName?: string; bio?: string; interests?: string[] } =
      {};
    if (typeof input.displayName === "string")
      data.displayName = input.displayName.slice(0, 60);
    if (typeof input.bio === "string") data.bio = input.bio.slice(0, 400);
    if (Array.isArray(input.interests))
      data.interests = input.interests
        .filter((i): i is string => typeof i === "string")
        .slice(0, 20);
    const { data: me, reward } = await community.updateProfile(data, token);
    refresh();
    return { ok: true, data: me, reward };
  });
}

export async function savePhoto(formData: FormData): Promise<ActionResult<Me>> {
  return asMember(async (token) => {
    const file = formData.get("photo");
    const body = new FormData();
    if (file instanceof File && file.size > 0) {
      if (file.size > 2 * 1024 * 1024)
        return { ok: false, error: "La photo ne doit pas dépasser 2 Mo." };
      body.append("photo", file, file.name || "avatar.jpg");
      const { data } = await community.uploadPhoto(body, token);
      refresh();
      return { ok: true, data };
    }
    const { data } = await community.removePhoto(token);
    refresh();
    return { ok: true, data };
  });
}

export async function publishPost(input: {
  title: unknown;
  content: unknown;
  category: unknown;
}): Promise<ActionResult<{ slug: string; mentioned: string[] }>> {
  return asMember(async (token) => {
    const { data, reward, meta } = await community.createPost(
      {
        title: String(input.title ?? "").slice(0, 300),
        content: String(input.content ?? "").slice(0, 22000),
        category:
          typeof input.category === "string" && input.category
            ? input.category.slice(0, 64)
            : null,
      },
      token,
    );
    return {
      ok: true,
      data: { slug: data.slug, mentioned: meta.mentioned },
      reward,
    };
  });
}

export async function publishComment(
  postId: unknown,
  content: unknown,
): Promise<ActionResult<{ mentioned: string[] }>> {
  return asMember(async (token) => {
    const id = str(postId);
    if (!id) return { ok: false, error: "Billet inconnu." };
    const { reward, meta } = await community.createComment(
      { content: String(content ?? "").slice(0, 6000), post: id },
      token,
    );
    refresh();
    return { ok: true, data: { mentioned: meta.mentioned }, reward };
  });
}
