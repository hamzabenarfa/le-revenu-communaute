import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { untrustedHosts } from '../../../utils/links';
import { assertLinksAllowed, type ReplyInput } from '../../../utils/validation';
import { toPerson, type UserRow } from '../../community/services/people';
import type { Reputation, Reward } from '../../community/services/reputation';
import { PERSON_FIELDS, toIso, type Viewer } from '../../discussion/services/discussion';

const UID = 'api::reply.reply';

interface DiscussionService {
  byDocumentId: (id: string) => Promise<{ id: number; documentId: string; slug: string; title: string; type: string; author?: { id: number } | null }>;
  ensureFollow: (userId: number, discussionId: number) => Promise<void>;
  linksAllowed: (viewer: Viewer) => Promise<boolean>;
  notifyMentions: (text: string, actor: number, refs: { discussion?: number }, title: string) => Promise<string[]>;
}

export default factories.createCoreService(UID, ({ strapi }) => {
  const discussions = () => strapi.service('api::discussion.discussion') as unknown as DiscussionService;
  const reputation = () =>
    strapi.service('api::community.reputation') as unknown as {
      of: (id: number) => Promise<Reputation>;
      reward: (id: number, before: Reputation, reason: string) => Promise<Reward>;
    };
  const notify = (n: Record<string, unknown>) =>
    (strapi.service('api::notification.notification') as unknown as { notify: (n: Record<string, unknown>) => Promise<void> }).notify(n);

  return {
    /** Attaches a reply to an existing discussion, owned by `viewer`, and tells the people who care. */
    async createFor(input: ReplyInput, viewer: Viewer) {
      const d = await discussions().byDocumentId(input.discussion);
      assertLinksAllowed('content', untrustedHosts(input.content), await discussions().linksAllowed(viewer));

      const before = await reputation().of(viewer.id);
      const created = (await strapi.documents(UID).create({
        data: { content: input.content, discussion: d.documentId, author: viewer.documentId } as never,
        fields: ['content', 'createdAt'],
        populate: { author: PERSON_FIELDS } as never,
      })) as unknown as { documentId: string; content: string; createdAt: string; author: UserRow };

      await strapi.db.connection('discussions').where({ id: d.id }).increment('reply_count', 1);
      await strapi.db.connection('discussions').where({ id: d.id }).update({ last_activity_at: new Date() });

      // The author of the discussion, then its followers, hear about the new reply.
      const followers = (await strapi.db.query('api::follow.follow').findMany({
        where: { discussion: { id: d.id } },
        select: ['id'],
        populate: { user: { select: ['id'] } },
      })) as Array<{ user?: { id: number } }>;
      if (d.author?.id) {
        await notify({
          recipient: d.author.id,
          actor: viewer.id,
          kind: 'reply',
          discussion: d.id,
          text: d.type === 'question' ? 'a répondu à votre question' : 'a réagi à votre publication',
        });
      }
      for (const f of followers) {
        if (f.user?.id && f.user.id !== d.author?.id) {
          await notify({ recipient: f.user.id, actor: viewer.id, kind: 'reply', discussion: d.id, text: 'a répondu dans une discussion que vous suivez' });
        }
      }
      const mentioned = await discussions().notifyMentions(input.content, viewer.id, { discussion: d.id }, d.title);
      await discussions().ensureFollow(viewer.id, d.id);
      const reward = await reputation().reward(viewer.id, before, 'Merci pour votre réponse');

      return {
        data: {
          documentId: created.documentId,
          content: created.content,
          publishedAt: toIso(created.createdAt),
          author: toPerson(created.author),
          discussion: { documentId: d.documentId, slug: d.slug },
        },
        reward,
        meta: { mentioned },
      };
    },

    /** Editorial validation of an answer (staff only, checked by the controller). */
    async toggleVerified(documentId: string) {
      const reply = (await strapi.db.query(UID).findOne({ where: { documentId }, select: ['id', 'verified'] })) as {
        id: number;
        verified?: boolean;
      } | null;
      if (!reply) throw new errors.NotFoundError('Réponse introuvable.');
      await strapi.db.query(UID).update({ where: { id: reply.id }, data: { verified: !reply.verified } });
      return { data: { verified: !reply.verified } };
    },
  };
});
