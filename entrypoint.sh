#!/bin/sh
set -eu

if [ ! -f "packages/core/dist/db/migrate.js" ]; then
  echo "[vigil] ERROR: build artifacts missing (packages/core/dist/db/migrate.js). Run 'pnpm build' first."
  exit 1
fi

if [ ! -f "packages/github/dist/server.js" ]; then
  echo "[vigil] ERROR: build artifacts missing (packages/github/dist/server.js). Run 'pnpm build' first."
  exit 1
fi

echo "[vigil] Running database migrations..."
if ! node packages/core/dist/db/migrate.js; then
  echo "[vigil] ERROR: migrations failed. Check DATABASE_URL and database connectivity."
  exit 1
fi

echo "[vigil] Starting server..."
exec node packages/github/dist/server.js
