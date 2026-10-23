import type { Core } from '@strapi/strapi';

/**
 * `unique: true` in a Strapi v5 schema is checked by the application only, which two
 * concurrent requests can both pass. These indexes make the database the final guard.
 * Created after Strapi's schema sync, so they also work on a fresh database.
 */
const UNIQUE_INDEXES = [
  { table: 'discussions', column: 'slug', name: 'discussions_slug_unique' },
  { table: 'categories', column: 'slug', name: 'categories_slug_unique' },
  { table: 'posts', column: 'slug', name: 'posts_slug_unique' },
  // "user:target" keys: one Utile, one poll vote and one follow per member and target.
  { table: 'usefuls', column: 'key', name: 'usefuls_key_unique' },
  { table: 'poll_votes', column: 'key', name: 'poll_votes_key_unique' },
  { table: 'follows', column: 'key', name: 'follows_key_unique' },
];

export async function ensureUniqueIndexes(strapi: Core.Strapi): Promise<void> {
  const knex = strapi.db.connection;
  for (const { table, column, name } of UNIQUE_INDEXES) {
    await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS ?? ON ?? (??)', [name, table, column]);
  }
}
