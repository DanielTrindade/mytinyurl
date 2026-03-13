# Guia de Deploy: VPS + Supabase + Cloudflare Pages

Este guia documenta o deploy do MyTinyURL no desenho que faz mais sentido para o projeto hoje:

- backend, worker, Redis e Caddy em uma VPS Linux
- duas shards PostgreSQL no Supabase
- frontend estático no Cloudflare Pages
- orquestração com Docker Swarm de nó único

## Desenho final

Use esta topologia:

- `seudominio.com`: frontend no Cloudflare Pages
- `www.seudominio.com`: frontend no Cloudflare Pages
- `go.seudominio.com`: backend público na VPS, servindo `/api/*` e `/{shortCode}`
- Supabase shard 1: um projeto Supabase dedicado
- Supabase shard 2: outro projeto Supabase dedicado

Fluxo:

1. O usuário acessa o frontend no Cloudflare Pages.
2. O frontend chama `https://go.seudominio.com/api`.
3. O Caddy recebe a requisição na VPS e faz proxy para o backend.
4. O backend grava e lê URLs nas duas shards do Supabase via `DATABASE_URLS`.
5. O Redis local segura cache e fila de analytics.
6. O worker consome os eventos e atualiza os contadores.

## Por que esse desenho

Esse modelo entrega um bom equilíbrio entre custo, segurança e simplicidade:

- Cloudflare Pages resolve bem o frontend estático e o CDN global.
- Supabase evita operar PostgreSQL manualmente na VPS.
- Redis local reduz custo e latência para cache e fila.
- Docker Swarm em nó único deixa deploy, rollback e evolução futura mais previsíveis do que um `docker compose up` puro.
- Caddy simplifica HTTPS automático e endurece a borda da VPS.

## Checklist antes de começar

Você precisa ter:

- uma VPS Ubuntu ou Debian com acesso `sudo`
- um domínio já configurado na Cloudflare
- duas instâncias PostgreSQL no Supabase, uma por shard
- o repositório clonado na VPS
- portas `22`, `80` e `443` disponíveis

## Passo 1: preparar as shards no Supabase

Crie dois projetos ou duas bases gerenciadas separadas, uma para cada shard.

Sugestão de nomes:

- `mytinyurl-shard-1`
- `mytinyurl-shard-2`

Para cada shard:

1. Entre em `Project Settings > Database`.
2. Copie a connection string Postgres.
3. Prefira a conexão direta se a VPS tiver IPv6.
4. Se a VPS for IPv4-only, use o Supavisor em modo session na porta `5432`.

Monte a variável final assim:

```env
DATABASE_URLS=postgresql://postgres:senha@db.shard-1.supabase.co:5432/postgres,postgresql://postgres:senha@db.shard-2.supabase.co:5432/postgres
```

Observação operacional:

- Evite usar o pooler transaction na aplicação principal, porque backend e worker mantêm conexões persistentes.

## Passo 2: definir os domínios

Recomendação:

- `seudominio.com` e `www.seudominio.com` para o frontend
- `go.seudominio.com` para a API e os links encurtados

Isso deixa os links gerados mais limpos do que usar `api.seudominio.com`.

## Passo 3: configurar DNS na Cloudflare

Crie estes registros:

- `A` ou `AAAA` para `go` apontando para a VPS
- domínio apex apontando para o projeto do Cloudflare Pages
- `CNAME` de `www` para o domínio do projeto do Cloudflare Pages

Se quiser usar proxy laranja também no `go`, tudo bem. O TLS continuará terminando no Caddy.

## Passo 4: preparar a VPS

Na VPS:

```bash
git clone <repo> /opt/mytinyurl
cd /opt/mytinyurl
sudo ./scripts/bootstrap-vps.sh
```

O script [scripts/bootstrap-vps.sh](../scripts/bootstrap-vps.sh) faz:

- instala Docker Engine
- instala plugin Compose
- inicializa o Swarm
- ativa UFW liberando apenas `22`, `80` e `443`
- prepara o diretório base do projeto

Se quiser fixar o IP de anúncio do Swarm:

```bash
sudo SWARM_ADVERTISE_ADDR=SEU_IP_PUBLICO ./scripts/bootstrap-vps.sh
```

## Passo 5: configurar o ambiente de produção

Copie o arquivo base:

```bash
cp deploy/swarm/.env.example deploy/swarm/.env.production
```

Edite `deploy/swarm/.env.production` e ajuste pelo menos:

```env
APP_DOMAIN=go.seudominio.com
APP_URL=https://go.seudominio.com
LETSENCRYPT_EMAIL=ops@seudominio.com
CORS_ORIGINS=https://seudominio.com,https://www.seudominio.com,https://meuprojeto.pages.dev
DATABASE_URLS=postgresql://postgres:senha@db.shard-1.supabase.co:5432/postgres,postgresql://postgres:senha@db.shard-2.supabase.co:5432/postgres
BACKEND_REPLICAS=1
WORKER_REPLICAS=1
DEFAULT_EXPIRATION_HOURS=24
MACHINE_ID=1
ENABLE_DOCS=false
ADMIN_TOKEN=troque-por-um-token-longo-e-aleatorio
BLOCK_PRIVATE_TARGETS=true
MAX_URL_LENGTH=2048
MAX_REQUEST_BODY_BYTES=4096
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_SHORTEN=20
RATE_LIMIT_MAX_STATS=30
RATE_LIMIT_MAX_REDIRECT=300
RATE_LIMIT_MAX_HEALTH=60
```

