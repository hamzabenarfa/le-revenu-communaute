import { factories } from '@strapi/strapi';

// No update/delete routes: editing and moderation are out of scope for this slice.
export default factories.createCoreRouter('api::discussion.discussion', {
  only: ['find', 'create'],
  config: { create: { policies: ['global::rate-limit'] } },
});
