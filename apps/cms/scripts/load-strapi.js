'use strict';

const path = require('path');
const { compileStrapi, createStrapi } = require('@strapi/strapi');

/**
 * Loads Strapi without starting the HTTP server.
 * In the production image `strapi build` already compiled dist/, so it is reused the way
 * `strapi start` does: compiling again needs more memory than a 512 MB free instance has.
 * Elsewhere the project is compiled first, so the scripts always run the latest code.
 */
async function loadStrapi() {
  const appDir = path.join(__dirname, '..');
  const context =
    process.env.NODE_ENV === 'production' ? { appDir, distDir: path.join(appDir, 'dist') } : await compileStrapi();
  return createStrapi(context).load();
}

module.exports = { loadStrapi };
