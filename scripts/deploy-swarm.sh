#!/usr/bin/env bash
# deploy-swarm.sh
#
# Uso: ./scripts/deploy-swarm.sh [caminho-do-.env]
#
# Em produção (CI/CD), a imagem já vem pré-construída e empurrada pelo GitHub Actions.
# Nesse caso, defina BACKEND_IMAGE antes de chamar este script:
#   BACKEND_IMAGE=ghcr.io/org/repo/backend:sha ./scripts/deploy-swarm.sh
#
# Para build local (fallback manual):
#   ./scripts/deploy-swarm.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-${ROOT_DIR}/deploy/swarm/.env.production}"
STACK_NAME="${STACK_NAME:-mytinyurl}"

cd "${ROOT_DIR}"

# ── Validações iniciais ────────────────────────────────────────────────────────
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "❌ Arquivo de ambiente nao encontrado: ${ENV_FILE}"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker nao encontrado no host."
  exit 1
fi

if [[ "$(docker info --format '{{ .Swarm.LocalNodeState }}')" != "active" ]]; then
  echo "❌ Docker Swarm nao esta ativo. Execute scripts/bootstrap-vps.sh primeiro."
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

# Variáveis obrigatórias no .env (valores não-sensíveis)
# As credenciais sensíveis (ADMIN_TOKEN, DATABASE_URLS, redis_password) devem
# estar nos Docker Secrets da VPS, NÃO no .env.
required_vars=(
  APP_DOMAIN
  APP_URL
  LETSENCRYPT_EMAIL
  CORS_ORIGINS
  BACKEND_REPLICAS
  WORKER_REPLICAS
  DEFAULT_EXPIRATION_HOURS
  MACHINE_ID
  ENABLE_DOCS
  BLOCK_PRIVATE_TARGETS
  MAX_URL_LENGTH
  MAX_REQUEST_BODY_BYTES
  RATE_LIMIT_WINDOW_SECONDS
  RATE_LIMIT_MAX_SHORTEN
  RATE_LIMIT_MAX_STATS
  RATE_LIMIT_MAX_REDIRECT
  RATE_LIMIT_MAX_HEALTH
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "❌ Variavel obrigatoria ausente: ${var_name}"
    exit 1
  fi
done

# Verifica se os Docker Secrets já existem na VPS
required_secrets=(admin_token database_urls redis_password)
for secret_name in "${required_secrets[@]}"; do
  if ! docker secret ls --format '{{.Name}}' | grep -q "^${secret_name}$"; then
    echo "❌ Docker Secret ausente: ${secret_name}"
    echo "   Crie-o antes do deploy: echo 'valor' | docker secret create ${secret_name} -"
    exit 1
  fi
done

# ── Imagem do backend ──────────────────────────────────────────────────────────
IMAGE_TAG="${IMAGE_TAG:-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

if [[ -n "${BACKEND_IMAGE:-}" ]]; then
  # Imagem pré-construída pelo CI/CD — apenas faz pull para garantir que está local
  echo "📦 Usando imagem pré-construída: ${BACKEND_IMAGE}"
  docker pull "${BACKEND_IMAGE}"
else
  # Fallback: build local (útil para primeiros deploys ou hotfixes sem CI)
  export BACKEND_IMAGE="mytinyurl-backend:${IMAGE_TAG}"
  echo "🔨 Buildando imagem local: ${BACKEND_IMAGE}"
  docker build \
    --target runner \
    -t "${BACKEND_IMAGE}" \
    -f "${ROOT_DIR}/apps/backend/Dockerfile" \
    "${ROOT_DIR}"
fi

export BACKEND_IMAGE

# ── Deploy da stack (sem migrations ainda) ────────────────────────────────────
# O Swarm faz rollout gradual com start-first: sobe o novo container antes de
# derrubar o antigo. Só depois de estável é que rodamos as migrations.
echo "🚀 Aplicando stack ${STACK_NAME}..."
docker stack deploy \
  --with-registry-auth \
  -c "${ROOT_DIR}/deploy/swarm/stack.yml" \
  "${STACK_NAME}"

# ── Aguarda o backend estabilizar ─────────────────────────────────────────────
echo "⏳ Aguardando backend estabilizar (máx 120s)..."
MAX_WAIT=120
WAITED=0
BACKEND_SERVICE="${STACK_NAME}_backend"

while true; do
  RUNNING=$(docker service ps "${BACKEND_SERVICE}" \
    --filter "desired-state=running" \
    --format "{{.CurrentState}}" 2>/dev/null \
    | grep -c "Running" || true)

  REPLICAS="${BACKEND_REPLICAS:-1}"

  if [[ "${RUNNING}" -ge "${REPLICAS}" ]]; then
    echo "✅ Backend com ${RUNNING}/${REPLICAS} réplicas em Running."
    break
  fi

  if [[ "${WAITED}" -ge "${MAX_WAIT}" ]]; then
    echo "❌ Backend não estabilizou após ${MAX_WAIT}s. Verifique:"
    echo "   docker service ps ${BACKEND_SERVICE}"
    exit 1
  fi

  sleep 5
  WAITED=$((WAITED + 5))
done

# ── Migrations (após deploy estável) ─────────────────────────────────────────
# Lê DATABASE_URLS do Docker Secret para não expor credenciais no ambiente do script.
echo "🗄️  Executando migrations nas shards..."
DATABASE_URLS_VALUE="$(docker secret inspect database_urls --format '{{.Spec.Data}}' 2>/dev/null | base64 -d 2>/dev/null || true)"

if [[ -z "${DATABASE_URLS_VALUE}" ]]; then
  # Fallback: tenta ler do .env se o secret não for legível pelo script
  DATABASE_URLS_VALUE="${DATABASE_URLS:-}"
fi

if [[ -z "${DATABASE_URLS_VALUE}" ]]; then
  echo "⚠️  Não foi possível ler DATABASE_URLS para migrations. Execute manualmente:"
  echo "   docker run --rm -e DATABASE_URLS='...' ${BACKEND_IMAGE} bun run src/db/migrate.ts"
else
  docker run --rm \
    -e DATABASE_URLS="${DATABASE_URLS_VALUE}" \
    -e NODE_ENV=production \
    "${BACKEND_IMAGE}" \
    bun run src/db/migrate.ts
  echo "✅ Migrations concluídas."
fi

# ── Resumo ────────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "  Deploy concluído: ${STACK_NAME}"
echo "  Imagem: ${BACKEND_IMAGE}"
echo "════════════════════════════════════════"
docker stack services "${STACK_NAME}"
echo ""
echo "Logs do backend:  docker service logs -f ${STACK_NAME}_backend"
echo "Logs do worker:   docker service logs -f ${STACK_NAME}_worker"
echo "Status da stack:  docker stack ps ${STACK_NAME}"
