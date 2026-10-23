import { factories } from '@strapi/strapi';

// Categories are managed from the admin panel; the Content API is read-only.
export default factories.createCoreRouter('api::category.category', {
  only: ['find', 'findOne'],
});
