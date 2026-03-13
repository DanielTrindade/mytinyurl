# Guia de Desenvolvimento Local

O fluxo local atual separa a infraestrutura distribuída do frontend:

- `docker-compose.dev.yml` sobe backend, worker, Redis e duas shards PostgreSQL.
- O frontend roda fora do Docker com Vite, apontando para `http://localhost:3000/api`.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) instalado e ativo.
- [Node.js](https://nodejs.org/) com `npm`.
- `bun` instalado apenas se você quiser executar testes ou comandos do backend fora dos containers.

## Subindo backend, worker e bancos

```bash
docker compose -f docker-compose.dev.yml up --build
```

Serviços iniciados por esse comando:

- Backend em `http://localhost:3000`
- Worker de analytics
- PostgreSQL shard 1 em `localhost:5432`
- PostgreSQL shard 2 em `localhost:5434`
- Redis em `localhost:6379`

## Subindo o frontend

Crie o arquivo de ambiente local do frontend:

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

Depois rode:

```bash
npm run dev --workspace @mytinyurl/frontend
```

Com isso, o frontend ficará em <http://localhost:5173>.

## Endpoints úteis

- API principal: <http://localhost:3000/api/shorten>
- Redirect: <http://localhost:3000/{shortCode}>
- Docs da API: <http://localhost:3000/docs>

## Observações

- O backend local aceita múltiplas shards via `DATABASE_URLS`.
- O frontend precisa de `VITE_API_URL` terminando em `/api`.
- O arquivo `docker-compose.prod.yml` é apenas um fallback de execução fora do Swarm. O deploy recomendado está em [docs/deploy_vps_cloudflare_supabase.md](deploy_vps_cloudflare_supabase.md).
