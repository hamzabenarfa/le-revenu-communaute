import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::reply.reply', {
  only: ['create'],
  config: { create: { policies: ['global::rate-limit'] } },
});
