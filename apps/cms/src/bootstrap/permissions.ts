import type { Core } from '@strapi/strapi';

const READ = [
  'api::category.category.find',
  'api::category.category.findOne',
  'api::discussion.discussion.find',
  'api::discussion.discussion.findBySlug',
  'api::discussion.discussion.featured',
  'api::discussion.discussion.similar',
  'api::discussion.discussion.search',
  'api::post.post.find',
  'api::post.post.findBySlug',
  'api::event.event.find',
  'api::site-article.site-article.find',
  'api::charter.charter.find',
  'api::community.community.stats',
  'api::community.community.spaces',
  'api::community.community.profile',
  'api::community.community.card',
  'api::community.community.leaderboard',
];

const MEMBER = [
  'api::discussion.discussion.create',
  'api::discussion.discussion.solution',
  'api::discussion.discussion.vote',
  'api::discussion.discussion.follow',
  'api::reply.reply.create',
  'api::reply.reply.verify', // staff only, enforced in the controller
  'api::useful.useful.toggle',
  'api::post.post.create',
  'api::post.post.comment',
  'api::event.event.rsvp',
  'api::community.community.me',
  'api::community.community.updateMe',
  'api::community.community.setPhoto',
  'api::community.community.deletePhoto',
  'api::community.community.mentions',
  'api::community.community.notifications',
  'api::community.community.readAll',
  'api::community.community.readOne',
  'api::community.community.report',
];

/**
 * Content API permissions, declared in code so every environment is identical.
 * Anonymous visitors can only read (and sign up); members can also write.
 * Nothing can update or delete content through the Content API.
 */
export const ROLE_PERMISSIONS: Record<'public' | 'authenticated', string[]> = {
  public: [...READ, 'plugin::users-permissions.auth.register'],
  authenticated: [...READ, ...MEMBER],
};

const PERMISSION_UID = 'plugin::users-permissions.permission';
const ROLE_UID = 'plugin::users-permissions.role';
const OWNED_PREFIXES = [
  'api::category.', 'api::discussion.', 'api::reply.', 'api::post.', 'api::comment.', 'api::useful.', 'api::poll-vote.',
  'api::follow.', 'api::event.', 'api::notification.', 'api::report.', 'api::site-article.', 'api::charter.', 'api::community.',
  'plugin::users-permissions.auth.register',
];
/** Nothing outside the community APIs is revoked: sign-up stays open, as on the prototype's login screen. */
const REVOKED: Record<'public' | 'authenticated', string[]> = { public: [], authenticated: [] };

/**
 * Makes the permission table match ROLE_PERMISSIONS for the community APIs:
 * missing actions are granted, extra ones (e.g. toggled by hand in the admin) are revoked.
 */
export async function syncPermissions(strapi: Core.Strapi): Promise<void> {
  for (const [type, wanted] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await strapi.db.query(ROLE_UID).findOne({ where: { type } });
    if (!role) throw new Error(`users-permissions role "${type}" is missing`);

    const existing: Array<{ id: number; action: string }> = await strapi.db
      .query(PERMISSION_UID)
      .findMany({ where: { role: role.id }, select: ['id', 'action'] });
    const revoked = REVOKED[type as keyof typeof REVOKED];
    const owned = existing.filter(
      (p) => OWNED_PREFIXES.some((prefix) => p.action.startsWith(prefix)) || revoked.includes(p.action)
    );
    const have = new Set(owned.map((p) => p.action));

    for (const action of wanted.filter((a) => !have.has(a))) {
      await strapi.db.query(PERMISSION_UID).create({ data: { action, role: role.id } });
    }
    const extra = owned.filter((p) => !wanted.includes(p.action));
    if (extra.length) {
      await strapi.db.query(PERMISSION_UID).deleteMany({ where: { id: { $in: extra.map((p) => p.id) } } });
    }
  }
}
