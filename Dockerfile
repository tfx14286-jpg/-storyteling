# syntax=docker/dockerfile:1
# StoryMotion AI — production image
# Deploys the full stack in a single container: Next.js app + SQLite + local storage + ffmpeg.

# ---------- Stage 1: dependencies ----------
FROM node:22-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Native modules (better-sqlite3) may need compilation when no prebuild exists.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: build ----------
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nextjs

# ffmpeg comes from ffmpeg-static inside node_modules (Linux x64 binary).
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY entrypoint.sh ./entrypoint.sh

# Persistent data (SQLite DB + uploaded/generated files) lives in /data,
# mounted as a volume via docker-compose.yml.
RUN mkdir -p /data \
    && chown -R nextjs:nodejs /data \
    && chmod +x /app/entrypoint.sh

USER nextjs
EXPOSE 3000
CMD ["sh", "/app/entrypoint.sh"]
