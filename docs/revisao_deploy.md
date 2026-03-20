# Revisão de Deploy — MyTinyURL

Este documento registra os pontos de atenção identificados na revisão do projeto, organizados por área. Cada item traz o problema, o impacto e a sugestão de correção.

---

## 1. Frontend — Dockerfile inconsistente

**Problema:** O `apps/frontend/Dockerfile` define as variáveis `PNPM_HOME` e `PATH` como se usasse pnpm, mas em todas as etapas chama `npm install`. A stage `prod-deps` é construída mas nunca usada na cadeia de build (`builder` herda de `dev-deps`).

```dockerfile
# Definido mas nunca usado
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# prod-deps é construído mas ignorado na etapa builder
FROM base AS prod-deps
RUN npm install --omit=dev
```

**Impacto:** Imagem maior do que o necessário; confusão na manutenção.

**Sugestão:** Remover as variáveis de pnpm e eliminar a stage `prod-deps` não utilizada, ou aproveitá-la corretamente. Exemplo simplificado:

```dockerfile
FROM node:22-alpine AS base
RUN npm install -g turbo

FROM base AS builder
WORKDIR /app
COPY . .
RUN turbo prune --scope=@mytinyurl/frontend --docker
RUN npm install
RUN turbo run build --filter=@mytinyurl/frontend...

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

> **Observação:** Como o deploy recomendado usa Cloudflare Pages, esse Dockerfile só é relevante para o fallback (`docker-compose.prod.yml`). De qualquer forma vale estar correto.

---

## 2. Frontend — nginx.conf sem cache e sem segurança

**Problema:** O `apps/frontend/nginx.conf` serve os arquivos estáticos sem nenhum cabeçalho de cache ou de segurança. Isso afeta o fallback com `docker-compose.prod.yml`.

**Sugestão:** Adicionar caching de assets estáticos e os cabeçalhos de segurança básicos:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Segurança
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "DENY";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";

    # Compressão
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    # Cache agressivo para assets com hash no nome (vite gera hashes)
    location ~* \.(js|css|woff2?|png|jpg|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
```

---

## 3. Frontend — Cloudflare Pages sem `_headers` e `_redirects`

**Problema:** O Cloudflare Pages ignora configurações do nginx. Para aplicar cabeçalhos de segurança e regras de roteamento na CDN, é preciso adicionar arquivos `_headers` e `_redirects` na pasta `public/` do frontend.

**Sugestão:** Criar `apps/frontend/public/_headers`:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

E `apps/frontend/public/_redirects` para garantir que o React Router funcione corretamente:

```
/* /index.html 200
```

> Sem o `_redirects`, qualquer rota acessada diretamente (ex.: `seudominio.com/sobre`) retorna 404 no Cloudflare Pages.

---

## 4. Frontend — vite.config.ts sem otimizações de bundle

**Problema:** O `vite.config.ts` está no mínimo absoluto, sem qualquer configuração de chunking ou otimização para produção.

**Sugestão:** Adicionar separação de chunks para evitar um bundle monolítico:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
        },
      },
    },
    // Avisa se algum chunk passar de 500kb
    chunkSizeWarningLimit: 500,
  },
})
```

---

## 5. VPS / Docker Swarm — Segredos via variáveis de ambiente

**Problema:** Valores sensíveis como `ADMIN_TOKEN`, `DATABASE_URLS` e futuramente qualquer credencial são passados diretamente como variáveis de ambiente no `stack.yml`. Variáveis de ambiente são visíveis em `docker inspect` e em logs de orquestradores.

**Sugestão:** Usar Docker Secrets para os valores sensíveis:

```yaml
# stack.yml
secrets:
  admin_token:
    external: true
  database_urls:
    external: true

services:
  backend:
    secrets:
      - admin_token
      - database_urls
    environment:
      ADMIN_TOKEN_FILE: /run/secrets/admin_token
      DATABASE_URLS_FILE: /run/secrets/database_urls
