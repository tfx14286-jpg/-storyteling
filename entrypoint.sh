#!/bin/sh
set -e

# Apply the schema to the SQLite database on first boot (idempotent).
# Needs to run before the app starts so tables exist for the Prisma client.
echo "==> Applying database schema (prisma db push)..."
node /app/node_modules/prisma/build/index.js db push

echo "==> Starting Next.js on 0.0.0.0:${PORT:-3000}..."
exec node /app/node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
