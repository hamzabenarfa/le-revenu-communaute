import type { Core } from '@strapi/strapi';

const USER = 'plugin::users-permissions.user';
const PALETTE = ['#5856d6', '#0a7f99', '#6e6e73', '#c93400', '#d30f45'];

export interface UserRow {
  id: number;
  documentId: string;
  username: string;
  displayName?: string | null;
  avatarColor?: string | null;
  memberRole?: 'member' | 'redaction' | 'moderator' | null;
  subscriber?: boolean | null;
  proTitle?: string | null;
  bio?: string | null;
  createdAt?: string | Date;
  streak?: number | null;
  photo?: { url: string; formats?: Record<string, { url: string }> | null } | null;
}

/** Public projection of a member: never e-mail, provider, tokens or blocked state. */
export interface Person {
  username: string;
  name: string;
  color: string;
  photo: string | null;
  role: 'member' | 'redaction' | 'moderator';
  subscriber: boolean;
  pro: string | null;
}

export const PERSON_SELECT = ['id', 'documentId', 'username', 'displayName', 'avatarColor', 'memberRole', 'subscriber', 'proTitle'];

const colorFor = (name: string) => {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

export function toPerson(row: UserRow): Person {
  const role = row.memberRole ?? 'member';
  return {
    username: row.username,
    name: row.displayName || row.username,
    color: role === 'redaction' ? '#eb0f0f' : row.avatarColor || colorFor(row.username),
    photo: row.photo?.formats?.thumbnail?.url ?? row.photo?.url ?? null,
    role,
    subscriber: Boolean(row.subscriber),
    pro: row.proTitle || null,
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Loads members by internal id, keyed by id, in one query. */
  async byIds(ids: number[]): Promise<Map<number, UserRow>> {
    const unique = [...new Set(ids.filter((id) => Number.isInteger(id)))];
    if (!unique.length) return new Map();
    const rows = (await strapi.db.query(USER).findMany({
      where: { id: { $in: unique } },
      select: [...PERSON_SELECT, 'bio', 'createdAt', 'streak'],
      populate: { photo: { select: ['url', 'formats'] } },
    })) as UserRow[];
    return new Map(rows.map((r) => [r.id, r]));
  },

  async byUsername(username: string): Promise<UserRow | null> {
    return (await strapi.db.query(USER).findOne({
      where: { username, blocked: false },
      select: [...PERSON_SELECT, 'bio', 'createdAt', 'streak'],
      populate: { photo: { select: ['url', 'formats'] } },
    })) as UserRow | null;
  },

  async isStaff(userId: number | undefined): Promise<boolean> {
    if (!userId) return false;
    const row = await strapi.db.query(USER).findOne({ where: { id: userId }, select: ['memberRole'] });
    return row?.memberRole === 'redaction' || row?.memberRole === 'moderator';
  },
});
