import type { Core } from '@strapi/strapi';
import { ensureUniqueIndexes } from './bootstrap/indexes';
import { syncPermissions } from './bootstrap/permissions';

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureUniqueIndexes(strapi);
    await syncPermissions(strapi);
  },
};
