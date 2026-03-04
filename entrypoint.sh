#!/bin/sh
set -e

echo "[vigil] Running database migrations..."
node packages/core/dist/db/migrate.js

echo "[vigil] Starting server..."
exec node packages/github/dist/server.js
