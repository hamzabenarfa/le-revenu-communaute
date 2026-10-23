'use strict';

/**
 * Creates the local Strapi admin from ADMIN_EMAIL / ADMIN_PASSWORD (apps/cms/.env).
 * Idempotent: does nothing if that admin already exists. Usage: npm run admin:create
 */
const { loadStrapi } = require('./load-strapi');

async function main() {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in apps/cms/.env.');

  const app = await loadStrapi();
  try {
    const users = app.service('admin::user');
    if (await users.exists({ email })) {
      app.log.info(`[admin] ${email} already exists`);
      return;
    }
    const superAdmin = await app.service('admin::role').getSuperAdmin();
    await users.create({ email, password, firstname: 'Admin', lastname: 'Demo', isActive: true, registrationToken: null, roles: [superAdmin.id] });
    app.log.info(`[admin] created super admin ${email}`);
  } finally {
    await app.destroy();
  }
}

// Exit explicitly: a late pool acquisition after destroy() can otherwise keep the process alive and crash it.
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
