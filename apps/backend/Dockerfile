FROM oven/bun:1.3.9-alpine AS base
WORKDIR /app
COPY apps/backend/package.json ./package.json
COPY bun.lock ./bun.lock

FROM base AS prod-deps
RUN bun install --production

FROM base AS dev-deps
RUN bun install

# ── runner ────────────────────────────────────────────────────────────────────
FROM oven/bun:1.3.9-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --chown=app:app apps/backend/ ./

# Entrypoint lê Docker Secrets de /run/secrets/* e exporta como env vars
# antes de iniciar a aplicação. Precisa rodar como root inicialmente,
# mas os secrets no Swarm têm permissão 0444 (leitura para todos).
COPY apps/backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER app
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["bun", "run", "src/index.ts"]

# ── development ───────────────────────────────────────────────────────────────
FROM oven/bun:1.3.9-alpine AS development
WORKDIR /app
ENV NODE_ENV=development
COPY --from=dev-deps /app/node_modules ./node_modules
COPY apps/backend/ ./
EXPOSE 3000
CMD ["bun", "run", "--watch", "src/index.ts"]
