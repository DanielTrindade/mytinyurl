# ── base ──────────────────────────────────────────────────────────────────────
# Remove as variáveis de pnpm (projeto usa npm) e instala o turbo globalmente.
FROM node:22-alpine AS base
RUN npm install -g turbo

# ── pruner ────────────────────────────────────────────────────────────────────
# Usa turbo prune para isolar apenas os arquivos relevantes ao frontend.
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=@mytinyurl/frontend --docker

# ── deps ──────────────────────────────────────────────────────────────────────
# Instala todas as dependências (devDeps necessárias para o build do Vite).
FROM base AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm install

# ── builder ───────────────────────────────────────────────────────────────────
# Compila o frontend. O Vite gera os assets com hash no nome de arquivo.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .
RUN turbo run build --filter=@mytinyurl/frontend...

# ── runner ────────────────────────────────────────────────────────────────────
# Imagem final: apenas nginx + dist estático. Usada no fallback docker-compose.prod.yml.
# Em produção real, o build do Cloudflare Pages é feito no CI — este stage não é usado.
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ── dev ───────────────────────────────────────────────────────────────────────
FROM base AS dev
WORKDIR /app
COPY --from=deps /app/ .
CMD ["turbo", "run", "dev", "--filter=@mytinyurl/frontend", "--", "--host", "0.0.0.0"]
