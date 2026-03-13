# MyTinyURL Backend

Backend distribuído em Bun + Elysia + Drizzle.

## Responsabilidades

- Criar URLs curtas
- Redirecionar `/{shortCode}`
- Publicar eventos de visita no Redis
- Expor analytics protegidos por `statsToken`
- Aplicar headers de segurança, validação e rate limiting

## Comandos

```bash
bun run dev
bun run test
bun run db:migrate
bun run worker
```

## Variáveis principais

- `DATABASE_URLS`: lista separada por vírgula com as shards PostgreSQL
- `APP_URL`: domínio público do redirector, por exemplo `https://go.seudominio.com`
- `CORS_ORIGINS`: origens do frontend
- `REDIS_URL`: Redis local ou gerenciado
- `ADMIN_TOKEN`: token para `/api/admin/health`

## Deploy recomendado

O deploy operacional principal está documentado em [docs/deploy_vps_cloudflare_supabase.md](../../docs/deploy_vps_cloudflare_supabase.md).
