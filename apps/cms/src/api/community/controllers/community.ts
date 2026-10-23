import type { Context } from 'koa';
import { errors } from '@strapi/utils';
import { optionalUser, requireUser } from '../../../utils/auth';
import { sniffImageFile } from '../../../utils/image';
import { validateProfileInput, validateReport, validateSearch } from '../../../utils/validation';

type Ctx = Context & { state: { user?: unknown }; params: Record<string, string>; query: Record<string, unknown>; request: Context['request'] & { body?: unknown; files?: Record<string, unknown> } };
type Service = Record<string, (...args: unknown[]) => Promise<unknown>>;

const service = () => strapi.service('api::community.community') as unknown as Service;
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,40}$/;
const username = (ctx: Ctx) => {
  const u = ctx.params.username;
  if (!USERNAME_RE.test(u)) throw new errors.NotFoundError('Membre introuvable.');
  return u;
};
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export default {
  async stats(ctx: Ctx) {
    ctx.body = await service().stats();
  },
  async spaces(ctx: Ctx) {
    ctx.body = await service().spaces();
  },
  async me(ctx: Ctx) {
    ctx.body = await service().me(requireUser(ctx.state));
  },
  async updateMe(ctx: Ctx) {
    const viewer = requireUser(ctx.state);
    ctx.body = await service().updateMe(viewer, validateProfileInput(ctx.request.body));
  },
  /** POST /api/profiles/me/photo (multipart field "photo"), DELETE to remove. */
  async setPhoto(ctx: Ctx) {
    const viewer = requireUser(ctx.state);
    const file = ctx.request.files?.photo as
      | { size?: number; filepath?: string; mimetype?: string; originalFilename?: string; type?: string; name?: string }
      | undefined;
    const invalid = () =>
      new errors.ValidationError('Choisissez une image JPG, PNG ou WebP.', {
        errors: [{ path: ['photo'], message: 'Choisissez une image JPG, PNG ou WebP.', name: 'ValidationError' }],
      });
    if (!file || Array.isArray(file) || !file.filepath) throw invalid();
    if ((file.size ?? 0) > PHOTO_MAX_BYTES) throw new errors.PayloadTooLargeError('La photo ne doit pas dépasser 2 Mo.');
    // The declared type and name come from the client: identify the bytes, then force a safe name/extension.
    const image = await sniffImageFile(file.filepath);
    if (!image) throw invalid();
    const safeName = `avatar-${viewer.documentId}.${image.ext}`;
    Object.assign(file, { mimetype: image.mime, type: image.mime, originalFilename: safeName, name: safeName });
    ctx.body = await service().setPhoto(viewer, file);
  },
  async deletePhoto(ctx: Ctx) {
    ctx.body = await service().setPhoto(requireUser(ctx.state), null);
  },
  async profile(ctx: Ctx) {
    ctx.body = await service().profile(username(ctx), optionalUser(ctx.state));
  },
  async card(ctx: Ctx) {
    ctx.body = await service().card(username(ctx));
  },
  async leaderboard(ctx: Ctx) {
    const period = ctx.query.period === 'all' ? 'all' : 'month';
    ctx.body = await service().leaderboard(period, optionalUser(ctx.state));
  },
  /** GET /api/members/mentions?q=&context=user1,user2 */
  async mentions(ctx: Ctx) {
    const viewer = requireUser(ctx.state);
    const context = typeof ctx.query.context === 'string' ? ctx.query.context.split(',').filter((u) => USERNAME_RE.test(u)).slice(0, 50) : [];
    ctx.body = await service().mentionable(validateSearch(ctx.query).slice(0, 24), context, viewer);
  },
  async notifications(ctx: Ctx) {
    ctx.body = await service().notifications(requireUser(ctx.state));
  },
  async readAll(ctx: Ctx) {
    ctx.body = await service().markRead(requireUser(ctx.state), null);
  },
  async readOne(ctx: Ctx) {
    ctx.body = await service().markRead(requireUser(ctx.state), String(ctx.params.id).slice(0, 64));
  },
  async report(ctx: Ctx) {
    const viewer = requireUser(ctx.state);
    ctx.body = await service().report(viewer, validateReport(ctx.request.body));
    ctx.status = 201;
  },
};
