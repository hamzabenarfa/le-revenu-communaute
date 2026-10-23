#!/bin/sh
# Seeds the demo data and the admin account (both idempotent) before starting Strapi.
set -e
if [ "${SEED_ON_START:-true}" = "true" ]; then
  npm run seed
  npm run admin:create
fi
exec "$@"
