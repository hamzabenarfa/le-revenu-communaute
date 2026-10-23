import { factories } from '@strapi/strapi';

interface NotifyInput {
  recipient: number;
  actor?: number;
  kind: 'reply' | 'like' | 'mention' | 'badge' | 'solution' | 'level' | 'event';
  text: string;
  badge?: string;
  discussion?: number;
  post?: number;
}

export default factories.createCoreService('api::notification.notification', ({ strapi }) => ({
  /** Records a notification; self-notifications (actor = recipient) are skipped. */
  async notify(input: NotifyInput) {
    if (input.actor && input.actor === input.recipient) return;
    // Toggling "Utile" or a best answer on and off must not spam the recipient: same notice within an hour = once.
    if (input.actor && input.kind !== 'badge' && input.kind !== 'level') {
      const duplicate = await strapi.db.query('api::notification.notification').findOne({
        where: {
          recipient: { id: input.recipient },
          actor: { id: input.actor },
          kind: input.kind,
          createdAt: { $gte: new Date(Date.now() - 3_600_000) },
          ...(input.discussion ? { discussion: { id: input.discussion } } : {}),
          ...(input.post ? { post: { id: input.post } } : {}),
        },
        select: ['id'],
      });
      if (duplicate) return;
    }
    await strapi.documents('api::notification.notification').create({
      data: {
        recipient: input.recipient,
        actor: input.actor ?? null,
        kind: input.kind,
        text: input.text.slice(0, 200),
        badge: input.badge ?? null,
        discussion: input.discussion ?? null,
        post: input.post ?? null,
        read: false,
      } as never,
    });
  },
}));
