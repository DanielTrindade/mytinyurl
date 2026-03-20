#!/bin/sh
# docker-entrypoint.sh
#
# Lê Docker Secrets de /run/secrets/* e exporta como variáveis de ambiente.
# Isso permite usar Docker Secrets no Swarm sem alterar o código da aplicação.
#
# Mapeamento: nome do arquivo (lowercase) → variável de ambiente (UPPERCASE)
# Exemplos:
#   /run/secrets/admin_token    → ADMIN_TOKEN
#   /run/secrets/database_urls  → DATABASE_URLS
#   /run/secrets/redis_password → REDIS_PASSWORD
#
# O Redis URL com senha é construído automaticamente se REDIS_PASSWORD estiver presente.

set -e

SECRETS_DIR="/run/secrets"

if [ -d "${SECRETS_DIR}" ]; then
  for secret_file in "${SECRETS_DIR}"/*; do
    [ -f "${secret_file}" ] || continue
    secret_name="$(basename "${secret_file}")"
    env_name="$(echo "${secret_name}" | tr '[:lower:]' '[:upper:]')"
    secret_value="$(cat "${secret_file}")"
    export "${env_name}=${secret_value}"
  done
fi

# Se REDIS_PASSWORD foi carregado via secret, reconstrói a REDIS_URL com autenticação.
# Só sobrescreve se a URL atual não contiver senha (não contiver "@").
if [ -n "${REDIS_PASSWORD:-}" ] && echo "${REDIS_URL:-}" | grep -qv "@"; then
  # Extrai host:porta do REDIS_URL existente, ex: redis://redis:6379 → redis:6379
  redis_host_port="${REDIS_URL#redis://}"
  export REDIS_URL="redis://:${REDIS_PASSWORD}@${redis_host_port}"
fi

exec "$@"
