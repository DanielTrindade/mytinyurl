# Guia de Desenvolvimento Local

Este guia explica como rodar o projeto localmente utilizando Docker, com suporte a hot-reload e banco de dados isolado.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) instalado e rodando.
- [Node.js](https://nodejs.org/) (opcional, para rodar scripts fora do Docker).

## Rodando o Ambiente de Desenvolvimento

Para iniciar toda a stack (Backend + Frontend + Banco de Dados) em modo de desenvolvimento:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

O comando acima irá:

1. Iniciar o Postgres na porta `5432`.
2. Iniciar o Backend na porta `3000` (com hot-reload via `tsx watch`).
3. Iniciar o Frontend na porta `5173` (com hot-reload via Vite).

### Acessando os Serviços

- **Frontend**: <http://localhost:5173>
- **Backend API**: <http://localhost:3000>
- **Documentação da API**: <http://localhost:3000/docs>
- **Banco de Dados**: `postgresql://user:password@localhost:5432/mytinyurl`

### Hot-Reload

Graças aos volumes configurados no `docker-compose.dev.yml`, qualquer alteração nos arquivos dentro de `apps/backend/src` ou `apps/frontend/src` será refletida automaticamente sem precisar reiniciar os containers.

## Rodando em Modo Produção (Simulação)

Para testar como a aplicação irá se comportar em produção (build otimizado):

```bash
docker-compose up --build
```

Isso irá rodar as imagens de produção (`target: runner`), onde o frontend é servido pelo Nginx e o backend roda o código compilado em JS.

### Configuração de Banco de Dados (Produção)

Por padrão, o `docker-compose.yml` de produção também sobe um banco Postgres.
Se você quiser usar um banco externo (ex: Supabase, Neon), altere a variável `DATABASE_URL` no arquivo `.env` para a URL do seu banco gerenciado.

Exemplo `.env` para Supabase:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.supabase.co:5432/postgres?pgbouncer=true"
```
