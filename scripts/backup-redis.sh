#!/usr/bin/env bash
# backup-redis.sh
#
# Faz backup do volume Redis para um diretório local e opcionalmente
# envia para um bucket S3 (ou compatível como Backblaze B2, Cloudflare R2).
#
# Uso direto:
#   sudo ./scripts/backup-redis.sh
#
# Agendamento via cron (executa todo dia às 03:00):
#   sudo crontab -e
#   0 3 * * * /opt/mytinyurl/scripts/backup-redis.sh >> /var/log/redis-backup.log 2>&1
#
# Para envio ao S3, configure as variáveis de ambiente ou exporte antes de chamar:
#   S3_BUCKET=s3://meu-bucket/redis-backups ./scripts/backup-redis.sh
set -euo pipefail

STACK_NAME="${STACK_NAME:-mytinyurl}"
VOLUME_NAME="${STACK_NAME}_redis_data"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/redis}"
KEEP_DAYS="${KEEP_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/redis-${TIMESTAMP}.tar.gz"

# ── Verificações ──────────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker não encontrado."
  exit 1
fi

if ! docker volume inspect "${VOLUME_NAME}" >/dev/null 2>&1; then
  echo "❌ Volume '${VOLUME_NAME}' não encontrado."
  echo "   Verifique o nome com: docker volume ls"
  exit 1
fi

# ── Cria diretório de backup ──────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

# ── Solicita BGSAVE ao Redis antes de copiar os dados ─────────────────────────
# Isso garante que o AOF/dump está atualizado no disco antes do backup.
echo "💾 Solicitando BGSAVE ao Redis..."
REDIS_SERVICE="${STACK_NAME}_redis"

REDIS_TASK=$(docker service ps "${REDIS_SERVICE}" \
  --filter "desired-state=running" \
  --format "{{.ID}}" 2>/dev/null | head -1 || true)

if [[ -n "${REDIS_TASK}" ]]; then
  # Encontra o container pelo task ID
  REDIS_CONTAINER=$(docker inspect "${REDIS_TASK}" \
    --format '{{.Status.ContainerStatus.ContainerID}}' 2>/dev/null || true)

  if [[ -n "${REDIS_CONTAINER}" ]]; then
    # Lê a senha do Docker Secret se disponível
    REDIS_PASS=$(docker exec "${REDIS_CONTAINER}" \
      sh -c 'cat /run/secrets/redis_password 2>/dev/null || echo ""')

    if [[ -n "${REDIS_PASS}" ]]; then
      docker exec "${REDIS_CONTAINER}" redis-cli -a "${REDIS_PASS}" BGSAVE >/dev/null 2>&1 || true
    else
      docker exec "${REDIS_CONTAINER}" redis-cli BGSAVE >/dev/null 2>&1 || true
    fi
    # Aguarda o BGSAVE terminar (máx 30s)
    sleep 5
  fi
fi

# ── Copia o volume via container Alpine ───────────────────────────────────────
echo "📦 Criando backup: ${BACKUP_FILE}"
docker run --rm \
  -v "${VOLUME_NAME}:/data:ro" \
  -v "${BACKUP_DIR}:/backup" \
  alpine:3.21 \
  tar czf "/backup/redis-${TIMESTAMP}.tar.gz" -C /data .

echo "✅ Backup criado: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

# ── Limpeza de backups antigos ─────────────────────────────────────────────────
echo "🧹 Removendo backups com mais de ${KEEP_DAYS} dias..."
find "${BACKUP_DIR}" -name "redis-*.tar.gz" -mtime "+${KEEP_DAYS}" -delete
REMAINING=$(find "${BACKUP_DIR}" -name "redis-*.tar.gz" | wc -l)
echo "   Backups mantidos: ${REMAINING}"

# ── Envio opcional para S3 ────────────────────────────────────────────────────
if [[ -n "${S3_BUCKET:-}" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "⚠️  S3_BUCKET configurado mas 'aws' CLI não encontrado. Instale: pip install awscli"
  else
    echo "☁️  Enviando para ${S3_BUCKET}..."
    aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/$(basename "${BACKUP_FILE}")"
    echo "✅ Upload concluído."

    # Remove backups antigos do S3 também (opcional)
    if [[ -n "${S3_KEEP_DAYS:-}" ]]; then
      CUTOFF=$(date -d "${S3_KEEP_DAYS} days ago" +%Y-%m-%dT%H:%M:%S 2>/dev/null || \
               date -v "-${S3_KEEP_DAYS}d" +%Y-%m-%dT%H:%M:%S 2>/dev/null || true)
      if [[ -n "${CUTOFF}" ]]; then
        aws s3 ls "${S3_BUCKET}/" | awk '{print $4}' | while read -r key; do
          FILE_DATE=$(echo "${key}" | grep -oP '\d{8}_\d{6}' || true)
          if [[ -n "${FILE_DATE}" ]]; then
            FILE_TS=$(date -d "${FILE_DATE:0:8} ${FILE_DATE:9:2}:${FILE_DATE:11:2}:${FILE_DATE:13:2}" +%s 2>/dev/null || true)
            CUTOFF_TS=$(date -d "${CUTOFF}" +%s 2>/dev/null || true)
            if [[ -n "${FILE_TS}" && -n "${CUTOFF_TS}" && "${FILE_TS}" -lt "${CUTOFF_TS}" ]]; then
              aws s3 rm "${S3_BUCKET}/${key}"
            fi
          fi
        done
      fi
    fi
  fi
fi

echo "🎉 Backup do Redis concluído: $(date)"
