import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { TargetType } from '../../../utils/validation';
import { isUniqueViolation, type Viewer } from '../../discussion/services/discussion';

const TARGETS: Record<TargetType, { uid: string; table: string }> = {
  discussion: { uid: 'api::discussion.discussion', table: 'discussions' },
  reply: { uid: 'api::reply.reply', table: 'replies' },
  post: { uid: 'api::post.post', table: 'posts' },
  comment: { uid: 'api::comment.comment', table: 'comments' },
};

export default factories.createCoreService('api::useful.useful', ({ strapi }) => ({
  /** Resolves a message of any kind with its author and the discussion/post it belongs to. */
  async resolveTarget(targetType: TargetType, targetId: string) {
    const target = TARGETS[targetType];
    const populate: Record<string, unknown> = { author: { select: ['id'] } };
    if (targetType === 'reply') populate.discussion = { select: ['id'] };
    if (targetType === 'comment') populate.post = { select: ['id'] };
    const row = (await strapi.db.query(target.uid as never).findOne({
      where: { documentId: targetId },
      select: ['id', 'documentId', 'usefulCount'],
      populate,
    })) as {
      id: number;
      usefulCount?: number;
      author?: { id: number };
      discussion?: { id: number };
      post?: { id: number };
    } | null;
    if (!row) throw new errors.NotFoundError('Message introuvable.');
    return { ...row, target };
  },

  /** "Utile": one per member and message, never on one's own message. */
  async toggle(targetType: TargetType, targetId: string, viewer: Viewer) {
    const row = await this.resolveTarget(targetType, targetId);
    if (row.author?.id === viewer.id) {
      throw new errors.ValidationError('Vous ne pouvez pas marquer votre propre message comme utile.');
    }
    const existing = await strapi.db.query('api::useful.useful').findOne({
      where: { user: { id: viewer.id }, targetType, targetId },
      select: ['id'],
    });
    const table = strapi.db.connection(row.target.table).where({ id: row.id });
    if (existing) {
      await strapi.db.query('api::useful.useful').delete({ where: { id: existing.id } });
      await table.decrement('useful_count', 1);
    } else {
      try {
        await strapi.documents('api::useful.useful').create({
          data: { key: `${viewer.id}:${targetType}:${targetId}`, user: viewer.id, targetAuthor: row.author?.id ?? null, targetType, targetId } as never,
        });
      } catch (error) {
        // A double click already recorded it: report the current state instead of failing.
        if (isUniqueViolation(error)) return { data: { liked: true, count: row.usefulCount ?? 0 } };
        throw error;
      }
      await table.increment('useful_count', 1);
      if (row.author?.id) {
        const notifications = strapi.service('api::notification.notification') as unknown as { notify: (n: Record<string, unknown>) => Promise<void> };
        await notifications.notify({
          recipient: row.author.id,
          actor: viewer.id,
          kind: 'like',
          text: 'a trouvé votre message utile',
          discussion: targetType === 'discussion' ? row.id : (row.discussion?.id ?? null),
          post: targetType === 'post' ? row.id : (row.post?.id ?? null),
        });
      }
    }
    const count = Math.max(0, (row.usefulCount ?? 0) + (existing ? -1 : 1));
    return { data: { liked: !existing, count } };
  },
}));
