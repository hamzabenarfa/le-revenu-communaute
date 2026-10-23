import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { untrustedHosts } from '../../../utils/links';
import { EXTERNAL_LINK_LEVEL } from '../../../utils/reputation';
import { uniqueSlug } from '../../../utils/slug';
import { assertLinksAllowed, type DiscussionInput, type ListQuery } from '../../../utils/validation';
import { type Person, toPerson, type UserRow } from '../../community/services/people';
import type { Reputation, Reward } from '../../community/services/reputation';

const UID = 'api::discussion.discussion';
const REPLY = 'api::reply.reply';
const EXCERPT_LENGTH = 220;
const REPLIES_LIMIT = 200;
const HOT_CANDIDATES = 300;
const SEO_USEFUL = 25;
/** Well under the 50,000 URLs a single sitemap file may hold. */
const SITEMAP_LIMIT = 5000;
const MENTION_RE = /@([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)/g;
const STOP_WORDS = new Set(
  'pour dans avec comment quel quelle quels quelles faut vous nous mon mes une des les sur que qui plus faire avez bien encore entre leur votre vos mais pas sont cette ces être avoir tout après avant est'.split(' ')
);

export interface Viewer {
  id: number;
  documentId: string;
  staff: boolean;
}

export interface PollOption {
  label: string;
  votes: number;
}

interface CategoryRow {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
}

export interface DiscussionRow {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  type: 'question' | 'discussion' | 'poll';
  content: string;
  pinned?: boolean | null;
  featured?: 'none' | 'question' | 'poll' | null;
  articleTitle?: string | null;
  pollOptions?: PollOption[] | null;
  views?: number | null;
  replyCount?: number | null;
  usefulCount?: number | null;
  publishedAt?: string | Date | null;
  createdAt?: string | Date | null;
  lastActivityAt?: string | Date | null;
  author?: UserRow | null;
  category?: CategoryRow | null;
  solution?: { id: number; documentId: string } | null;
}

interface ReplyRow {
  id: number;
  documentId: string;
  content: string;
  verified?: boolean | null;
  usefulCount?: number | null;
  createdAt?: string | Date | null;
  author?: UserRow | null;
  discussion?: { id: number } | null;
}

export const PERSON_POPULATE = {
  select: ['id', 'documentId', 'username', 'displayName', 'avatarColor', 'memberRole', 'subscriber', 'proTitle'],
  populate: { photo: { select: ['url', 'formats'] } },
};
/** Same projection for the Document Service API, which names it `fields`. */
export const PERSON_FIELDS = {
  fields: ['username', 'displayName', 'avatarColor', 'memberRole', 'subscriber', 'proTitle'],
  populate: { photo: { fields: ['url', 'formats'] } },
};
const DISCUSSION_SELECT = [
  'id', 'documentId', 'title', 'slug', 'type', 'content', 'pinned', 'featured', 'articleTitle', 'pollOptions',
  'views', 'replyCount', 'usefulCount', 'publishedAt', 'createdAt', 'lastActivityAt',
];
const DISCUSSION_POPULATE = {
  author: PERSON_POPULATE,
  category: { select: ['id', 'documentId', 'name', 'slug', 'color', 'icon'] },
  solution: { select: ['id', 'documentId'] },
};

export const toIso = (value: string | Date | null | undefined): string | null => (value ? new Date(value).toISOString() : null);
const minutesSince = (value: string | Date | null | undefined) =>
  value ? Math.max(0, (Date.now() - new Date(value).getTime()) / 60000) : 0;
const plain = (text: string) => text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
export const excerptOf = (content: string, length = EXCERPT_LENGTH) => {
  const flat = plain(content);
  return flat.length > length ? `${flat.slice(0, length - 1).trimEnd()}…` : flat;
};
const pollTotal = (options: PollOption[] | null | undefined) => (options ?? []).reduce((sum, o) => sum + (o.votes ?? 0), 0);

export const serializeCategory = (c: CategoryRow | null | undefined) =>
  c ? { documentId: c.documentId, name: c.name, slug: c.slug, color: c.color ?? null, icon: c.icon ?? null } : null;

/** Prototype "Tendances" ranking: engagement weighted by freshness of the post and of its last activity. */
export function hotScore(d: DiscussionRow): number {
  const votes = d.type === 'poll' ? pollTotal(d.pollOptions) / 20 : 0;
  const score = 1 + (d.replyCount ?? 0) * 3 + (d.usefulCount ?? 0) * 2 + (d.views ?? 0) / 25 + votes;
  const age = minutesSince(d.publishedAt ?? d.createdAt) + minutesSince(d.lastActivityAt ?? d.publishedAt);
  return score / Math.pow(age / 120 + 2, 1.3);
}

export interface SeoStatus {
  indexed: boolean;
  reason: string;
  checks: Array<[string, boolean]>;
}

/** Editorial indexing rule (visible to staff only): the decision applies to the whole page. */
export function seoStatus(d: DiscussionRow, replies: ReplyRow[]): SeoStatus {
  const useful = (d.usefulCount ?? 0) + replies.reduce((sum, r) => sum + (r.usefulCount ?? 0), 0);
  const solution = d.solution ? replies.find((r) => r.id === d.solution?.id) : undefined;
  const people = [d.author, ...replies.map((r) => r.author)].filter(Boolean) as UserRow[];
  const expert = people.find((u) => u.memberRole === 'redaction' || Boolean(u.proTitle));
  const cafe = d.category?.slug === 'cafe';
  const checks: Array<[string, boolean]> = [
    ['Espace indexable (hors Café du Revenu)', !cafe],
    ['Meilleure réponse choisie', Boolean(solution)],
    ["Contribution de la rédaction ou d'un expert vérifié", Boolean(expert)],
    [`Au moins ${SEO_USEFUL} « Utile » et deux réponses`, useful >= SEO_USEFUL && replies.length >= 2],
  ];
  if (cafe) return { indexed: false, reason: 'Espace de discussion libre : jamais indexé', checks };
  if (solution) return { indexed: true, reason: solution.verified ? 'Meilleure réponse vérifiée par la rédaction' : 'Meilleure réponse choisie', checks };
  if (expert) return { indexed: true, reason: expert.memberRole === 'redaction' ? 'Contribution de la rédaction' : "Réponse d'un expert vérifié", checks };
  if (checks[3][1]) return { indexed: true, reason: `Discussion jugée utile (${useful} « Utile »)`, checks };
  return { indexed: false, reason: replies.length ? 'Pas encore assez de signaux de qualité' : 'Pas encore de réponse', checks };
}

/** PostgreSQL unique_violation, as surfaced by knex/pg (possibly wrapped by Strapi). */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: unknown; cause?: { code?: unknown }; message?: unknown } | null;
  return e?.code === '23505' || e?.cause?.code === '23505' || (typeof e?.message === 'string' && /unique/i.test(e.message));
}

