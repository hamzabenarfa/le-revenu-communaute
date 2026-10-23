import { factories } from '@strapi/strapi';
import { optionalUser, requireUser } from '../../../utils/auth';

type Service = Record<string, (...args: unknown[]) => Promise<unknown>>;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default factories.createCoreController('api::event.event', ({ strapi }) => ({
  /** GET /api/events?category=<slug> — upcoming sessions. */
  async find(ctx) {
    const category = typeof ctx.query.category === 'string' && SLUG_RE.test(ctx.query.category) ? ctx.query.category : null;
    ctx.body = await (strapi.service('api::event.event') as unknown as Service).upcoming(category, optionalUser(ctx.state));
  },
  /** POST /api/events/:id/rsvp (toggle) */
  async rsvp(ctx) {
    ctx.body = await (strapi.service('api::event.event') as unknown as Service).toggleRsvp(String(ctx.params.id).slice(0, 64), requireUser(ctx.state));
  },
}));
