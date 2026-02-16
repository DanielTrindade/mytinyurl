FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=@mytinyurl/backend --docker

FROM base AS dev-deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm install

FROM base AS prod-deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm install --omit=dev

FROM base AS builder
WORKDIR /app
COPY --from=dev-deps /app/ .
COPY --from=pruner /app/out/full/ .
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma
RUN turbo run build --filter=@mytinyurl/backend...

FROM base AS runner
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json


WORKDIR /app/apps/backend
EXPOSE 3001
CMD ["node", "dist/infrastructure/http/server.js"]

FROM base AS dev
WORKDIR /app
COPY --from=dev-deps /app/ .
# The source code will be mounted at /app/apps/backend
CMD ["turbo", "run", "dev", "--filter=@mytinyurl/backend"]