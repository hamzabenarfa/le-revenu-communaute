import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::charter.charter', { only: ['find'] });
