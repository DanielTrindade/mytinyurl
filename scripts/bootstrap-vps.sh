#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute este script com sudo."
  exit 1
fi

if [[ ! -f /etc/os-release ]]; then
  echo "Nao foi possivel identificar o sistema operacional."
  exit 1
fi

. /etc/os-release

if [[ "${ID}" != "ubuntu" && "${ID}" != "debian" ]]; then
  echo "Este bootstrap foi preparado para Ubuntu ou Debian."
  exit 1
fi

APP_USER="${SUDO_USER:-${USER}}"
REPO_DIR="${REPO_DIR:-/opt/mytinyurl}"
SWARM_ADVERTISE_ADDR="${SWARM_ADVERTISE_ADDR:-}"

install_packages() {
  apt-get update
  apt-get install -y ca-certificates curl git gnupg lsb-release ufw
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    return
  fi

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/${ID}/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

configure_user() {
  usermod -aG docker "${APP_USER}" || true
}

configure_firewall() {
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

ensure_swarm() {
  if [[ "$(docker info --format '{{ .Swarm.LocalNodeState }}')" == "active" ]]; then
    return
  fi

  if [[ -n "${SWARM_ADVERTISE_ADDR}" ]]; then
    docker swarm init --advertise-addr "${SWARM_ADVERTISE_ADDR}"
  else
    docker swarm init
  fi
}

prepare_directories() {
  install -d -m 0755 "${REPO_DIR}"
  chown "${APP_USER}:${APP_USER}" "${REPO_DIR}"
}

install_packages
install_docker
configure_user
configure_firewall
ensure_swarm
prepare_directories

echo "Bootstrap concluido."
echo "Repositorio esperado em: ${REPO_DIR}"
echo "Abra uma nova sessao para o grupo docker ser aplicado ao usuario ${APP_USER}."
