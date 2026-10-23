import { errors } from '@strapi/utils';

export interface AuthenticatedUser {
  id: number;
  documentId: string;
  staff: boolean;
}

type State = { user?: unknown };

const toViewer = (raw: unknown): AuthenticatedUser | null => {
  const user = raw as { id?: number; documentId?: unknown; memberRole?: unknown; blocked?: unknown } | undefined;
  if (!user || typeof user.documentId !== 'string' || typeof user.id !== 'number' || user.blocked) return null;
  return { id: user.id, documentId: user.documentId, staff: user.memberRole === 'redaction' || user.memberRole === 'moderator' };
};

/**
 * Returns the user resolved by the users-permissions JWT strategy.
 * Route permissions already reject anonymous calls; this is defence in depth
 * and the single place where ownership comes from.
 */
export function requireUser(state: State): AuthenticatedUser {
  const viewer = toViewer(state.user);
  if (!viewer) throw new errors.UnauthorizedError('Vous devez être connecté pour publier.');
  return viewer;
}

/** Optional identity for public reads (personalised state such as "Utile" already given). */
export const optionalUser = (state: State): AuthenticatedUser | null => toViewer(state.user);

export function requireStaff(state: State): AuthenticatedUser {
  const viewer = requireUser(state);
  if (!viewer.staff) throw new errors.ForbiddenError('Action réservée à la rédaction et à la modération.');
  return viewer;
}
