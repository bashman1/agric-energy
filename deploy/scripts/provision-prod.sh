#!/usr/bin/env bash
# ============================================================
# Agri-Energy Desk — one-time PRODUCTION VM setup (Ubuntu 24.04)
#   https://agrienergy.nrep.ug  ·  45.136.71.160
#
# Adds only what this VM is missing for the app + Jenkins. The VM already
# serves other sites, so this script deliberately does NOT touch:
#   nginx sites · certbot · UFW / fail2ban · MariaDB · the global php.ini
# (provision.sh is the UAT droplet's script and does all of those — do not
# run it here.)
#
# Installs:  swap · PostgreSQL 16 · PHP 8.3 extensions · Jenkins (Java 21,
#            public :8081) · nvm + Node 20 for the jenkins user
# Creates:   user `agrienergy` · /var/www/agrienergy-prod tree · php-fpm
#            pool · sudoers rules · root-owned release script
#
# Run as root, from a checkout of the repo:
#   DB_PASS='<strong-password>' bash deploy/scripts/provision-prod.sh
#
# Safe to re-run; every step is idempotent. Re-run it (or just the install
# line printed at the end) after changing release-prod.sh.
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="${APP:-/var/www/agrienergy-prod}"
DB_NAME="${DB_NAME:-agrienergy_desk}"
DB_USER="${DB_USER:-agrienergy}"
DB_PASS="${DB_PASS:-}"
SWAP_SIZE="${SWAP_SIZE:-4G}"
JENKINS_PORT="${JENKINS_PORT:-8081}"
# 0.0.0.0 = reachable at http://<public-ip>:8081. Set 127.0.0.1 to keep it
# private (then reach it through: ssh -L 8081:localhost:8081 …).
JENKINS_LISTEN="${JENKINS_LISTEN:-0.0.0.0}"
NVM_VERSION="${NVM_VERSION:-v0.40.3}"
# Jenkins rotates its apt signing key; confirm the current file name at
# https://pkg.jenkins.io/debian-stable/ if apt rejects the repository.
JENKINS_KEY_URL="${JENKINS_KEY_URL:-https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key}"

log() { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run as root"
[[ -f "$REPO_DIR/deploy/scripts/release-prod.sh" ]] || die "run from a checkout of the repo"

# ── Swap ─────────────────────────────────────────────────────────────
# 3.5 GB and no swap: `next build` (2 GB heap) next to the Jenkins JVM,
# PostgreSQL and the other sites gets OOM-killed without it.
if ! swapon --show | grep -q /swapfile; then
  log "Creating ${SWAP_SIZE} swapfile"
  [[ -f /swapfile ]] || fallocate -l "$SWAP_SIZE" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  log "Swap already active — skipping"
fi

# ── Packages ─────────────────────────────────────────────────────────
log "Installing PostgreSQL 16, PHP extensions, tools, Java 21"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  postgresql postgresql-contrib \
  php8.3-pgsql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip \
  php8.3-gd php8.3-bcmath php8.3-intl \
  git rsync unzip curl ca-certificates acl \
  openjdk-21-jre-headless fontconfig

# ── Jenkins ──────────────────────────────────────────────────────────
# The drop-in is written BEFORE the package is installed, so Jenkins never
# comes up on its default port 8080, even once. The setup wizard is
# disabled: setup-prod.sh configures Jenkins from code instead.
log "Installing Jenkins on ${JENKINS_LISTEN}:${JENKINS_PORT}"
mkdir -p /etc/systemd/system/jenkins.service.d
cat > /etc/systemd/system/jenkins.service.d/override.conf <<EOF
[Service]
Environment="JENKINS_LISTEN_ADDRESS=${JENKINS_LISTEN}"
Environment="JENKINS_PORT=${JENKINS_PORT}"
Environment="JAVA_OPTS=-Djava.awt.headless=true -Xmx768m -Djenkins.install.runSetupWizard=false"
EOF
systemctl daemon-reload

if ! command -v jenkins >/dev/null && [[ ! -f /usr/share/java/jenkins.war ]]; then
  curl -fsSL "$JENKINS_KEY_URL" -o /usr/share/keyrings/jenkins-keyring.asc
  echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
    > /etc/apt/sources.list.d/jenkins.list
  apt-get update -qq
  apt-get install -y -qq jenkins
else
  log "Jenkins already installed"
fi
systemctl enable --now jenkins
systemctl restart jenkins   # pick up the override on re-runs

# Jenkins home holds credentials; nobody but jenkins (and the release user,
# which must read the workspace) needs into it.
chmod 750 /var/lib/jenkins

# Open the port only if UFW is the active firewall; a provider-level
# firewall (hosting panel) has to allow ${JENKINS_PORT}/tcp separately.
if [[ "$JENKINS_LISTEN" != "127.0.0.1" ]] && command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then
  ufw allow "${JENKINS_PORT}/tcp" >/dev/null
fi

# ── nvm + Node 20 for the jenkins user (build-static.sh sources nvm) ──
log "Installing nvm + Node 20 for jenkins"
sudo -u jenkins -H bash -c "
  set -e
  export NVM_DIR=\$HOME/.nvm
  [ -s \$NVM_DIR/nvm.sh ] || curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | PROFILE=/dev/null bash
  . \$NVM_DIR/nvm.sh
  nvm install 20 >/dev/null
  echo \"node \$(nvm exec 20 node -v 2>/dev/null | tail -1)\"
"

# ── PostgreSQL ───────────────────────────────────────────────────────
# Ubuntu's default listens on localhost only and allows password auth on
# 127.0.0.1 — exactly what is wanted; nothing to change.
log "Configuring PostgreSQL"
systemctl enable --now postgresql
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  [[ -n "$DB_PASS" ]] || die "DB_PASS must be set on first run (DB_PASS=... bash $0)"
  sudo -u postgres psql -qc "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"
else
  log "Role ${DB_USER} already exists"
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
else
  log "Database ${DB_NAME} already exists"
fi

# ── Users and groups ─────────────────────────────────────────────────
#   agrienergy  owns the app tree, runs the php-fpm pool and the releases
#   www-data    (nginx) joins group agrienergy → read-only on the docroot
#   agrienergy  joins group jenkins → can read the workspace it releases from
#   jenkins     gets NO write access to the app tree
log "Creating user agrienergy"
id agrienergy >/dev/null 2>&1 \
  || useradd --system --home-dir "$APP" --no-create-home --shell /usr/sbin/nologin agrienergy
usermod -aG agrienergy www-data
usermod -aG jenkins agrienergy

# ── Directory tree ───────────────────────────────────────────────────
log "Preparing ${APP}"
install -d -o agrienergy -g agrienergy -m 2750 \
  "$APP" "$APP/releases" "$APP/shared" "$APP/shared/storage" \
  "$APP/shared/storage/app" "$APP/shared/storage/app/public"
# The private disk (view-only resource files) is owner-only: nginx must never
# be able to read it — those files are streamed through a signed API link.
install -d -o agrienergy -g agrienergy -m 2700 "$APP/shared/storage/app/private"
install -d -o agrienergy -g agrienergy -m 2750 \
  "$APP/shared/storage/framework" "$APP/shared/storage/framework/cache" \
  "$APP/shared/storage/framework/cache/data" "$APP/shared/storage/framework/sessions" \
  "$APP/shared/storage/framework/views" "$APP/shared/storage/logs"
install -d -o agrienergy -g agrienergy -m 0700 "$APP/backups"

if [[ ! -f "$APP/shared/.env" ]]; then
  install -o agrienergy -g agrienergy -m 600 \
    "$REPO_DIR/deploy/env/api.env.prod.example" "$APP/shared/.env"
  log "Wrote $APP/shared/.env from the example — fill in every CHANGE_ME"
fi

# ── Release script (root-owned; sudo runs THIS copy) ─────────────────
install -d -o root -g root -m 755 /opt/agrienergy /opt/agrienergy/bin
install -o root -g root -m 755 "$REPO_DIR/deploy/scripts/release-prod.sh" /opt/agrienergy/bin/release-prod.sh

# ── php-fpm pool ─────────────────────────────────────────────────────
log "Installing php-fpm pool"
install -o root -g root -m 644 "$REPO_DIR/deploy/php-fpm/agrienergy.conf" /etc/php/8.3/fpm/pool.d/agrienergy.conf
php-fpm8.3 -t || die "php-fpm config test failed — /etc/php/8.3/fpm/pool.d/agrienergy.conf"
systemctl reload php8.3-fpm

# ── sudoers ──────────────────────────────────────────────────────────
log "Installing sudoers rules"
tmp="$(mktemp)"
cp "$REPO_DIR/deploy/sudoers/agrienergy-jenkins" "$tmp"
visudo -cf "$tmp" >/dev/null || { rm -f "$tmp"; die "sudoers file failed validation"; }
install -o root -g root -m 440 "$tmp" /etc/sudoers.d/agrienergy-jenkins
rm -f "$tmp"

# nginx workers pick up the new group membership on reload. Only reload if
# the existing config is valid — never risk the other sites.
if nginx -t 2>/dev/null; then
  systemctl reload nginx
else
  printf '\n\033[1;33mWARN:\033[0m nginx -t fails (pre-existing config?) — not reloading. www-data joins group agrienergy on the next successful reload.\n'
fi

# ── Summary ──────────────────────────────────────────────────────────
log "Done. Checks:"
php -m | grep -E '^(pdo_pgsql|pgsql|mbstring|xml|curl|zip|gd|bcmath|intl)$' | tr '\n' ' '; echo
sudo -l -U jenkins | sed -n '/may run/,$p'
cat <<EOF

Next:
  1. Fill in $APP/shared/.env (APP_KEY: php artisan key:generate --show)
  2. Run the second script — nginx + TLS, Jenkins job, first build, admin, backups:
       bash deploy/scripts/setup-prod.sh

After changing release-prod.sh in the repo, reinstall it:
  install -o root -g root -m 755 deploy/scripts/release-prod.sh /opt/agrienergy/bin/
EOF
