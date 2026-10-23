import type { Core } from '@strapi/strapi';
import {
  type ActivityStats,
  activityPoints,
  BADGES,
  earnedBadges,
  emptyStats,
  type Level,
  levelFor,
  POINTS,
} from '../../../utils/reputation';

const USER = 'plugin::users-permissions.user';

export interface Reputation {
  stats: ActivityStats;
  points: number;
  monthPoints: number;
  level: Level;
  badges: string[];
}

export interface Reward {
  points: number;
  reason: string;
  total: number;
  badges: Array<{ code: string; name: string; description: string; icon: string }>;
  level: string | null;
}

type Row = { id: number; createdAt?: string | Date; usefulCount?: number | null; type?: string; author?: { id: number } | null };

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  /** Rows authored by `ids` (or everyone) with the fields reputation needs. */
  const authored = async (uid: string, ids: number[] | null, extra: string[] = []) =>
    (await strapi.db.query(uid as never).findMany({
      where: ids ? { author: { id: { $in: ids } } } : {},
      select: ['id', 'createdAt', 'usefulCount', ...extra],
      populate: { author: { select: ['id'] } },
    })) as Row[];

  return {
    /** Reputation for the given members (or every member when `ids` is null), in a fixed number of queries. */
    async compute(ids: number[] | null): Promise<Map<number, Reputation>> {
      const since = monthStart();
      const users = (await strapi.db.query(USER).findMany({
        where: ids ? { id: { $in: ids } } : {},
        select: ['id', 'visitDays', 'streak', 'onboarded', 'basePoints', 'baseMonthPoints'],
      })) as Array<{ id: number; visitDays?: number; streak?: number; onboarded?: boolean; basePoints?: number; baseMonthPoints?: number }>;
      const scope = ids ?? users.map((u) => u.id);

      const [discussions, replies, posts, comments, votes, solved, usefulThisMonth] = await Promise.all([
        authored('api::discussion.discussion', ids, ['type']),
        authored('api::reply.reply', ids),
        authored('api::post.post', ids),
        authored('api::comment.comment', ids),
        strapi.db.query('api::poll-vote.poll-vote').findMany({
          where: ids ? { user: { id: { $in: ids } } } : {},
          select: ['id', 'createdAt'],
          populate: { user: { select: ['id'] } },
        }) as Promise<Array<{ createdAt: string; user?: { id: number } }>>,
        strapi.db.query('api::discussion.discussion').findMany({
          where: { solution: { id: { $notNull: true } } },
          select: ['id'],
          populate: { solution: { select: ['id'], populate: { author: { select: ['id'] } } } },
        }) as Promise<Array<{ solution?: { author?: { id: number } } }>>,
        strapi.db.query('api::useful.useful').findMany({
          where: { createdAt: { $gte: since }, ...(ids ? { targetAuthor: { id: { $in: ids } } } : {}) },
          select: ['id'],
          populate: { targetAuthor: { select: ['id'] } },
        }) as Promise<Array<{ targetAuthor?: { id: number } }>>,
      ]);

      const result = new Map<number, Reputation>();
      const month = new Map<number, number>();
      const stat = (id: number | undefined) => {
        if (!id || !scope.includes(id)) return null;
        if (!result.has(id)) result.set(id, { stats: emptyStats(), points: 0, monthPoints: 0, level: levelFor(0), badges: [] });
        return result.get(id)!.stats;
      };
      const recent = (d?: string | Date) => Boolean(d && new Date(d) >= since);
      const addMonth = (id: number | undefined, pts: number) => id && month.set(id, (month.get(id) ?? 0) + pts);

      for (const u of users) stat(u.id);
      for (const d of discussions) {
        const s = stat(d.author?.id);
        if (!s) continue;
        s.discussions += 1;
        if (d.type === 'poll') s.polls += 1;
        s.usefulReceived += d.usefulCount ?? 0;
        if (recent(d.createdAt)) addMonth(d.author?.id, POINTS.discussion);
      }
      for (const [rows, key, pts] of [
        [replies, 'replies', POINTS.reply],
        [posts, 'posts', POINTS.post],
        [comments, 'comments', POINTS.comment],
      ] as const) {
        for (const r of rows) {
          const s = stat(r.author?.id);
          if (!s) continue;
          s[key] += 1;
          s.usefulReceived += r.usefulCount ?? 0;
          if (recent(r.createdAt)) addMonth(r.author?.id, pts);
        }
      }
      for (const v of votes) {
        const s = stat(v.user?.id);
        if (!s) continue;
        s.votes += 1;
        if (recent(v.createdAt)) addMonth(v.user?.id, POINTS.vote);
      }
      for (const d of solved) {
        const s = stat(d.solution?.author?.id);
        if (s) s.solutions += 1;
      }
      for (const u of usefulThisMonth) addMonth(u.targetAuthor?.id, POINTS.usefulReceived);

      for (const u of users) {
        const rep = result.get(u.id)!;
        rep.stats.visitDays = u.visitDays ?? 0;
        rep.stats.streak = u.streak ?? 0;
        rep.stats.onboarded = Boolean(u.onboarded);
        rep.points = (u.basePoints ?? 0) + activityPoints(rep.stats);
        rep.monthPoints = (u.baseMonthPoints ?? 0) + (month.get(u.id) ?? 0);
        rep.level = levelFor(rep.points);
        rep.badges = earnedBadges(rep.stats);
      }
      return result;
    },

    async of(userId: number): Promise<Reputation> {
      const map = await this.compute([userId]);
      return map.get(userId) ?? { stats: emptyStats(), points: 0, monthPoints: 0, level: levelFor(0), badges: [] };
    },

    /**
     * Compares the actor's reputation before/after an action, records badge and
     * level notifications, and returns what the UI should celebrate.
     */
    async reward(userId: number, before: Reputation, reason: string): Promise<Reward> {
      const after = await this.of(userId);
      const newBadges = after.badges.filter((b) => !before.badges.includes(b));
      const levelUp = after.level.index > before.level.index ? after.level.name : null;
      const notifications = strapi.service('api::notification.notification') as unknown as {
        notify: (n: Record<string, unknown>) => Promise<void>;
      };
      for (const code of newBadges) {
        await notifications.notify({ recipient: userId, kind: 'badge', badge: code, text: `Nouveau badge : ${BADGES[code].name}` });
      }
      if (levelUp) await notifications.notify({ recipient: userId, kind: 'level', text: `Vous passez au niveau « ${levelUp} »` });
      return {
        points: after.points - before.points,
        reason,
        total: after.points,
        badges: newBadges.map((code) => ({ code, name: BADGES[code].name, description: BADGES[code].description, icon: BADGES[code].icon })),
        level: levelUp,
      };
    },
  };
};
