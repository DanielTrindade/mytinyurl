# MyTinyURL Frontend

Aplicação React/Vite que consome a API do MyTinyURL.

## Ambiente

O frontend depende de `VITE_API_URL` terminando em `/api`.

Exemplos:

- desenvolvimento: `http://localhost:3000/api`
- produção: `https://go.seudominio.com/api`

Arquivos de exemplo:

- local: [apps/frontend/.env.example](.env.example)
- produção: [apps/frontend/.env.production.example](.env.production.example)

## Comandos

```bash
npm run dev
npm run build
npm run preview
```

## Integração com o backend

Endpoints usados hoje:

- `POST /api/shorten`
- `GET /{shortCode}`
- `GET /api/urls/:shortCode/stats` com `X-Stats-Token`

O payload de criação precisa ser:

```json
{
  "url": "https://exemplo.com"
}
```

## Deploy recomendado

O alvo principal do frontend é Cloudflare Pages com:

- root directory `apps/frontend`
- build command `npm run build`
- output directory `dist`
