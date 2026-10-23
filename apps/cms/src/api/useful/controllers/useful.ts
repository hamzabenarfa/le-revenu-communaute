import { factories } from '@strapi/strapi';
import { requireUser } from '../../../utils/auth';
import { validateTarget } from '../../../utils/validation';

export default factories.createCoreController('api::useful.useful', ({ strapi }) => ({
  /** POST /api/usefuls/toggle { data: { targetType, targetId } } */
  async toggle(ctx) {
    const viewer = requireUser(ctx.state);
    const { targetType, targetId } = validateTarget(ctx.request.body);
    const service = strapi.service('api::useful.useful') as unknown as { toggle: (...a: unknown[]) => Promise<unknown> };
    ctx.body = await service.toggle(targetType, targetId, viewer);
  },
}));
