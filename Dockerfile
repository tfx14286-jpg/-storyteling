# syntax=docker/dockerfile:1
# StoryMotion AI — image produksi
# Men-deploy seluruh stack dalam satu container: aplikasi Next.js + SQLite + penyimpanan lokal + ffmpeg.

# ---------- Tahap 1: dependensi ----------
FROM node:22-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Modul native (better-sqlite3) mungkin perlu dikompilasi bila tidak ada prebuild.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Tahap 2: build ----------
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Tahap 3: runtime ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nextjs

# ffmpeg berasal dari ffmpeg-static di dalam node_modules (biner Linux x64).
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

# Data persisten (DB SQLite + file yang diunggah/dihasilkan) berada di /data,
# di-mount sebagai volume melalui docker-compose.yml.
RUN mkdir -p /data \
    && chown -R nextjs:nodejs /data \
    && chown -R nextjs:nodejs /app/node_modules/@prisma \
    && chown -R nextjs:nodejs /app/.next \
    && chmod +x /app/entrypoint.sh

USER nextjs
EXPOSE 3000
CMD ["sh", "/app/entrypoint.sh"]
