FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=@mytinyurl/frontend --docker

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
RUN turbo run build --filter=@mytinyurl/frontend...

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM base AS dev
WORKDIR /app
COPY --from=dev-deps /app/ .
# The source code will be mounted at /app/apps/frontend
CMD ["turbo", "run", "dev", "--filter=@mytinyurl/frontend", "--", "--host", "0.0.0.0"]