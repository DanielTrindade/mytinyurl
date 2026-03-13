FROM oven/bun:1.3.9-alpine AS deps
WORKDIR /app
COPY apps/backend/package.json ./package.json
COPY bun.lock ./bun.lock
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.9-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=app:app apps/backend/ ./
USER app
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