```

Os secrets são criados antes do deploy:

```bash
echo "meu-token-longo" | docker secret create admin_token -
echo "postgresql://..." | docker secret create database_urls -
```

> A aplicação precisa ser adaptada para ler `*_FILE` vars, o que é um padrão comum em containers.

---

## 6. VPS / Docker Swarm — Redis sem senha

**Problema:** O Redis no `stack.yml` roda sem autenticação. Qualquer container na rede `app` pode conectar sem credencial.

**Sugestão:** Adicionar senha ao Redis via Docker Secret:

```yaml
# stack.yml
redis:
  image: redis:7.4-alpine
  command: ["redis-server", "--appendonly", "yes", "--save", "60", "1000",
            "--requirepass", "$(cat /run/secrets/redis_password)"]
  secrets:
    - redis_password
```

E atualizar `REDIS_URL` no backend:

```
REDIS_URL=redis://:senha@redis:6379
```

---

## 7. VPS / Docker Swarm — Sem limites de recursos

**Problema:** Nenhum serviço no `stack.yml` define `resources.limits`. Sem isso, um pico de tráfego ou um bug no backend pode consumir toda a memória/CPU da VPS, derrubando os outros serviços (incluindo o Caddy).

**Sugestão:** Adicionar limites razoáveis para uma VPS de 2–4 GB de RAM:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M

  worker:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M

  redis:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
```

Adicionar também `maxmemory` no Redis para evitar OOM:

```yaml
command: ["redis-server", "--appendonly", "yes", "--save", "60", "1000",
          "--maxmemory", "200mb", "--maxmemory-policy", "allkeys-lru"]
```

---

## 8. VPS / Docker Swarm — Sem rotação de logs

**Problema:** Os containers não têm política de log definida. Em produção isso pode encher o disco da VPS ao longo do tempo.

**Sugestão:** Adicionar configuração de log para cada serviço relevante:

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  worker:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 9. VPS — Sem pipeline de CI/CD

**Problema:** O deploy hoje é manual: entra na VPS via SSH, faz `git pull` e executa `./scripts/deploy-swarm.sh`. O build da imagem acontece diretamente na VPS, o que consome recursos e aumenta o tempo de indisponibilidade durante o deploy.

**Sugestão em dois níveis:**

**Nível 1 (simples) — GitHub Actions com build remoto:**

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build e push para o registry
        run: |
          docker build -t ghcr.io/${{ github.repository }}/backend:${{ github.sha }} \
            -f apps/backend/Dockerfile .
          docker push ghcr.io/${{ github.repository }}/backend:${{ github.sha }}

      - name: Deploy na VPS via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/mytinyurl
            git pull
            BACKEND_IMAGE=ghcr.io/${{ github.repository }}/backend:${{ github.sha }} \
              ./scripts/deploy-swarm.sh deploy/swarm/.env.production
```

**Nível 2 (recomendado) — usar GitHub Container Registry (GHCR) como registry:**

- Build acontece no runner do GitHub (gratuito).
- VPS apenas faz `docker pull` e `docker stack deploy`.
- Rollback é trivial: aponta para a imagem anterior.

---

## 10. VPS — Sem backup do Redis

**Problema:** O Redis usa `--appendonly yes` (AOF), o que é bom para durabilidade. Mas o volume `redis_data` fica apenas na VPS. Se o disco falhar ou a VPS for reiniciada de forma abrupta, os dados de analytics em fila podem ser perdidos.

**Sugestão:** Adicionar um cron simples na VPS para copiar o dump do Redis para um local externo (S3, Backblaze B2, etc.):

```bash
# /etc/cron.daily/backup-redis
#!/bin/bash
docker run --rm \
  -v mytinyurl_redis_data:/data \
  -v /var/backups/redis:/backup \
  alpine tar czf /backup/redis-$(date +%Y%m%d).tar.gz /data

