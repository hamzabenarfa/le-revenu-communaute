import { factories } from '@strapi/strapi';
import { requireStaff, requireUser } from '../../../utils/auth';
import { validateReplyInput } from '../../../utils/validation';

const UID = 'api::reply.reply';
type Service = Record<string, (...args: unknown[]) => Promise<unknown>>;

export default factories.createCoreController(UID, ({ strapi }) => ({
  /** POST /api/replies — the author is always the authenticated caller. */
  async create(ctx) {
    const viewer = requireUser(ctx.state);
    ctx.body = await (strapi.service(UID) as unknown as Service).createFor(validateReplyInput(ctx.request.body), viewer);
    ctx.status = 201;
  },
  /** POST /api/replies/:id/verify — editorial validation (toggle). */
  async verify(ctx) {
    requireStaff(ctx.state);
    ctx.body = await (strapi.service(UID) as unknown as Service).toggleVerified(String(ctx.params.id).slice(0, 64));
  },
}));
