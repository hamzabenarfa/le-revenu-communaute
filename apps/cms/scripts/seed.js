'use strict';

/**
 * Loads Strapi without starting the HTTP server and runs the idempotent demo seed.
 * Usage: npm run seed            (idempotent)
 *        npm run seed -- --reset (wipe demo content and rebuild it)
 */
const { loadStrapi } = require('./load-strapi');

async function main() {
  const password = process.env.SEED_USER_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Set SEED_USER_PASSWORD (min. 8 characters) in apps/cms/.env before seeding.');
  }

  const app = await loadStrapi();
  try {
    const { seedDemo } = require('../dist/src/seed');
    await seedDemo(app, password, { reset: process.argv.includes('--reset') });
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
