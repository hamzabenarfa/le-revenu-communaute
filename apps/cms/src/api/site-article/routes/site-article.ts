import { factories } from '@strapi/strapi';

// Editorial highlights are managed in the admin; the Content API only reads them.
export default factories.createCoreRouter('api::site-article.site-article', { only: ['find'] });
