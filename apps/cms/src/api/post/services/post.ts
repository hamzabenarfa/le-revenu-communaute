import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { untrustedHosts } from '../../../utils/links';
import { uniqueSlug } from '../../../utils/slug';
import { assertLinksAllowed, type PostInput } from '../../../utils/validation';
import { toPerson, type UserRow } from '../../community/services/people';
import type { Reputation, Reward } from '../../community/services/reputation';
import { excerptOf, isUniqueViolation, PERSON_FIELDS, PERSON_POPULATE, serializeCategory, toIso, type Viewer } from '../../discussion/services/discussion';

const UID = 'api::post.post';

interface PostRow {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: string;
  views?: number;
  usefulCount?: number;
  commentCount?: number;
  createdAt?: string;
  author?: UserRow | null;
  category?: { documentId: string; name: string; slug: string; color?: string | null; icon?: string | null } | null;
}

const SELECT = ['id', 'documentId', 'title', 'slug', 'content', 'views', 'usefulCount', 'commentCount', 'createdAt'];
const POPULATE = { author: PERSON_POPULATE, category: { select: ['documentId', 'name', 'slug', 'color', 'icon'] } };
const readTime = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 200));

const summary = (p: PostRow) => ({
  documentId: p.documentId,
  title: p.title,
  slug: p.slug,
  excerpt: excerptOf(p.content),
  readTime: readTime(p.content),
  publishedAt: toIso(p.createdAt),
  author: p.author ? toPerson(p.author) : null,
  category: serializeCategory(p.category as never),
  usefulCount: p.usefulCount ?? 0,
  commentCount: p.commentCount ?? 0,
  views: p.views ?? 0,
});