Notas:

- `APP_DOMAIN` e `APP_URL` devem usar o mesmo subdomínio público.
- `CORS_ORIGINS` precisa incluir o domínio definitivo do frontend e o `*.pages.dev` enquanto você ainda estiver testando.
- `ADMIN_TOKEN` deve ser longo e aleatório.

## Passo 6: publicar backend, worker, Redis e Caddy

No diretório do projeto:

```bash
./scripts/deploy-swarm.sh deploy/swarm/.env.production
```

O script [scripts/deploy-swarm.sh](../scripts/deploy-swarm.sh) faz:

- build da imagem do backend
- execução das migrations nas duas shards
- deploy da stack Swarm
- exibição dos serviços ativos

Os arquivos principais desse deploy são:

- stack: [deploy/swarm/stack.yml](../deploy/swarm/stack.yml)
- edge: [deploy/swarm/Caddyfile](../deploy/swarm/Caddyfile)
- exemplo de ambiente: [deploy/swarm/.env.example](../deploy/swarm/.env.example)

## Passo 7: configurar o frontend no Cloudflare Pages

No Cloudflare Pages, crie um projeto apontando para este repositório com:

- Root directory: `apps/frontend`
- Build command: `npm run build`
- Build output directory: `dist`

Variáveis de ambiente:

```env
VITE_API_URL=https://go.seudominio.com/api
```

Também existe um exemplo em [apps/frontend/.env.production.example](../apps/frontend/.env.production.example).

Depois vincule os domínios:

- `seudominio.com`
- `www.seudominio.com`

## Passo 8: smoke test

Depois do deploy, valide:

1. Abra `https://seudominio.com`.
2. Encurte uma URL.
3. Verifique se a URL gerada usa `https://go.seudominio.com/<codigo>`.
4. Abra a URL curta e confirme o redirect.
5. Confira os serviços:

```bash
docker stack services mytinyurl
docker service logs -f mytinyurl_backend
docker service logs -f mytinyurl_caddy
```

## O que a borda Caddy já protege

O [deploy/swarm/Caddyfile](../deploy/swarm/Caddyfile) já sobe com:

- HTTPS automático
- compressão `zstd` e `gzip`
- bloqueio público de `/docs`
- bloqueio público de `/health`
- bloqueio público de `/api/health`
- bloqueio público de `/api/admin/health`
- headers básicos de segurança

## Operação do dia a dia

Comandos úteis:

```bash
docker stack services mytinyurl
docker service ps mytinyurl_backend
docker service logs -f mytinyurl_backend
docker service logs -f mytinyurl_worker
docker service logs -f mytinyurl_caddy
docker service update --rollback mytinyurl_backend
```

## Rollback

Se uma atualização der problema:

```bash
docker service update --rollback mytinyurl_backend
docker service update --rollback mytinyurl_worker
```

## Problemas comuns

### O certificado HTTPS não sobe

Verifique:

- se o DNS de `go.seudominio.com` já aponta para a VPS
- se `80` e `443` estão liberadas
- se `APP_DOMAIN` está correto no `.env.production`

### O backend não conecta no Supabase

Verifique:

- se a `DATABASE_URLS` está sem espaços extras
- se a senha está correta
- se a VPS tem IPv6, quando você estiver usando conexão direta
- se você não usou o pooler transaction por engano

### O frontend abre, mas não encurta URL

Verifique:

- se `VITE_API_URL` no Cloudflare Pages termina em `/api`
- se `CORS_ORIGINS` inclui o domínio do Pages e o domínio final
- se `go.seudominio.com` responde externamente

## Resumo curto do fluxo de deploy

```bash
sudo ./scripts/bootstrap-vps.sh
cp deploy/swarm/.env.example deploy/swarm/.env.production
# editar deploy/swarm/.env.production
./scripts/deploy-swarm.sh deploy/swarm/.env.production
```

Depois disso:

- configure o Cloudflare Pages
- aponte `VITE_API_URL` para `https://go.seudominio.com/api`
- faça o smoke test

## Referências oficiais

- Docker Swarm stack deploy: <https://docs.docker.com/engine/swarm/stack-deploy/>
- Caddy reverse proxy: <https://caddyserver.com/docs/caddyfile/directives/reverse_proxy>
- Caddy options: <https://caddyserver.com/docs/caddyfile/options>
- Cloudflare Pages Git integration: <https://developers.cloudflare.com/pages/get-started/git-integration/>
- Supabase connection strings: <https://supabase.com/docs/guides/database/connecting-to-postgres>
