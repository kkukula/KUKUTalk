# apps/backend/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Dostosuj je?li masz komend? build
# RUN npm run build
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=5 CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["npm","run","start"]