export default factories.createCoreService(UID, ({ strapi }) => {
  const db = () => strapi.db.query(UID);
  const reputation = () =>
    strapi.service('api::community.reputation') as unknown as {
      of: (id: number) => Promise<Reputation>;
      compute: (ids: number[]) => Promise<Map<number, Reputation>>;
      reward: (id: number, before: Reputation, reason: string) => Promise<Reward>;
    };
  const discussions = () =>
    strapi.service('api::discussion.discussion') as unknown as {
      linksAllowed: (v: Viewer) => Promise<boolean>;
      notifyMentions: (text: string, actor: number, refs: { post?: number }, title: string) => Promise<string[]>;
    };

  const bySlug = async (slug: string) => {
    const row = (await db().findOne({ where: { slug }, select: SELECT, populate: POPULATE })) as PostRow | null;
    if (!row) throw new errors.NotFoundError('Billet introuvable.');
    return row;
  };

  return {
    /** Latest posts, optionally by one author ("Billets des membres", profile tab). */
    async list({ authorId, limit = 10 }: { authorId?: number; limit?: number }) {
      const rows = (await db().findMany({
        where: authorId ? { author: { id: authorId } } : {},
        select: SELECT,
        populate: POPULATE,
        orderBy: [{ createdAt: 'desc' }],
        limit: Math.min(limit, 50),
      })) as PostRow[];
      return rows.map(summary);
    },

    async detail(slug: string, viewer: Viewer | null) {
      const p = await bySlug(slug);
      await strapi.db.connection('posts').where({ id: p.id }).increment('views', 1);
      const comments = (await strapi.db.query('api::comment.comment').findMany({
        where: { post: { id: p.id } },
        select: ['id', 'documentId', 'content', 'usefulCount', 'createdAt'],
        populate: { author: PERSON_POPULATE },
        orderBy: [{ createdAt: 'asc' }],
        limit: 200,
      })) as Array<{ id: number; documentId: string; content: string; usefulCount?: number; createdAt: string; author?: UserRow }>;
      const liked = viewer
        ? ((await strapi.db.query('api::useful.useful').findMany({
            where: { user: { id: viewer.id }, targetId: { $in: [p.documentId, ...comments.map((c) => c.documentId)] } },
            select: ['targetId'],
          })) as Array<{ targetId: string }>)
        : [];
      const likedIds = new Set(liked.map((l) => l.targetId));
      const authorRep = p.author ? (await reputation().compute([p.author.id])).get(p.author.id) : undefined;
      const others = p.author
        ? ((await db().findMany({
            where: { author: { id: p.author.id }, id: { $ne: p.id } },
            select: SELECT,
            populate: POPULATE,
            orderBy: [{ createdAt: 'desc' }],
            limit: 4,
          })) as PostRow[])
        : [];
      return {
        data: {
          ...summary({ ...p, views: (p.views ?? 0) + 1 }),
          content: p.content,
          author: p.author
            ? {
                ...toPerson(p.author),
                bio: p.author.bio ?? null,
                level: authorRep?.level.name ?? null,
                points: authorRep?.points ?? 0,
              }
            : null,
          liked: likedIds.has(p.documentId),
          comments: comments.map((c) => ({
            documentId: c.documentId,
            content: c.content,
            publishedAt: toIso(c.createdAt),
            author: c.author ? toPerson(c.author) : null,
            usefulCount: c.usefulCount ?? 0,
            liked: likedIds.has(c.documentId),
            mine: Boolean(viewer && c.author?.id === viewer.id),
          })),
          moreFromAuthor: others.map(summary),
        },
      };
    },

    async createFor(input: PostInput, viewer: Viewer) {
      let categoryId: string | null = null;
      if (input.category) {
        const c = (await strapi.db.query('api::category.category').findOne({
          where: { documentId: input.category },
          select: ['documentId'],
        })) as { documentId: string } | null;
        if (!c) throw new errors.ValidationError('Thème inconnu.', { errors: [{ path: ['category'], message: 'Thème inconnu.', name: 'ValidationError' }] });
        categoryId = c.documentId;
      }
      assertLinksAllowed('content', untrustedHosts(input.content), await discussions().linksAllowed(viewer));
      const before = await reputation().of(viewer.id);
      const taken = async (s: string) => Boolean(await db().findOne({ where: { slug: s }, select: ['id'] }));
      let created: { id: number; slug: string } | null = null;
      for (let attempt = 1; !created; attempt += 1) {
        try {
          created = (await strapi.documents(UID).create({
            data: { title: input.title, content: input.content, category: categoryId, author: viewer.documentId, slug: await uniqueSlug(input.title, taken) } as never,
            fields: ['slug'],
          })) as unknown as { id: number; slug: string };
        } catch (error) {
          if (attempt >= 3 || !isUniqueViolation(error)) throw error;
        }
      }
      const mentioned = await discussions().notifyMentions(input.content, viewer.id, { post: created.id }, input.title);
      const reward = await reputation().reward(viewer.id, before, 'Billet publié');
      return { data: { slug: created.slug }, reward, meta: { mentioned } };
    },

    async comment(input: { content: string; post: string }, viewer: Viewer) {
      const p = (await db().findOne({
        where: { documentId: input.post },
        select: ['id', 'documentId', 'slug', 'title'],
        populate: { author: { select: ['id'] } },
      })) as { id: number; documentId: string; slug: string; title: string; author?: { id: number } } | null;
      if (!p) throw new errors.NotFoundError('Billet introuvable.');
      assertLinksAllowed('content', untrustedHosts(input.content), await discussions().linksAllowed(viewer));
      const before = await reputation().of(viewer.id);
      const created = (await strapi.documents('api::comment.comment').create({
        data: { content: input.content, post: p.documentId, author: viewer.documentId } as never,
        fields: ['content', 'createdAt'],
        populate: { author: PERSON_FIELDS } as never,
      })) as unknown as { documentId: string; content: string; createdAt: string; author: UserRow };
      await strapi.db.connection('posts').where({ id: p.id }).increment('comment_count', 1);
      if (p.author?.id) {
        const notifications = strapi.service('api::notification.notification') as unknown as { notify: (n: Record<string, unknown>) => Promise<void> };
        await notifications.notify({ recipient: p.author.id, actor: viewer.id, kind: 'reply', post: p.id, text: 'a commenté votre billet' });
      }
      const mentioned = await discussions().notifyMentions(input.content, viewer.id, { post: p.id }, p.title);
      const reward = await reputation().reward(viewer.id, before, 'Merci pour votre commentaire');
      return {
        data: { documentId: created.documentId, content: created.content, publishedAt: toIso(created.createdAt), author: toPerson(created.author) },
        reward,
        meta: { mentioned },
      };
    },
  };
});
