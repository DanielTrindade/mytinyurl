# MyTinyURL

MyTinyURL é um monorepo de encurtamento de URLs com backend distribuído em Bun/Elysia, duas shards PostgreSQL, cache e fila em Redis, e frontend estático em React/Vite.

## Arquitetura atual

- `apps/backend`: API pública, redirector, rate limiting, validação de URLs e worker de analytics.
- `apps/frontend`: interface React que consome a API via `VITE_API_URL`.
- `docker-compose.dev.yml`: stack local com duas shards PostgreSQL, Redis, backend e worker.
- `deploy/swarm`: artefatos para o deploy recomendado em VPS com Docker Swarm e Caddy.

## Desenvolvimento local

Use o guia completo em [docs/local_development.md](docs/local_development.md).

Fluxo rápido:

```bash
docker compose -f docker-compose.dev.yml up --build
cp apps/frontend/.env.example apps/frontend/.env.local
npm run dev --workspace @mytinyurl/frontend
```

Serviços esperados:

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:3000>
- Docs da API: <http://localhost:3000/docs>

## Deploy recomendado

O alvo mais equilibrado para custo, simplicidade e segurança neste projeto ficou assim:

- Frontend em Cloudflare Pages.
- Backend, worker, Redis e Caddy em uma VPS Linux.
- Banco em duas shards Supabase, uma URL por shard.
- Orquestração com Docker Swarm de nó único para permitir rollout, rollback e evolução futura.

Documentação principal:

- Plano de deploy e revisão completa: [docs/deploy_vps_cloudflare_supabase.md](docs/deploy_vps_cloudflare_supabase.md)
- Arquivos da stack Swarm: [deploy/swarm/stack.yml](deploy/swarm/stack.yml)
- Bootstrap da VPS: [scripts/bootstrap-vps.sh](scripts/bootstrap-vps.sh)
- Deploy da stack: [scripts/deploy-swarm.sh](scripts/deploy-swarm.sh)

## Observações importantes

- O backend hoje espera `POST /api/shorten` com `{ "url": "https://..." }`.
- O frontend em produção deve receber `VITE_API_URL=https://go.seudominio.com/api`.
- `docker-compose.prod.yml` ficou como fallback simples fora do Swarm. O fluxo principal recomendado está em `deploy/swarm`.
