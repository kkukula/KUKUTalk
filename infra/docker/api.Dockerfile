# api.Dockerfile — Debian (glibc) + OpenSSL + build step for NestJS (dist/main.js)
FROM node:20-bookworm-slim AS base
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# Install OpenSSL & CA certs BEFORE Prisma runs (engine detection)
RUN apt-get update -y  && apt-get install -y --no-install-recommends openssl ca-certificates curl  && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install deps (monorepo root)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the repo
COPY . .

# Generate Prisma client (now that OpenSSL is present)
RUN pnpm -C apps/api exec prisma generate

# Build API -> produces apps/api/dist/main.js
RUN pnpm -C apps/api run build

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Migrate DB on start, then start API
CMD sh -lc "pnpm -C apps/api exec prisma migrate deploy && pnpm -C apps/api run start"
