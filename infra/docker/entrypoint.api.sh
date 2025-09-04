#!/usr/bin/env sh
set -e

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/kukutalk?schema=public}"
export REDIS_URL="${REDIS_URL:-redis://redis:6379/0}"

if [ -x "./node_modules/.bin/prisma" ]; then
  echo "→ Running Prisma migrate deploy..."
  ./node_modules/.bin/prisma migrate deploy --schema=infra/prisma/schema.prisma || true
  echo "→ Running Prisma seed (safe to fail if data exists)..."
  ./node_modules/.bin/prisma db seed --schema=infra/prisma/schema.prisma || true
else
  echo "⚠️ Prisma CLI not found. Skipping migrations/seed."
fi

echo "→ Starting API..."
exec node dist/main.js
