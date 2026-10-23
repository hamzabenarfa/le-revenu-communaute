import type { Core } from '@strapi/strapi';

/**
 * Boots a real Strapi instance (routes, policies, permissions, PostgreSQL) without
 * binding a port: supertest drives `strapi.server.httpServer` directly.
 * Runs against a dedicated database so demo data is never touched.
 */
export async function setupStrapi(): Promise<Core.Strapi> {
  process.env.DATABASE_NAME = process.env.TEST_DATABASE_NAME ?? 'lerevenu_test';
  process.env.STRAPI_TELEMETRY_DISABLED = 'true';
  // Tests write in bursts; the throttle itself is covered by tests/unit/rate-limit.test.ts.
  process.env.COMMUNITY_WRITE_LIMIT = process.env.COMMUNITY_WRITE_LIMIT ?? '100000';
  // Keep integration output readable; errors still surface through assertions.
  process.env.STRAPI_LOG_LEVEL = process.env.STRAPI_LOG_LEVEL ?? 'error';

  const { compileStrapi, createStrapi } = await import('@strapi/strapi');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.server.mount();
  return app;
}

export async function teardownStrapi(app: Core.Strapi): Promise<void> {
  await app.destroy();
}

/** Removes everything the community tests create, leaving roles/permissions intact. */
export async function resetCommunityData(app: Core.Strapi): Promise<void> {
  const uids = [
    'api::useful.useful',
    'api::poll-vote.poll-vote',
    'api::follow.follow',
    'api::notification.notification',
    'api::report.report',
    'api::comment.comment',
    'api::post.post',
    'api::event.event',
    'api::reply.reply',
    'api::discussion.discussion',
    'api::category.category',
  ] as const;
  for (const uid of uids) {
    await app.db.query(uid).deleteMany({ where: {} });
  }
  await app.db.query('plugin::users-permissions.user').deleteMany({ where: {} });
}

export async function createMember(app: Core.Strapi, username: string) {
  const role = await app.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const user = await app
    .plugin('users-permissions')
    .service('user')
    .add({ username, email: `${username.toLowerCase()}@test.local`, password: 'Test-Password-1', provider: 'local', confirmed: true, blocked: false, role: role.id });
  const jwt: string = await app.plugin('users-permissions').service('jwt').issue({ id: user.id });
  return { id: user.id as number, documentId: user.documentId as string, username, jwt };
}
