#!/usr/bin/env bash
# ============================================================
# Agri-Energy Desk — one-time droplet provisioning (Ubuntu 24.04)
#
# Installs nginx, PHP 8.3-FPM, PostgreSQL 16, Node 22 (build-time only),
# composer and
# certbot; creates the database and the /var/www/agrienergy layout.
# Safe to re-run — every step is idempotent.
#
# Run as root:  bash deploy/scripts/provision.sh
# ============================================================
set -euo pipefail

DOMAIN="${DOMAIN:-menu.smartcollect.co.ug}"
APP_ROOT="${APP_ROOT:-/var/www/agrienergy}"
REPO_URL="${REPO_URL:-}"          # e.g. git@github.com:org/agric_energy_desk.git
DB_NAME="${DB_NAME:-agrienergy_desk}"
DB_USER="${DB_USER:-agrienergy}"
DB_PASS="${DB_PASS:-}"            # required on first run

log() { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run as root"

# ── Swap ─────────────────────────────────────────────────────────────
# `next build` on a 1–2 GB droplet OOMs without it. 2 GB of swap is the
# difference between a build that finishes and one that gets killed.
if [[ ! -f /swapfile ]]; then
  log "Creating 2G swapfile"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  log "Swapfile already present — skipping"
fi

# ── Packages ─────────────────────────────────────────────────────────
log "Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  nginx git unzip curl ca-certificates rsync \
  php8.3-fpm php8.3-cli php8.3-pgsql php8.3-mbstring php8.3-xml \
  php8.3-curl php8.3-zip php8.3-gd php8.3-bcmath php8.3-intl \
  postgresql postgresql-contrib \
  certbot python3-certbot-nginx

# Node 22 LTS via NodeSource
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  log "Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
else
  log "Node $(node -v) already installed"
fi

# Composer
if ! command -v composer >/dev/null; then
  log "Installing Composer"
  curl -fsSL https://getcomposer.org/installer -o /tmp/composer-setup.php
  php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
  rm -f /tmp/composer-setup.php
else
  log "Composer already installed"
fi

# ── PHP-FPM tuning ───────────────────────────────────────────────────
log "Tuning PHP"
PHP_INI=/etc/php/8.3/fpm/conf.d/99-agrienergy.ini
cat > "$PHP_INI" <<'INI'
; Agri-Energy Desk — media uploads and XLSX/PDF exports
upload_max_filesize = 32M
post_max_size = 32M
memory_limit = 512M
max_execution_time = 120
expose_php = Off
INI

# ── PostgreSQL ───────────────────────────────────────────────────────
log "Configuring PostgreSQL"
systemctl enable --now postgresql

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  [[ -n "$DB_PASS" ]] || die "DB_PASS must be set on first run (DB_PASS=... bash provision.sh)"
  log "Creating role ${DB_USER}"
  sudo -u postgres psql -qc "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"
else
  log "Role ${DB_USER} already exists"
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  log "Creating database ${DB_NAME}"
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
else
  log "Database ${DB_NAME} already exists"
fi

# ── Directory layout ─────────────────────────────────────────────────
#   $APP_ROOT/repo   git checkout (UI/ + api/); Laravel runs from here
#   $APP_ROOT/ui     assembled Next.js standalone bundle
log "Preparing ${APP_ROOT}"
mkdir -p "${APP_ROOT}/ui"

if [[ -n "$REPO_URL" && ! -d "${APP_ROOT}/repo/.git" ]]; then
  log "Cloning ${REPO_URL}"
  git clone "$REPO_URL" "${APP_ROOT}/repo"
elif [[ -d "${APP_ROOT}/repo/.git" ]]; then
  log "Repo already cloned — skipping"
else
  log "REPO_URL not set — clone or rsync the project into ${APP_ROOT}/repo yourself"
fi

chown -R www-data:www-data "${APP_ROOT}"

# ── nginx ────────────────────────────────────────────────────────────
# No systemd unit: the frontend is a static export served by nginx off
# disk, so there is no long-running Node process to supervise. Node is
# still installed above because the export is BUILT on this droplet.
CONF_SRC="${APP_ROOT}/repo/deploy/nginx/${DOMAIN}.conf"

if [[ -f "$CONF_SRC" ]]; then
  log "Installing nginx vhost"
  # TLS certs do not exist yet, so install a temporary HTTP-only vhost
  # first; certbot will rewrite it and we then swap in the real config.
  if [[ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
    mkdir -p /var/www/html
    cat > "/etc/nginx/sites-available/${DOMAIN}" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    root /var/www/html;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 200 'provisioning'; add_header Content-Type text/plain; }
}
EOF
    ln -sf "../sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx

    log "Requesting Let's Encrypt certificate for ${DOMAIN}"
    certbot certonly --webroot -w /var/www/html -d "${DOMAIN}" \
      --non-interactive --agree-tos --register-unsafely-without-email \
      || die "certbot failed — check that ${DOMAIN} resolves to this droplet"
  fi

  cp "$CONF_SRC" "/etc/nginx/sites-available/${DOMAIN}"
  ln -sf "../sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
else
  log "Vhost config not found at ${CONF_SRC} — install it after the repo is in place"
fi

# ── Firewall ─────────────────────────────────────────────────────────
if command -v ufw >/dev/null; then
  log "Configuring firewall (22, 80, 443 only)"
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  ufw --force enable
fi

systemctl restart php8.3-fpm
systemctl reload nginx || systemctl restart nginx

cat <<EOF

$(log "Provisioning complete")

Next steps:
  1. cp ${APP_ROOT}/repo/deploy/env/api.env.uat.example ${APP_ROOT}/repo/api/.env
     cp ${APP_ROOT}/repo/deploy/env/ui.env.uat.example  ${APP_ROOT}/repo/deploy/env/ui.env.production
     # edit both — every CHANGE_ME must be replaced
     chmod 600 ${APP_ROOT}/repo/api/.env ${APP_ROOT}/repo/deploy/env/ui.env.production

  2. bash ${APP_ROOT}/repo/deploy/scripts/deploy.sh

EOF