# Manter apenas os últimos 7 dias
find /var/backups/redis -name "*.tar.gz" -mtime +7 -delete
```

---

## 11. Caddy — Content Security Policy ausente

**Problema:** O `Caddyfile` define vários cabeçalhos de segurança mas não inclui o `Content-Security-Policy`. Isso abre espaço para XSS caso o backend retorne HTML com conteúdo dinâmico.

**Sugestão:** Adicionar uma CSP conservadora ao bloco `header` do Caddyfile:

```caddyfile
header {
    # ... cabeçalhos existentes ...
    Content-Security-Policy "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'"
}
```

> Ajuste conforme o backend sirva recursos adicionais (fontes externas, CDN etc.).

---

## 12. docker-compose.prod.yml — Inconsistências

**Problema:** O `docker-compose.prod.yml` (fallback fora do Swarm) tem três inconsistências em relação ao Swarm:

1. Usa `DATABASE_URL` (singular) em vez de `DATABASE_URLS` (plural com shards).
2. Inclui uma service `frontend` com nginx, mas não tem o Caddy.
3. O frontend na porta 80 não tem HTTPS.

**Sugestão:** Alinhar o arquivo com a stack do Swarm. Se for mantido como fallback rápido para uma VPS sem Swarm, pelo menos:

- Renomear para `DATABASE_URLS` para manter consistência.
- Incluir o Caddy como proxy, mesmo no modo Compose.
- Ou documentar claramente que esse arquivo é apenas para testes locais de produção e não deve ser usado em VPS real.

---

## 13. deploy-swarm.sh — Migração antes da validação do build

**Problema:** O script executa as migrations logo após o build da imagem, antes de garantir que o deploy do Swarm foi bem-sucedido. Se o `docker stack deploy` falhar, as migrations já foram aplicadas no banco.

**Sugestão:** Estruturar em duas etapas:

```bash
# 1. Build e validação
docker build -t "${BACKEND_IMAGE}" ...

# 2. Smoke test da imagem antes de migrar
docker run --rm "${BACKEND_IMAGE}" bun --version || { echo "Imagem inválida"; exit 1; }

# 3. Deploy com a nova imagem (Swarm faz rollout gradual)
docker stack deploy -c "${ROOT_DIR}/deploy/swarm/stack.yml" "${STACK_NAME}"

# 4. Aguarda serviço estabilizar antes de rodar migrations
docker service update --force "${STACK_NAME}_backend"
sleep 10

# 5. Migrations
docker run --rm -e DATABASE_URLS="${DATABASE_URLS}" "${BACKEND_IMAGE}" bun run src/db/migrate.ts
```

---

## 14. Monitoramento — Ausente

**Problema:** Não há nenhuma ferramenta de monitoramento configurada. Em produção, é preciso saber quando o backend está lento, quando o Redis está cheio ou quando o worker parou de processar eventos.

**Sugestão mínima (custo zero):** Usar o [healthcheck gratuito do UptimeRobot](https://uptimerobot.com) para monitorar o endpoint `/health` do backend (já bloqueado externamente pelo Caddy — vale criar um endpoint interno ou expô-lo em porta alternativa).

**Sugestão intermediária:** Adicionar uma stack de observabilidade leve ao Swarm:

```yaml
# Adicionar ao stack.yml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - app
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    networks:
      - app
    deploy:
      replicas: 1
```

> Acesso ao Grafana pode ser feito via túnel SSH (`ssh -L 3001:localhost:3001 user@vps`) sem expor a porta publicamente.

---

## Resumo de Prioridades

| # | Item | Impacto | Esforço |
|---|------|---------|---------|
| 3 | `_redirects` no Cloudflare Pages | Alto (404 em rotas diretas) | Baixo |
| 3 | `_headers` no Cloudflare Pages | Alto (segurança no CDN) | Baixo |
| 7 | Limites de recursos no Swarm | Alto (estabilidade da VPS) | Baixo |
| 8 | Rotação de logs | Alto (disco da VPS) | Baixo |
| 2 | nginx.conf com cache e segurança | Médio | Baixo |
| 4 | vite.config.ts com chunking | Médio (performance) | Baixo |
| 5 | Docker Secrets para credenciais | Alto (segurança) | Médio |
| 6 | Redis com senha | Alto (segurança) | Médio |
| 9 | CI/CD com GitHub Actions | Alto (produtividade) | Médio |
| 10 | Backup do Redis | Médio (resiliência) | Médio |
| 11 | CSP no Caddyfile | Médio (segurança) | Baixo |
| 12 | Alinhar docker-compose.prod.yml | Baixo (consistência) | Baixo |
| 13 | Ordem de migração no deploy | Médio (segurança do deploy) | Médio |
| 14 | Monitoramento | Alto (visibilidade) | Médio |
