import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { optionalUser, requireUser } from '../../../utils/auth';
import { assertSlug, validateCommentInput, validatePostInput } from '../../../utils/validation';

type Service = Record<string, (...args: unknown[]) => Promise<unknown>>;

export default factories.createCoreController('api::post.post', ({ strapi }) => {
  const service = () => strapi.service('api::post.post') as unknown as Service;
  return {
    /** GET /api/posts?author=<username>&limit=10 */
    async find(ctx) {
      const limit = Number(ctx.query.limit ?? 10);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new errors.ValidationError('limit doit être compris entre 1 et 50.');
      let authorId: number | undefined;
      if (typeof ctx.query.author === 'string' && ctx.query.author) {
        const people = strapi.service('api::community.people') as unknown as { byUsername: (u: string) => Promise<{ id: number } | null> };
        const author = await people.byUsername(ctx.query.author.slice(0, 64));
        if (!author) throw new errors.NotFoundError('Membre introuvable.');
        authorId = author.id;
      }
      ctx.body = { data: await service().list({ authorId, limit }) };
    },
    async findBySlug(ctx) {
      ctx.body = await service().detail(assertSlug(ctx.params.slug), optionalUser(ctx.state));
    },
    async create(ctx) {
      const viewer = requireUser(ctx.state);
      ctx.body = await service().createFor(validatePostInput(ctx.request.body), viewer);
      ctx.status = 201;
    },
    /** POST /api/comments */
    async comment(ctx) {
      const viewer = requireUser(ctx.state);
      ctx.body = await service().comment(validateCommentInput(ctx.request.body), viewer);
      ctx.status = 201;
    },
  };
});
