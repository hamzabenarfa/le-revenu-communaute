#!/bin/sh
# Builds once against the running CMS; a restarted container reuses that build.
set -e
if [ ! -f .next/BUILD_ID ]; then
  bun run build
fi
exec "$@"
