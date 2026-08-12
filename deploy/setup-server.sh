#!/usr/bin/env bash
# =============================================================================
# StoryMotion AI — deploy 1-perintah di Oracle Cloud Free Tier (atau VPS Ubuntu/Oracle Linux apa pun)
#
# Cara pakai di server (jalankan sebagai root):
#   curl -fsSL https://raw.githubusercontent.com/tfx14286-jpg/-storyteling/master/deploy/setup-server.sh | sudo bash
#
# Atau unduh lalu jalankan:
#   curl -fsSL -o setup-server.sh https://raw.githubusercontent.com/tfx14286-jpg/-storyteling/master/deploy/setup-server.sh
#   sudo bash setup-server.sh
#
# Variabel yang bisa diubah (opsional):
#   REPO_URL  - URL repo (default: repo GitHub ini)
#   BRANCH    - branch (default: master)
#   APP_DIR   - lokasi aplikasi di server (default: /opt/storyteling)
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/tfx14286-jpg/-storyteling.git}"
BRANCH="${BRANCH:-master}"
APP_DIR="${APP_DIR:-/opt/storyteling}"

log() { printf '\n==> %s\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: jalankan sebagai root — pakai: sudo bash setup-server.sh" >&2
  exit 1
fi

# ---------- deteksi package manager ----------
if command -v apt-get >/dev/null 2>&1; then
  PKG_MGR=apt
elif command -v dnf >/dev/null 2>&1; then
  PKG_MGR=dnf
elif command -v yum >/dev/null 2>&1; then
  PKG_MGR=yum
else
  echo "ERROR: OS tidak didukung (membutuhkan apt/dnf/yum)." >&2
  exit 1
fi

install_docker_apt() {
  log "Memasang Docker (apt)"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y ca-certificates curl git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  # shellcheck disable=SC1091
  . /etc/os-release
  if [ "${ID:-}" = "debian" ]; then
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  else
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  fi
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker 2>/dev/null || true
}

install_docker_rpm() {
  log "Memasang Docker (dnf/yum)"
  if [ "$PKG_MGR" = "dnf" ]; then
    dnf -y install dnf-plugins-core git 2>/dev/null || true
    dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 2>/dev/null || true
  else
    yum -y install yum-utils git 2>/dev/null || true
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 2>/dev/null || true
  fi
  # Oracle Linux membawa podman/runc bawaan yang bentrok dengan docker — buang dulu.
  if command -v podman >/dev/null 2>&1 || command -v runc >/dev/null 2>&1; then
    "$PKG_MGR" remove -y podman buildah runc 2>/dev/null || true
  fi
  "$PKG_MGR" module disable container-tools -y 2>/dev/null || true
  "$PKG_MGR" -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin --nobest 2>/dev/null \
    || "$PKG_MGR" -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin \
    || "$PKG_MGR" -y install docker docker-compose-plugin
  systemctl enable --now docker 2>/dev/null || service docker start 2>/dev/null || true
}

if ! command -v docker >/dev/null 2>&1; then
  if [ "$PKG_MGR" = "apt" ]; then install_docker_apt; else install_docker_rpm; fi
else
  log "Docker sudah terpasang."
fi

# ---------- fallback plugin docker compose ----------
if ! docker compose version >/dev/null 2>&1; then
  log "Memasang plugin docker compose (unduh biner)"
  case "$(uname -m)" in
    aarch64|arm64) ARCH=aarch64 ;;
    *)             ARCH=x86_64 ;;
  esac
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

log "Verifikasi"
docker --version
docker compose version

# ---------- clone / update kode ----------
log "Mengambil kode: ${REPO_URL} (branch: ${BRANCH})"
if [ -f "$APP_DIR/docker-compose.yml" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH" 2>/dev/null || true
  git -C "$APP_DIR" reset --hard "origin/$BRANCH" 2>/dev/null || true
else
  rm -rf "$APP_DIR"
  git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# ---------- buat .env bila belum ada ----------
if [ ! -f .env ]; then
  log "Membuat .env dengan secret baru (acak)"
  cp .env.docker.example .env
  genhex() { od -An -N32 -tx1 /dev/urandom | tr -d ' \n'; }
  sed -i "s/^AUTH_SECRET=.*/AUTH_SECRET=$(genhex)/" .env
  sed -i "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$(genhex)/" .env
else
  log ".env sudah ada — tidak diubah."
fi

# ---------- build & jalankan ----------
log "Build & mulai container (pertama kali bisa 5-10 menit)"
docker compose up -d --build

PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo "<IP-PUBLIK>")"
log "SELESAI! Buka: http://${PUBLIC_IP}:3000"
echo
echo "Catatan penting — buka port 3000 di Oracle Cloud:"
echo "  Menu >> Networking >> Virtual cloud networks >> VCN Anda"
echo "  >> Security Lists (atau Network Security Groups) >> Aturan Ingress"
echo "  Tambah aturan:  Source CIDR 0.0.0.0/0, IP Protocol TCP, Destination Port 3000."
echo
echo "Perintah yang sering dipakai:"
echo "  docker compose logs -f storyteling    # lihat log"
echo "  docker compose restart storyteling    # restart"
echo "  docker compose up -d --build          # redeploy setelah ada update kode"