export default factories.createCoreService(UID, ({ strapi }) => {
  const db = () => strapi.db.query(UID);
  const reputation = () =>
    strapi.service('api::community.reputation') as unknown as {
      of: (id: number) => Promise<Reputation>;
      compute: (ids: number[]) => Promise<Map<number, Reputation>>;
      reward: (id: number, before: Reputation, reason: string) => Promise<Reward>;
    };
  const notify = (n: Record<string, unknown>) =>
    (strapi.service('api::notification.notification') as unknown as { notify: (n: Record<string, unknown>) => Promise<void> }).notify(n);

  /** Replies of several discussions in one query (authors, counters, verification). */
  const repliesOf = async (discussionIds: number[], limit?: number) =>
    discussionIds.length
      ? ((await strapi.db.query(REPLY).findMany({
          where: { discussion: { id: { $in: discussionIds } } },
          select: ['id', 'documentId', 'content', 'verified', 'usefulCount', 'createdAt'],
          populate: { author: PERSON_POPULATE, discussion: { select: ['id'] } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          ...(limit ? { limit } : {}),
        })) as ReplyRow[])
      : [];

  const usefulSet = async (viewer: Viewer | null, targetType: string, ids: string[]) => {
    if (!viewer || !ids.length) return new Set<string>();
    const rows = (await strapi.db.query('api::useful.useful').findMany({
      where: { user: { id: viewer.id }, targetType, targetId: { $in: ids } },
      select: ['targetId'],
    })) as Array<{ targetId: string }>;
    return new Set(rows.map((r) => r.targetId));
  };

  /** Feed card: what the home list needs, nothing more (no full content, replies counted). */
  const toCard = (d: DiscussionRow, replies: ReplyRow[], viewer: Viewer | null) => {
    const own = replies.filter((r) => r.discussion?.id === d.id);
    const participants: Person[] = [];
    for (const r of [...own].reverse()) {
      if (r.author && !participants.some((p) => p.username === r.author?.username)) participants.unshift(toPerson(r.author));
      if (participants.length === 4) break;
    }
    const replyCount = d.replyCount ?? 0;
    const seo = seoStatus(d, own);
    return {
      documentId: d.documentId,
      title: d.title,
      slug: d.slug,
      type: d.type,
      pinned: Boolean(d.pinned),
      featured: d.featured ?? 'none',
      publishedAt: toIso(d.publishedAt ?? d.createdAt),
      lastActivityAt: toIso(d.lastActivityAt ?? d.publishedAt ?? d.createdAt),
      author: d.author ? toPerson(d.author) : null,
      category: serializeCategory(d.category),
      excerpt: excerptOf(d.content ?? ''),
      replyCount,
      usefulCount: d.usefulCount ?? 0,
      views: d.views ?? 0,
      solved: Boolean(d.solution),
      pollVotes: d.type === 'poll' ? pollTotal(d.pollOptions) : null,
      participants,
      isNew: minutesSince(d.publishedAt ?? d.createdAt) < 360 && replyCount === 0,
      // Public: search engines read pages anonymously, so the robots decision cannot be staff-only.
      indexable: seo.indexed,
      ...(viewer?.staff ? { seo } : {}),
    };
  };

  const cards = async (rows: DiscussionRow[], viewer: Viewer | null) => {
    const replies = await repliesOf(rows.map((r) => r.id));
    return rows.map((r) => toCard(r, replies, viewer));
  };

  const findCategory = async (slug: string) => {
    const category = (await strapi.db.query('api::category.category').findOne({
      where: { slug },
      select: ['id', 'documentId', 'name', 'slug'],
    })) as CategoryRow | null;
    if (!category) throw new errors.NotFoundError('Catégorie introuvable.');
    return category;
  };

  const linksAllowed = async (viewer: Viewer) =>
    viewer.staff || (await reputation().of(viewer.id)).level.index >= EXTERNAL_LINK_LEVEL;

  /** Mentioned members (except the author) get a notification; returns their display names. */
  const notifyMentions = async (text: string, actor: number, refs: { discussion?: number; post?: number }, title: string) => {
    const names = [...new Set([...text.matchAll(MENTION_RE)].map((m) => m[1]))].slice(0, 10);
    if (!names.length) return [] as string[];
    const users = (await strapi.db.query('plugin::users-permissions.user').findMany({
      where: { username: { $in: names }, blocked: false },
      select: ['id', 'username', 'displayName'],
    })) as Array<{ id: number; username: string; displayName?: string }>;
    const short = title.length > 40 ? `${title.slice(0, 40)}…` : title;
    for (const u of users) {
      await notify({ recipient: u.id, actor, kind: 'mention', text: `vous a mentionné dans « ${short} »`, ...refs });
    }
    return users.filter((u) => u.id !== actor).map((u) => u.displayName || u.username);
  };

  const ensureFollow = async (userId: number, discussionId: number) => {
    const existing = await strapi.db.query('api::follow.follow').findOne({
      where: { user: { id: userId }, discussion: { id: discussionId } },
      select: ['id'],
    });
    if (existing) return;
    try {
      await strapi.documents('api::follow.follow').create({ data: { key: `${userId}:${discussionId}`, user: userId, discussion: discussionId } as never });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  };

  const bySlug = async (slug: string) => {
    const row = (await db().findOne({ where: { slug }, select: DISCUSSION_SELECT, populate: DISCUSSION_POPULATE })) as DiscussionRow | null;
    if (!row) throw new errors.NotFoundError('Discussion introuvable.');
    return row;
  };

  const byDocumentId = async (documentId: string) => {
    const row = (await db().findOne({ where: { documentId }, select: DISCUSSION_SELECT, populate: DISCUSSION_POPULATE })) as DiscussionRow | null;
    if (!row) throw new errors.NotFoundError('Discussion introuvable.');
    return row;
  };

  const detail = async (slug: string, viewer: Viewer | null, countView: boolean) => {
    const d = await bySlug(slug);
    if (countView) {
      await strapi.db.connection('discussions').where({ id: d.id }).increment('views', 1);
      d.views = (d.views ?? 0) + 1;
    }

    const replies = await repliesOf([d.id], REPLIES_LIMIT);
    const peopleIds = [d.author?.id, ...replies.map((r) => r.author?.id)].filter((id): id is number => Boolean(id));
    const [levels, likedReplies, likedDiscussion, follow, vote, relatedRows] = await Promise.all([
      reputation().compute([...new Set(peopleIds)]),
      usefulSet(viewer, 'reply', replies.map((r) => r.documentId)),
      usefulSet(viewer, 'discussion', [d.documentId]),
      viewer
        ? strapi.db.query('api::follow.follow').findOne({ where: { user: { id: viewer.id }, discussion: { id: d.id } }, select: ['id'] })
        : null,
      viewer && d.type === 'poll'
        ? (strapi.db.query('api::poll-vote.poll-vote').findOne({
            where: { user: { id: viewer.id }, discussion: { id: d.id } },
            select: ['option'],
          }) as Promise<{ option: number } | null>)
        : null,
      d.category
        ? (db().findMany({
            where: { category: { id: d.category.id }, id: { $ne: d.id } },
            select: DISCUSSION_SELECT,
            populate: DISCUSSION_POPULATE,
            orderBy: [{ lastActivityAt: 'desc' }],
            limit: 30,
          }) as Promise<DiscussionRow[]>)
        : [],
    ]);

    const withLevel = (u: UserRow | null | undefined) => {
      if (!u) return null;
      const p = toPerson(u);
      const rep = levels.get(u.id);
      return { ...p, level: p.role === 'member' && rep ? rep.level.name : null };
    };
    const related = relatedRows.map((r) => ({ r, s: hotScore(r) })).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.r);
    const isAuthor = Boolean(viewer && d.author?.id === viewer.id);
    const usefulTotal = (d.usefulCount ?? 0) + replies.reduce((s, r) => s + (r.usefulCount ?? 0), 0);
    const people = new Map<string, Person>();
    for (const u of [d.author, ...replies.map((r) => r.author)]) if (u) people.set(u.username, toPerson(u));

    return {
      data: {
        ...toCard(d, replies, viewer),
        content: d.content,
        articleTitle: d.articleTitle ?? null,
        author: withLevel(d.author),
        pollOptions: d.type === 'poll' ? (d.pollOptions ?? []).map((o) => ({ label: o.label, votes: o.votes ?? 0 })) : null,
        solution: d.solution?.documentId ?? null,
        usefulTotal,
        participants: [...people.values()].slice(0, 8),
        replies: replies.map((r) => ({
          documentId: r.documentId,
          content: r.content,
          publishedAt: toIso(r.createdAt),
          author: withLevel(r.author),
          usefulCount: r.usefulCount ?? 0,
          verified: Boolean(r.verified),
          isSolution: d.solution?.id === r.id,
          liked: likedReplies.has(r.documentId),
          mine: Boolean(viewer && r.author?.id === viewer.id),
        })),
        related: await cards(related, viewer),
        viewer: viewer
          ? {
              liked: likedDiscussion.has(d.documentId),
              followed: Boolean(follow),
              myVote: vote ? vote.option : null,
              isAuthor,
              canSolve: d.type === 'question' && (isAuthor || viewer.staff),
              staff: viewer.staff,
            }
          : null,
      },
    };
  };

  return {
    ensureFollow,
    byDocumentId,
    linksAllowed,
    notifyMentions,

    /** Home and space feeds: tabs Récentes / Tendances / Sans réponse / Pour vous, filtered and paginated server-side. */
    async feed(query: ListQuery, viewer: Viewer | null) {
      const where: Record<string, unknown> = {};
      if (query.category) where.category = { id: (await findCategory(query.category)).id };

      let tab = query.tab;
      if (tab === 'foryou') {
        const me = viewer
          ? ((await strapi.db.query('plugin::users-permissions.user').findOne({
              where: { id: viewer.id },
              select: ['id'],
              populate: { interests: { select: ['id'] } },
            })) as { interests?: Array<{ id: number }> } | null)
          : null;
        const interests = me?.interests ?? [];
        if (!viewer || !interests.length) tab = 'hot';
        else
          where.$or = [
            { category: { id: { $in: interests.map((i) => i.id) } } },
            { featured: { $ne: 'none' } },
            { author: { id: viewer.id } },
          ];
      }
      if (tab === 'unanswered') {
        where.replyCount = 0;
        where.type = { $ne: 'poll' };
      }
      // Pinned posts lead in a space and in "Récentes"; on the home ranking, members no longer see them.
      const pinnedFirst = Boolean(query.category) || tab === 'new';
      if (!pinnedFirst && viewer && (tab === 'hot' || tab === 'foryou')) where.pinned = { $ne: true };

      const start = (query.page - 1) * query.pageSize;
      let rows: DiscussionRow[];
      let total: number;
      if (tab === 'hot' || tab === 'foryou') {
        const candidates = (await db().findMany({
          where,
          select: DISCUSSION_SELECT,
          populate: DISCUSSION_POPULATE,
          orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
          limit: HOT_CANDIDATES,
        })) as DiscussionRow[];
        const ranked = candidates
          .map((d) => ({ d, s: hotScore(d) }))
          .sort((a, b) => b.s - a.s)
          .map((x) => x.d);
        if (pinnedFirst) ranked.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
        total = ranked.length;
        rows = ranked.slice(start, start + query.pageSize);
      } else {
        const orderBy = [...(pinnedFirst ? [{ pinned: 'desc' as const }] : []), { publishedAt: query.sort }, { id: query.sort }];
        [rows, total] = await Promise.all([
          db().findMany({ where, select: DISCUSSION_SELECT, populate: DISCUSSION_POPULATE, orderBy, offset: start, limit: query.pageSize }) as Promise<
            DiscussionRow[]
          >,
          db().count({ where }),
        ]);
      }

      const unansweredWhere: Record<string, unknown> = { replyCount: 0, type: { $ne: 'poll' } };
      if (where.category) unansweredWhere.category = where.category;
      const unanswered = await db().count({ where: unansweredWhere });

      return {
        data: await cards(rows, viewer),
        meta: {
          tab,
          unanswered,
          pagination: { page: query.page, pageSize: query.pageSize, pageCount: Math.ceil(total / query.pageSize), total },
        },
      };
    },

    /** Full discussion page: content, poll, replies with authors' levels, viewer state and related reads. */
    detail: (slug: string, viewer: Viewer | null) => detail(slug, viewer, true),

    /** Creates a discussion owned by `viewer`; the caller has already validated `input`. */
    async createFor(input: DiscussionInput, viewer: Viewer) {
      const category = (await strapi.db.query('api::category.category').findOne({
        where: { documentId: input.category },
        select: ['id', 'documentId'],
      })) as CategoryRow | null;
      if (!category) {
        throw new errors.ValidationError('Catégorie inconnue.', {
          errors: [{ path: ['category'], message: 'Catégorie inconnue.', name: 'ValidationError' }],
        });
      }
      assertLinksAllowed('content', untrustedHosts(input.content), await linksAllowed(viewer));

      const before = await reputation().of(viewer.id);
      const slugTaken = async (candidate: string) => Boolean(await db().findOne({ where: { slug: candidate }, select: ['id'] }));
      // Two identical titles posted at the same moment can pick the same free slug;
      // the unique index rejects the second one, which then retries with the next suffix.
      let created: { id: number; slug: string } | null = null;
      for (let attempt = 1; !created; attempt += 1) {
        const slug = await uniqueSlug(input.title, slugTaken);
        try {
          created = (await strapi.documents(UID).create({
            data: {
              title: input.title,
              content: input.content,
              type: input.type,
              slug,
              category: category.documentId,
              author: viewer.documentId,
              pollOptions: input.type === 'poll' ? input.pollOptions.map((label) => ({ label, votes: 0 })) : null,
              lastActivityAt: new Date(),
            } as never,
            fields: ['slug'],
          })) as unknown as { id: number; slug: string };
        } catch (error) {
          if (attempt >= 3 || !isUniqueViolation(error)) throw error;
        }
      }

      await ensureFollow(viewer.id, created.id);
      await notifyMentions(input.content, viewer.id, { discussion: created.id }, input.title);
      const reason = input.type === 'question' ? 'Question publiée' : input.type === 'poll' ? 'Sondage publié' : 'Discussion publiée';
      const reward = await reputation().reward(viewer.id, before, reason);
      return { data: (await detail(created.slug, viewer, false)).data, reward };
    },

    /** Best answer: chosen by the question's author (not their own reply) or by the editorial team. */
    async setSolution(documentId: string, replyId: string | null, viewer: Viewer) {
      const d = await byDocumentId(documentId);
      if (d.type !== 'question') throw new errors.ValidationError('Seule une question peut avoir une meilleure réponse.');
      const isAuthor = d.author?.id === viewer.id;
      if (!isAuthor && !viewer.staff) throw new errors.ForbiddenError("Seul l'auteur de la question peut choisir la meilleure réponse.");

      let reply: ReplyRow | null = null;
      if (replyId) {
        reply = (await strapi.db.query(REPLY).findOne({
          where: { documentId: replyId, discussion: { id: d.id } },
          select: ['id', 'documentId'],
          populate: { author: { select: ['id', 'displayName', 'username'] } },
        })) as ReplyRow | null;
        if (!reply) throw new errors.NotFoundError('Réponse introuvable dans cette discussion.');
        if (reply.author?.id === viewer.id && !viewer.staff) throw new errors.ValidationError('Vous ne pouvez pas choisir votre propre réponse.');
      }
      await db().update({ where: { id: d.id }, data: { solution: reply ? reply.id : null } });
      if (reply?.author) {
        await notify({
          recipient: reply.author.id,
          actor: viewer.id,
          kind: 'solution',
          discussion: d.id,
          text: 'a choisi votre réponse comme meilleure réponse',
        });
      }
      return {
        data: { solution: reply?.documentId ?? null },
        meta: { author: reply?.author ? reply.author.displayName || reply.author.username : null },
      };
    },

    async vote(documentId: string, option: number, viewer: Viewer) {
      const d = await byDocumentId(documentId);
      if (d.type !== 'poll') throw new errors.ValidationError("Cette discussion n'est pas un sondage.");
      if (option >= (d.pollOptions ?? []).length) throw new errors.ValidationError('Réponse de sondage invalide.');

      const before = await reputation().of(viewer.id);
      // Counts live in a JSON column: lock the row so concurrent votes never overwrite each other.
      const { options, changed, first } = await strapi.db.connection.transaction(async (trx) => {
        const row = await trx('discussions').where({ id: d.id }).forUpdate().first('poll_options');
        const raw = typeof row?.poll_options === 'string' ? JSON.parse(row.poll_options) : row?.poll_options;
        const opts: PollOption[] = (Array.isArray(raw) ? raw : []).map((o: PollOption) => ({ label: o.label, votes: o.votes ?? 0 }));
        const existing = (await trx('poll_votes').where({ key: `${viewer.id}:${d.id}` }).first('id', 'option')) as { id: number; option: number } | undefined;
        if (existing?.option === option) return { options: opts, changed: false, first: false };
        if (existing) {
          opts[existing.option].votes = Math.max(0, opts[existing.option].votes - 1);
          await trx('poll_votes').where({ id: existing.id }).update({ option, updated_at: new Date() });
        }
        opts[option].votes += 1;
        await trx('discussions').where({ id: d.id }).update({ poll_options: JSON.stringify(opts) });
        return { options: opts, changed: true, first: !existing };
      });
      // The vote row (with its user/discussion links) goes through Strapi once the counts are safe.
      if (changed && first) {
        try {
          await strapi.documents('api::poll-vote.poll-vote').create({ data: { key: `${viewer.id}:${d.id}`, user: viewer.id, discussion: d.id, option } as never });
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
      }
      const reward = changed && first ? await reputation().reward(viewer.id, before, 'Merci pour votre vote') : null;
      return { data: { pollOptions: options, myVote: option, total: pollTotal(options) }, reward };
    },

    async toggleFollow(documentId: string, viewer: Viewer) {
      const d = await byDocumentId(documentId);
      const existing = await strapi.db.query('api::follow.follow').findOne({
        where: { user: { id: viewer.id }, discussion: { id: d.id } },
        select: ['id'],
      });
      if (existing) await strapi.db.query('api::follow.follow').delete({ where: { id: existing.id } });
      else await ensureFollow(viewer.id, d.id);
      return { data: { followed: !existing } };
    },

    /** Weekly editorial rituals shown in the right column. */
    async featured(viewer: Viewer | null) {
      const pick = async (featured: 'question' | 'poll') =>
        (await db().findOne({
          where: { featured },
          select: DISCUSSION_SELECT,
          populate: DISCUSSION_POPULATE,
          orderBy: [{ publishedAt: 'desc' }],
        })) as DiscussionRow | null;
      const [question, poll] = await Promise.all([pick('question'), pick('poll')]);
      const vote =
        viewer && poll
          ? ((await strapi.db.query('api::poll-vote.poll-vote').findOne({
              where: { user: { id: viewer.id }, discussion: { id: poll.id } },
              select: ['option'],
            })) as { option: number } | null)
          : null;
      const [q] = question ? await cards([question], viewer) : [null];
      const [p] = poll ? await cards([poll], viewer) : [null];
      return {
        data: {
          question: q,
          poll:
            p && poll
              ? { ...p, pollOptions: (poll.pollOptions ?? []).map((o) => ({ label: o.label, votes: o.votes ?? 0 })), myVote: vote ? vote.option : null }
              : null,
        },
      };
    },

    /** "Ces discussions répondent peut-être déjà à votre question" while typing a title. */
    /** Indexable discussions only (same editorial rule as the page's robots tag), for sitemap.xml. */
    async sitemap() {
      const rows = (await db().findMany({
        select: ['id', 'slug', 'usefulCount', 'publishedAt', 'createdAt', 'lastActivityAt'],
        populate: { author: PERSON_POPULATE, category: { select: ['slug'] }, solution: { select: ['id'] } },
        orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
        limit: SITEMAP_LIMIT,
      })) as DiscussionRow[];
      const byDiscussion = new Map<number, ReplyRow[]>();
      for (const r of await repliesOf(rows.map((d) => d.id))) {
        if (r.discussion) byDiscussion.set(r.discussion.id, [...(byDiscussion.get(r.discussion.id) ?? []), r]);
      }
      return {
        data: rows
          .filter((d) => seoStatus(d, byDiscussion.get(d.id) ?? []).indexed)
          .map((d) => ({ slug: d.slug, lastModified: toIso(d.lastActivityAt ?? d.publishedAt ?? d.createdAt) })),
      };
    },

    async similar(q: string) {
      const words = (q.toLowerCase().match(/[a-zà-ÿ0-9-]{3,}/g) ?? []).filter((w) => !STOP_WORDS.has(w)).slice(0, 8);
      if (!words.length) return { data: [] };
      const rows = (await db().findMany({
        where: { $or: words.map((w) => ({ title: { $containsi: w } })) },
        select: ['id', 'documentId', 'title', 'slug', 'replyCount'],
        populate: { solution: { select: ['id'] } },
        limit: 30,
      })) as DiscussionRow[];
      const ranked = rows
        .map((r) => ({ r, s: words.filter((w) => r.title.toLowerCase().includes(w)).length }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 3);
      return {
        data: ranked.map(({ r }) => ({
          documentId: r.documentId,
          title: r.title,
          slug: r.slug,
          replyCount: r.replyCount ?? 0,
          solved: Boolean(r.solution),
        })),
      };
    },

    /** Search over titles, bodies and replies (case-insensitive). */
    async search(q: string, viewer: Viewer | null) {
      if (!q) return { data: [], meta: { total: 0 } };
      const rows = (await db().findMany({
        where: { $or: [{ title: { $containsi: q } }, { content: { $containsi: q } }, { replies: { content: { $containsi: q } } }] },
        select: DISCUSSION_SELECT,
        populate: DISCUSSION_POPULATE,
        orderBy: [{ lastActivityAt: 'desc' }],
        limit: 50,
      })) as DiscussionRow[];
      return { data: await cards(rows, viewer), meta: { total: rows.length } };
    },

    /** Discussions started by a member (profile tab). */
    async byAuthor(authorId: number, viewer: Viewer | null) {
      const rows = (await db().findMany({
        where: { author: { id: authorId } },
        select: DISCUSSION_SELECT,
        populate: DISCUSSION_POPULATE,
        orderBy: [{ publishedAt: 'desc' }],
        limit: 20,
      })) as DiscussionRow[];
      return cards(rows, viewer);
    },
  };
});
