import { errors } from '@strapi/utils';

const WINDOW_MS = 60_000;
/** Writes per member and minute; COMMUNITY_WRITE_LIMIT overrides it (the test suite raises it). */
const DEFAULT_MAX = 30;
const limit = () => Number(process.env.COMMUNITY_WRITE_LIMIT) || DEFAULT_MAX;
const hits = new Map<string, number[]>();

/**
 * Per-member write throttle for the community routes (429 beyond the limit).
 * In-memory, so per Strapi instance: enough for this deployment; a shared store
 * (Redis) would be needed behind several instances.
 */
export default (policyContext: { state: { user?: { id?: number } }; request: { ip?: string } }, config: { max?: number } = {}) => {
  const who = policyContext.state.user?.id ?? policyContext.request.ip ?? 'anonymous';
  const key = String(who);
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= (config.max ?? limit())) {
    throw new errors.RateLimitError('Trop d’actions en peu de temps. Réessayez dans une minute.');
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, list] of hits) if (!list.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  return true;
};
