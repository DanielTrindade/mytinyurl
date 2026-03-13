#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-${ROOT_DIR}/deploy/swarm/.env.production}"
STACK_NAME="${STACK_NAME:-mytinyurl}"

cd "${ROOT_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Arquivo de ambiente nao encontrado: ${ENV_FILE}"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker nao encontrado no host."
  exit 1
fi

if [[ "$(docker info --format '{{ .Swarm.LocalNodeState }}')" != "active" ]]; then
  echo "Docker Swarm nao esta ativo. Execute scripts/bootstrap-vps.sh primeiro."
  exit 1
fi

set -a
. "${ENV_FILE}"
set +a

required_vars=(
  APP_DOMAIN
  APP_URL
  LETSENCRYPT_EMAIL
  CORS_ORIGINS
  DATABASE_URLS
  BACKEND_REPLICAS
  WORKER_REPLICAS
  DEFAULT_EXPIRATION_HOURS
  MACHINE_ID
  ENABLE_DOCS
  ADMIN_TOKEN
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
    echo "Variavel obrigatoria ausente: ${var_name}"
    exit 1
  fi
done

IMAGE_TAG="${IMAGE_TAG:-$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
export BACKEND_IMAGE="${BACKEND_IMAGE:-mytinyurl-backend:${IMAGE_TAG}}"

echo "Buildando imagem ${BACKEND_IMAGE}"
docker build -t "${BACKEND_IMAGE}" -f "${ROOT_DIR}/apps/backend/Dockerfile" "${ROOT_DIR}"

echo "Executando migracoes nas shards"
docker run --rm \
  -e DATABASE_URLS="${DATABASE_URLS}" \
  -e NODE_ENV=production \
  "${BACKEND_IMAGE}" \
  bun run src/db/migrate.ts

echo "Aplicando stack ${STACK_NAME}"
docker stack deploy -c "${ROOT_DIR}/deploy/swarm/stack.yml" "${STACK_NAME}"

echo "Servicos da stack"
docker stack services "${STACK_NAME}"

echo "Deploy concluido."
echo "Use 'docker service logs -f ${STACK_NAME}_backend' para acompanhar o backend."
