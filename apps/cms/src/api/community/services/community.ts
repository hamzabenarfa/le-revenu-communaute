import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { BADGES, LEVELS, levelFor, POINT_RULES } from '../../../utils/reputation';
import type { ProfileInput } from '../../../utils/validation';
import type { Viewer } from '../../discussion/services/discussion';
import { PERSON_POPULATE, serializeCategory, toIso } from '../../discussion/services/discussion';
import { toPerson, type UserRow } from './people';
import type { Reputation } from './reputation';

const USER = 'plugin::users-permissions.user';
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const sinceLabel = (d?: string | Date) => {
  if (!d) return null;
  const date = new Date(d);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};
const todayKey = () => new Date().toISOString().slice(0, 10);
const handleFrom = (pseudo: string) =>
  (pseudo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Membre').slice(0, 20);

const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const reputation = () =>
    strapi.service('api::community.reputation') as unknown as {
      of: (id: number) => Promise<Reputation>;
      compute: (ids: number[] | null) => Promise<Map<number, Reputation>>;
    };

  /** Visit history (visitDays) stays private; everything else is public on the profile. */
  const progress = (rep: Reputation) => {
    const { visitDays: _private, ...stats } = rep.stats;
    return { points: rep.points, monthPoints: rep.monthPoints, level: rep.level, badges: rep.badges, stats };
  };

  return {
    /** Hero figures, computed from the data rather than written in the page. */
    async stats() {
      const [members, discussions, replies, questions, solved] = await Promise.all([
        strapi.db.query(USER).count({ where: { blocked: false, memberRole: 'member' } }),
        strapi.db.query('api::discussion.discussion').count({}),
        strapi.db.query('api::reply.reply').count({}),
        strapi.db.query('api::discussion.discussion').count({ where: { type: 'question' } }),
        strapi.db.query('api::discussion.discussion').count({ where: { type: 'question', replyCount: { $gt: 0 } } }),
      ]);
      return { data: { members, discussions, replies, resolvedRate: questions ? Math.round((solved * 100) / questions) : 0 } };
    },

    /** Spaces with their activity counts ("Tous les espaces", space header). */
    async spaces() {
      const categories = (await strapi.db.query('api::category.category').findMany({
        select: ['id', 'documentId', 'name', 'slug', 'description', 'color', 'icon', 'rubrique', 'position'],
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
      })) as Array<{ id: number; documentId: string; name: string; slug: string; description?: string; color?: string; icon?: string; rubrique?: string }>;
      const discussions = (await strapi.db.query('api::discussion.discussion').findMany({
        select: ['id', 'replyCount'],
        populate: { category: { select: ['id'] }, author: { select: ['id'] } },
      })) as Array<{ replyCount?: number; category?: { id: number }; author?: { id: number } }>;
      return {
        data: categories.map((c) => {
          const own = discussions.filter((d) => d.category?.id === c.id);
          return {
            ...serializeCategory(c),
            description: c.description ?? null,
            rubrique: c.rubrique ?? null,
            discussionCount: own.length,
            replyCount: own.reduce((s, d) => s + (d.replyCount ?? 0), 0),
            activeMembers: new Set(own.map((d) => d.author?.id).filter(Boolean)).size,
          };
        }),
      };
    },

    /** Own account: profile, progression, unread notifications. Also records the daily visit. */
    async me(viewer: Viewer) {
      const user = (await strapi.db.query(USER).findOne({
        where: { id: viewer.id },
        select: ['id', 'documentId', 'username', 'email', 'displayName', 'avatarColor', 'memberRole', 'subscriber', 'proTitle', 'bio', 'onboarded', 'streak', 'visitDays', 'lastVisitOn', 'createdAt'],
        populate: { photo: { select: ['url', 'formats'] }, interests: { select: ['documentId', 'slug'] } },
      })) as UserRow & { email: string; onboarded?: boolean; visitDays?: number; lastVisitOn?: string | null; interests?: Array<{ documentId: string; slug: string }> };
      if (!user) throw new errors.UnauthorizedError('Session invalide.');

      const today = todayKey();
      if (user.lastVisitOn !== today) {
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        const streak = user.lastVisitOn === yesterday ? (user.streak ?? 0) + 1 : 1;
        await strapi.db.query(USER).update({
          where: { id: viewer.id },
          data: { lastVisitOn: today, streak, visitDays: (user.visitDays ?? 0) + 1 },
        });
        user.streak = streak;
      }
      const [rep, unread] = await Promise.all([
        reputation().of(viewer.id),
        strapi.db.query('api::notification.notification').count({ where: { recipient: { id: viewer.id }, read: false } }),
      ]);
      return {
        data: {
          ...toPerson(user),
          email: user.email,
          bio: user.bio ?? '',
          onboarded: Boolean(user.onboarded),
          streak: user.streak ?? 0,
          interests: (user.interests ?? []).map((i) => i.slug),
          interestIds: (user.interests ?? []).map((i) => i.documentId),
          staff: viewer.staff,
          unread,
          ...progress(rep),
        },
      };
    },

    /** Pseudo, presentation and interests. The @handle is derived from the first pseudo, then frozen. */
    async updateMe(viewer: Viewer, input: ProfileInput) {
      const user = (await strapi.db.query(USER).findOne({ where: { id: viewer.id }, select: ['id', 'username', 'onboarded'] })) as {
        id: number;
        username: string;
        onboarded?: boolean;
      };
      const data: Record<string, unknown> = {};
      if (input.displayName !== undefined) {
        data.displayName = input.displayName;
        if (!user.onboarded) {
          const base = handleFrom(input.displayName);
          let handle = base;
          for (let i = 2; await strapi.db.query(USER).findOne({ where: { username: handle, id: { $ne: viewer.id } }, select: ['id'] }); i += 1) {
            handle = `${base}_${i}`;
          }
          data.username = handle;
        }
      }
      if (input.bio !== undefined) data.bio = input.bio;
      if (input.interests !== undefined) {
        const found = (await strapi.db.query('api::category.category').findMany({
          where: { documentId: { $in: input.interests } },
          select: ['id'],
        })) as Array<{ id: number }>;
        if (found.length !== input.interests.length) {
          throw new errors.ValidationError('Centres d’intérêt invalides.', {
            errors: [{ path: ['interests'], message: 'Centres d’intérêt invalides.', name: 'ValidationError' }],
          });
        }
        data.interests = { set: found.map((c) => c.id) };
      }
      const firstTime = !user.onboarded;
      if (firstTime) data.onboarded = true;
      const before = firstTime ? await reputation().of(viewer.id) : null;
      await strapi.db.query(USER).update({ where: { id: viewer.id }, data });
      const reward = before
        ? await (strapi.service('api::community.reputation') as unknown as {
            reward: (id: number, b: Reputation, r: string) => Promise<unknown>;
          }).reward(viewer.id, before, 'Bienvenue dans la communauté !')
        : null;
      return { data: (await this.me(viewer)).data, reward };
    },

    /** Profile photo: the client crops it square; the server only accepts small images. */
    async setPhoto(viewer: Viewer, file: unknown | null) {
      const upload = strapi.plugin('upload').service('upload') as unknown as {
        upload: (args: { data: Record<string, unknown>; files: unknown }) => Promise<Array<{ id: number }>>;
        remove: (file: unknown) => Promise<unknown>;
      };
      const current = (await strapi.db.query(USER).findOne({ where: { id: viewer.id }, select: ['id'], populate: { photo: true } })) as {
        photo?: { id: number } | null;
      } | null;
      let photo: number | null = null;
      if (file) {
        const [uploaded] = await upload.upload({ data: { fileInfo: { name: `avatar-${viewer.documentId}` } }, files: file });
        photo = uploaded.id;
      }
      await strapi.db.query(USER).update({ where: { id: viewer.id }, data: { photo } });
      // The previous avatar is no longer referenced: delete it so storage does not grow forever.
      if (current?.photo) await upload.remove(current.photo);
      return { data: (await this.me(viewer)).data };
    },

    /** Public profile with stats, progression, badges and recent activity. */
    async profile(username: string, viewer: Viewer | null) {
      const people = strapi.service('api::community.people') as unknown as { byUsername: (u: string) => Promise<UserRow | null> };
      const user = await people.byUsername(username);
      if (!user) throw new errors.NotFoundError('Membre introuvable.');
      const rep = await reputation().of(user.id);
      const discussionsSvc = strapi.service('api::discussion.discussion') as unknown as { byAuthor: (id: number, v: Viewer | null) => Promise<unknown[]> };
      const postsSvc = strapi.service('api::post.post') as unknown as { list: (o: { authorId: number; limit: number }) => Promise<unknown[]> };
      const [discussions, posts, replies] = await Promise.all([
        discussionsSvc.byAuthor(user.id, viewer),
        postsSvc.list({ authorId: user.id, limit: 20 }),
        strapi.db.query('api::reply.reply').findMany({
          where: { author: { id: user.id } },
          select: ['id', 'documentId', 'content', 'createdAt'],
          populate: { discussion: { select: ['id', 'title', 'slug'], populate: { solution: { select: ['id'] } } } },
          orderBy: [{ createdAt: 'desc' }],
          limit: 8,
        }) as Promise<Array<{ id: number; content: string; createdAt: string; discussion?: { title: string; slug: string; solution?: { id: number } } }>>,
      ]);
      return {
        data: {
          ...toPerson(user),
          bio: user.bio ?? '',
          since: sinceLabel(user.createdAt),
          streak: user.streak ?? 0,
          isMe: Boolean(viewer && viewer.id === user.id),
          ...progress(rep),
          discussions,
          posts,
          replies: replies
            .filter((r) => r.discussion)
            .map((r) => ({
              content: r.content.length > 160 ? `${r.content.slice(0, 160)}…` : r.content,
              publishedAt: toIso(r.createdAt),
              discussion: { title: r.discussion!.title, slug: r.discussion!.slug },
              isSolution: r.discussion!.solution?.id === r.id,
            })),
        },
      };
    },

    /** Hover card: who is this member, in a glance. */
    async card(username: string) {
      const people = strapi.service('api::community.people') as unknown as { byUsername: (u: string) => Promise<UserRow | null> };
      const user = await people.byUsername(username);
      if (!user) throw new errors.NotFoundError('Membre introuvable.');
      const rep = await reputation().of(user.id);
      return {
        data: {
          ...toPerson(user),
          bio: user.bio ?? '',
          since: sinceLabel(user.createdAt),
          level: rep.level.name,
          replies: rep.stats.replies,
          solutions: rep.stats.solutions,
        },
      };
    },

    /** Monthly or all-time ranking of members (editorial accounts excluded). */
    async leaderboard(period: 'month' | 'all', viewer: Viewer | null) {
      const members = (await strapi.db.query(USER).findMany({
        where: { blocked: false, memberRole: 'member' },
        select: ['id', 'documentId', 'username', 'displayName', 'avatarColor', 'memberRole', 'subscriber', 'proTitle'],
        populate: { photo: { select: ['url', 'formats'] } },
      })) as UserRow[];
      const reps = await reputation().compute(members.map((m) => m.id));
      const rows = members
        .map((m) => {
          const rep = reps.get(m.id);
          return { person: toPerson(m), points: rep?.points ?? 0, monthPoints: rep?.monthPoints ?? 0, level: rep?.level.name ?? levelFor(0).name, me: viewer?.id === m.id };
        })
        .sort((a, b) => (period === 'all' ? b.points - a.points : b.monthPoints - a.monthPoints));
      return {
        data: rows,
        meta: {
          period,
          rules: POINT_RULES,
          levels: LEVELS,
          badges: Object.entries(BADGES).map(([code, b]) => ({ code, name: b.name, description: b.description, icon: b.icon })),
        },
      };
    },

    /** @mention suggestions: people on the page first, then the editorial team, then active members. */
    async mentionable(q: string, context: string[], viewer: Viewer) {
      const nq = norm(q);
      const users = (await strapi.db.query(USER).findMany({
        where: { blocked: false, memberRole: { $ne: 'moderator' }, id: { $ne: viewer.id } },
        select: ['id', 'documentId', 'username', 'displayName', 'avatarColor', 'memberRole', 'subscriber', 'proTitle'],
        populate: { photo: { select: ['url', 'formats'] } },
        limit: 500,
      })) as UserRow[];
      const near = new Set(context);
      const reps = await reputation().compute(users.map((u) => u.id));
      return {
        data: users
          .filter((u) => !nq || norm(u.username).includes(nq) || norm(u.displayName ?? '').includes(nq))
          .map((u) => {
            const starts = !nq || norm(u.username).startsWith(nq) || norm(u.displayName ?? '').startsWith(nq);
            const rank = (near.has(u.username) ? 0 : u.memberRole === 'redaction' ? 2 : 4) + (starts ? 0 : 1);
            return { person: toPerson(u), near: near.has(u.username), rank, points: reps.get(u.id)?.points ?? 0 };
          })
          .sort((a, b) => a.rank - b.rank || b.points - a.points)
          .slice(0, 6)
          .map(({ person, near: n }) => ({ ...person, near: n })),
      };
    },

    async notifications(viewer: Viewer) {
      const rows = (await strapi.db.query('api::notification.notification').findMany({
        where: { recipient: { id: viewer.id } },
        select: ['id', 'documentId', 'kind', 'text', 'badge', 'read', 'createdAt'],
        populate: { actor: PERSON_POPULATE, discussion: { select: ['slug'] }, post: { select: ['slug'] } },
        orderBy: [{ createdAt: 'desc' }],
        limit: 30,
      })) as Array<{
        documentId: string;
        kind: string;
        text: string;
        badge?: string | null;
        read: boolean;
        createdAt: string;
        actor?: UserRow | null;
        discussion?: { slug: string } | null;
        post?: { slug: string } | null;
      }>;
      return {
        data: rows.map((n) => ({
          documentId: n.documentId,
          kind: n.kind,
          text: n.text,
          badge: n.badge && BADGES[n.badge] ? { code: n.badge, icon: BADGES[n.badge].icon } : null,
          read: n.read,
          createdAt: toIso(n.createdAt),
          actor: n.actor ? toPerson(n.actor) : null,
          href: n.discussion ? `/discussions/${n.discussion.slug}` : n.post ? `/billets/${n.post.slug}` : null,
        })),
      };
    },

    async markRead(viewer: Viewer, documentId: string | null) {
      await strapi.db.query('api::notification.notification').updateMany({
        where: { recipient: { id: viewer.id }, ...(documentId ? { documentId } : {}) },
        data: { read: true },
      });
      return { data: { ok: true } };
    },

    async report(viewer: Viewer, input: { targetType: string; targetId: string; reason: string }) {
      const useful = strapi.service('api::useful.useful') as unknown as { resolveTarget: (t: string, id: string) => Promise<unknown> };
      await useful.resolveTarget(input.targetType, input.targetId);
      // One open report per member and message: repeated clicks do not flood the moderation queue.
      const existing = await strapi.db.query('api::report.report').findOne({
        where: { reporter: { id: viewer.id }, targetType: input.targetType, targetId: input.targetId, status: 'open' },
        select: ['id'],
      });
      if (existing) return { data: { ok: true } };
      await strapi.documents('api::report.report').create({ data: { reporter: viewer.id, ...input, status: 'open' } as never });
      return { data: { ok: true } };
    },
  };
};
