import { factories } from '@strapi/strapi';
import { optionalUser, requireUser } from '../../../utils/auth';
import { assertSlug, parseListQuery, validateDiscussionInput, validateSearch, validateVote } from '../../../utils/validation';

const UID = 'api::discussion.discussion';
type Service = Record<string, (...args: unknown[]) => Promise<unknown>>;

export default factories.createCoreController(UID, ({ strapi }) => {
  const service = () => strapi.service(UID) as unknown as Service;
  const id = (raw: unknown) => String(raw ?? '').slice(0, 64);

  return {
    /** GET /api/discussions?tab=new|hot|unanswered|foryou&category=<slug>&sort=desc|asc&page=1&pageSize=10 */
    async find(ctx) {
      ctx.body = await service().feed(parseListQuery(ctx.query), optionalUser(ctx.state));
    },
    /** GET /api/discussions/slug/:slug */
    async findBySlug(ctx) {
      ctx.body = await service().detail(assertSlug(ctx.params.slug), optionalUser(ctx.state));
    },
    /** POST /api/discussions — the author is always the authenticated caller. */
    async create(ctx) {
      const viewer = requireUser(ctx.state);
      ctx.body = await service().createFor(validateDiscussionInput(ctx.request.body), viewer);
      ctx.status = 201;
    },
    /** GET /api/discussions/featured — question and poll of the week. */
    async featured(ctx) {
      ctx.body = await service().featured(optionalUser(ctx.state));
    },
    /** GET /api/discussions/similar?q= */
    async similar(ctx) {
      ctx.body = await service().similar(validateSearch(ctx.query));
    },
    /** GET /api/search?q= */
    async search(ctx) {
      ctx.body = await service().search(validateSearch(ctx.query), optionalUser(ctx.state));
    },
    /** PUT /api/discussions/:id/solution { data: { reply: <documentId> | null } } */
    async solution(ctx) {
      const viewer = requireUser(ctx.state);
      const body = ctx.request.body as { data?: { reply?: unknown } } | undefined;
      const reply = body?.data?.reply;
      ctx.body = await service().setSolution(id(ctx.params.id), typeof reply === 'string' ? reply.slice(0, 64) : null, viewer);
    },
    /** POST /api/discussions/:id/vote { data: { option } } */
    async vote(ctx) {
      const viewer = requireUser(ctx.state);
      ctx.body = await service().vote(id(ctx.params.id), validateVote(ctx.request.body), viewer);
    },
    /** POST /api/discussions/:id/follow (toggle) */
    async follow(ctx) {
      ctx.body = await service().toggleFollow(id(ctx.params.id), requireUser(ctx.state));
    },
  };
});
