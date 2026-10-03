#!/usr/bin/env bash
# ============================================================
# Agri-Energy Desk — PRODUCTION setup, part 2 (run after provision-prod.sh)
#   https://agrienergy.nrep.ug  ·  Jenkins: http://45.136.71.160:8081
#
#   1. nginx vhost + Let's Encrypt certificate (auto-renewing)
#   2. Jenkins without the browser wizard: plugins, admin user, GitHub
#      deploy key, credential, pipeline job
#   3. first build, waited on until it passes its smoke tests
#   4. first platform admin (only while the users table is empty)
#   5. nightly database backup
#
# Every step checks whether it is already done, so re-running is safe — it
# picks up where a failed run stopped.
#
# Run as root, from the repo checkout used for provision-prod.sh:
#   bash deploy/scripts/setup-prod.sh
#
# It asks for what it needs. To run unattended, set any of these instead:
#   CERTBOT_EMAIL  JENKINS_ADMIN_USER  JENKINS_ADMIN_PASSWORD
#   APP_ADMIN_EMAIL  APP_ADMIN_PASSWORD
# The one pause that cannot be skipped: adding the deploy key on GitHub.
#
# Before running:
#   - provision-prod.sh has run, and shared/.env has no CHANGE_ME left
#   - DNS: agrienergy.nrep.ug → this VM (certbot needs it)
#   - the `production` branch exists on GitHub and contains the Jenkinsfile
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOMAIN="${DOMAIN:-agrienergy.nrep.ug}"
PUBLIC_IP="${PUBLIC_IP:-45.136.71.160}"
APP="${APP:-/var/www/agrienergy-prod}"
REPO_URL="${REPO_URL:-git@github.com:National-Renewable-Energy-Platform/NREP-Energy-Desk.git}"
JENKINS_PORT="${JENKINS_PORT:-8081}"
JENKINS_HOME=/var/lib/jenkins
JOB=agrienergy-production
J="http://127.0.0.1:${JENKINS_PORT}"
WEBROOT=/var/www/html            # ACME challenge root, as in the vhost
VHOST="/etc/nginx/sites-available/${DOMAIN}"
PLUGINS="workflow-aggregator git ssh-credentials credentials-binding timestamper ws-cleanup"

log()  { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

ask() {        # ask VAR "prompt" [default]
  local var=$1 prompt=$2 def=${3:-}
  [[ -n "${!var:-}" ]] && return
  read -rp "$prompt${def:+ [$def]}: " "$var"
  [[ -n "${!var}" ]] || printf -v "$var" '%s' "$def"
  [[ -n "${!var}" ]] || die "$var is required"
}
ask_secret() { # ask_secret VAR "prompt" — min 12 chars, typed twice
  local var=$1 prompt=$2 again
  local given="${!var:-}"
  if [[ -n "$given" ]]; then
    [[ ${#given} -ge 12 ]] || die "$var must be at least 12 characters"
    return
  fi
  while :; do
    read -rsp "$prompt (min 12 chars): " "$var"; echo
    read -rsp "  again: " again; echo
    [[ "${!var}" == "$again" ]] || { warn "did not match"; continue; }
    [[ ${#again} -ge 12 ]] || { warn "too short"; continue; }
    break
  done
}
env_value() {
  grep -E "^$1=" "$APP/shared/.env" | tail -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/'
}

# ── Preconditions ────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "run as root"
[[ -x /opt/agrienergy/bin/release-prod.sh && -f /etc/sudoers.d/agrienergy-jenkins ]] \
  || die "run provision-prod.sh first"
systemctl cat jenkins >/dev/null 2>&1 || die "Jenkins is not installed — run provision-prod.sh first"
grep -q 'runSetupWizard=false' /etc/systemd/system/jenkins.service.d/override.conf \
  || die "Jenkins override is from an older provision-prod.sh — re-run it first"
[[ -f "$APP/shared/.env" ]] || die "missing $APP/shared/.env"
grep -q 'CHANGE_ME' "$APP/shared/.env" && die "fill in every CHANGE_ME in $APP/shared/.env first"
grep -q '^APP_KEY=base64:' "$APP/shared/.env" \
  || die 'APP_KEY not set in shared/.env — generate one with: echo "base64:$(openssl rand -base64 32)"'
command -v certbot >/dev/null || die "certbot not found (expected the snap: snap install --classic certbot)"

DB_NAME="$(env_value DB_DATABASE)"
user_count() {
  sudo -u postgres psql -tAc "select count(*) from users" "$DB_NAME" 2>/dev/null | tr -d ' ' || true
}

# Collect every answer up front, so the rest runs unattended.
log "A few answers first"
[[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] \
  || ask CERTBOT_EMAIL "Email for Let's Encrypt expiry notices"
ask JENKINS_ADMIN_USER "Jenkins admin username" "admin"
ask_secret JENKINS_ADMIN_PASSWORD "Jenkins admin password"
if [[ "$(user_count)" =~ ^[1-9] ]]; then
  log "Platform users already exist — the admin seed will be skipped"
  SKIP_SEED=1
else
  SKIP_SEED=0
  ask APP_ADMIN_EMAIL "First platform admin email (site login)"
  ask_secret APP_ADMIN_PASSWORD "First platform admin password"
fi

# ════════════════════════════════════════════════════════════════════
# 1. nginx + TLS
# ════════════════════════════════════════════════════════════════════
log "1/5 nginx + TLS for ${DOMAIN}"

resolved="$( (getent ahostsv4 "$DOMAIN" || true) | awk '{print $1}' | sort -u | tr '\n' ' ')"
if [[ " $resolved " != *" $PUBLIC_IP "* ]]; then
  [[ "${SKIP_DNS_CHECK:-0}" == 1 ]] || die "${DOMAIN} resolves to '${resolved:-nothing}', not ${PUBLIC_IP}. Fix DNS (or SKIP_DNS_CHECK=1)."
fi

# The VM serves other sites: refuse if any other config already claims the name.
other="$(grep -rlE "server_name[^;]*\b${DOMAIN//./\\.}\b" /etc/nginx/ 2>/dev/null \
  | grep -vE "/(sites-available|sites-enabled)/${DOMAIN//./\\.}$" || true)"
[[ -z "$other" ]] || die "another nginx config already uses ${DOMAIN}: ${other}"

nginx -t 2>/dev/null || die "nginx -t fails BEFORE any change — fix the existing config first (not touching it)"

install_vhost() {   # install_vhost <source-file>; reverts on a failed test
  local src=$1 backup=""
  if [[ -f "$VHOST" ]]; then
    # Backups go outside /etc/nginx, so nginx never loads them and the
    # duplicate-server_name check above never trips over them on a re-run.
    mkdir -p /root/nginx-backups
    backup="/root/nginx-backups/${DOMAIN}.$(date +%Y%m%d%H%M%S)"
    cp -a "$VHOST" "$backup"
  fi
  install -m 644 "$src" "$VHOST"
  ln -sfn "$VHOST" "/etc/nginx/sites-enabled/${DOMAIN}"
  if ! nginx -t 2>/dev/null; then
    nginx -t || true
    if [[ -n "$backup" ]]; then mv "$backup" "$VHOST"; else rm -f "$VHOST" "/etc/nginx/sites-enabled/${DOMAIN}"; fi
    die "the new vhost failed nginx -t — reverted, other sites untouched"
  fi
  systemctl reload nginx
}

mkdir -p "$WEBROOT/.well-known/acme-challenge"
if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  # The full vhost references the certificate, so it cannot load until the
  # certificate exists. Serve the ACME challenge from a port-80-only vhost
  # first, issue, then install the real one.
  tmp="$(mktemp)"
  cat > "$tmp" <<EOF
# Temporary — replaced by setup-prod.sh once the certificate is issued.
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root ${WEBROOT}; }
    location / { return 503; }
}
EOF
  install_vhost "$tmp"; rm -f "$tmp"

  certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
    --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email --non-interactive \
    --deploy-hook "systemctl reload nginx" \
    || die "certbot failed — check DNS and that port 80 reaches this VM"
else
  log "Certificate already present"
fi

install_vhost "$REPO_DIR/deploy/nginx/agrienergy.nrep.ug.conf.example"
log "Checking certificate renewal"
certbot renew --dry-run --cert-name "$DOMAIN" >/dev/null 2>&1 \
  && echo "  renewal dry-run ok" \
  || warn "renewal dry-run failed — run: certbot renew --dry-run --cert-name ${DOMAIN}"

# ════════════════════════════════════════════════════════════════════
# 2. Jenkins
# ════════════════════════════════════════════════════════════════════
log "2/5 Jenkins"

wait_for_jenkins() {
  for _ in $(seq 1 90); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "$J/login" || true)
    [[ "$code" == 200 ]] && return 0
    sleep 2
  done
  die "Jenkins did not come up — journalctl -u jenkins -n 80"
}

if [[ -f "$JENKINS_HOME/jobs/${JOB}/config.xml" ]]; then
  log "Job ${JOB} already exists — Jenkins bootstrap skipped"
else
  # ── GitHub deploy key ───────────────────────────────────────────
  KEY="$JENKINS_HOME/.ssh/nrep-deploy"
  sudo -u jenkins -H bash -c "
    set -e
    mkdir -p ~/.ssh && chmod 700 ~/.ssh
    [ -f '$KEY' ] || ssh-keygen -q -t ed25519 -N '' -C 'jenkins@agrienergy-prod' -f '$KEY'
    grep -q '^github.com ' ~/.ssh/known_hosts 2>/dev/null || ssh-keyscan -t ed25519,rsa github.com >> ~/.ssh/known_hosts 2>/dev/null
  "
  repo_reachable() {
    sudo -u jenkins -H env GIT_SSH_COMMAND="ssh -i $KEY -o IdentitiesOnly=yes" \
      git ls-remote "$REPO_URL" refs/heads/production 2>/dev/null | grep -q production
  }
  if ! repo_reachable; then
    cat <<EOF

  ┌─ Add this deploy key on GitHub ──────────────────────────────────
  │ NREP-Energy-Desk → Settings → Deploy keys → Add deploy key
  │ Title: jenkins@agrienergy-prod      "Allow write access": OFF
  │
  │ $(cat "${KEY}.pub")
  └──────────────────────────────────────────────────────────────────
EOF
    until repo_reachable; do
      read -rp "  Press Enter once it is added (Ctrl-C to stop)… " _
      repo_reachable && break
      warn "still cannot read refs/heads/production — key not added yet, or the 'production' branch does not exist"
    done
  fi
  echo "  deploy key works; production branch found"

  # ── Plugins (offline install into JENKINS_HOME, before start) ─────
  PM=/opt/agrienergy/jenkins-plugin-manager.jar
  if [[ ! -f "$PM" ]]; then
    url="$(curl -fsSL https://api.github.com/repos/jenkinsci/plugin-installation-manager-tool/releases/latest \
      | grep -o 'https://[^"]*jenkins-plugin-manager-[^"]*\.jar' | head -1)"
    [[ -n "$url" ]] || die "could not find the Jenkins plugin manager download"
    curl -fsSL "$url" -o "$PM"
  fi
  log "Installing plugins: ${PLUGINS}"
  systemctl stop jenkins
  # shellcheck disable=SC2086
  sudo -u jenkins -H java -jar "$PM" --war /usr/share/java/jenkins.war \
    --plugin-download-directory "$JENKINS_HOME/plugins" --plugins $PLUGINS >/dev/null \
    || die "plugin installation failed"

  # ── Bootstrap inputs + init script ────────────────────────────────
  props="$JENKINS_HOME/agrienergy-bootstrap.properties"
  esc() { printf '%s' "$1" | sed 's/\\/\\\\/g'; }   # java.util.Properties escaping
  install -o jenkins -g jenkins -m 600 /dev/null "$props"
  cat > "$props" <<EOF
adminUser=$(esc "$JENKINS_ADMIN_USER")
adminPassword=$(esc "$JENKINS_ADMIN_PASSWORD")
jenkinsUrl=http://${PUBLIC_IP}:${JENKINS_PORT}/
repoUrl=${REPO_URL}
keyFile=${KEY}
EOF
  install -d -o jenkins -g jenkins -m 755 "$JENKINS_HOME/init.groovy.d"
  install -o jenkins -g jenkins -m 644 "$REPO_DIR/deploy/jenkins/agrienergy-bootstrap.groovy" \
    "$JENKINS_HOME/init.groovy.d/agrienergy-bootstrap.groovy"

  systemctl start jenkins
  wait_for_jenkins
  for _ in $(seq 1 60); do [[ -f "$props" ]] || break; sleep 2; done
  [[ ! -f "$props" ]] || die "Jenkins bootstrap did not finish — journalctl -u jenkins -n 120 | grep -i -A5 bootstrap"
  rm -f "${KEY}.pub"
  echo "  admin '${JENKINS_ADMIN_USER}', credential nrep-deploy-key and job ${JOB} created"
fi
systemctl is-active --quiet jenkins || { systemctl start jenkins; wait_for_jenkins; }

# ════════════════════════════════════════════════════════════════════
# 3. First build
# ════════════════════════════════════════════════════════════════════
log "3/5 First build"

NETRC="$(mktemp)"; JAR="$(mktemp)"
trap 'rm -f "$NETRC" "$JAR"' EXIT
chmod 600 "$NETRC"
printf 'machine 127.0.0.1 login %s password %s\n' "$JENKINS_ADMIN_USER" "$JENKINS_ADMIN_PASSWORD" > "$NETRC"
api() { curl -sS --netrc-file "$NETRC" -b "$JAR" -c "$JAR" "$@"; }

api -o /dev/null -w '%{http_code}' "$J/api/json" | grep -q 200 \
  || die "cannot log in to Jenkins as ${JENKINS_ADMIN_USER} — wrong password?"

field() { sed -n "s/.*\"$1\":\([^,}]*\).*/\1/p" | tr -d '"'; }

if [[ "$(api "$J/job/${JOB}/lastSuccessfulBuild/api/json?tree=number" | field number)" =~ ^[0-9]+$ ]]; then
  log "A successful build already exists — not triggering another"
else
  crumb="$(api "$J/crumbIssuer/api/json" | sed -n 's/.*"crumb":"\([^"]*\)".*/\1/p')"
  before="$(api "$J/job/${JOB}/api/json?tree=lastBuild[number]" | sed -n 's/.*"number":\([0-9]*\).*/\1/p')"
  # /build on the first run (no parameters registered yet), else buildWithParameters.
  code=$(api -o /dev/null -w '%{http_code}' -X POST -H "Jenkins-Crumb: ${crumb}" "$J/job/${JOB}/build")
  [[ "$code" =~ ^2 ]] || code=$(api -o /dev/null -w '%{http_code}' -X POST -H "Jenkins-Crumb: ${crumb}" \
    "$J/job/${JOB}/buildWithParameters?ROLLBACK_TO=")
  [[ "$code" =~ ^2 ]] || die "could not trigger the build (HTTP $code)"

  echo "  triggered — build output: http://${PUBLIC_IP}:${JENKINS_PORT}/job/${JOB}/lastBuild/console"
  n=""
  for _ in $(seq 1 60); do
    n="$(api "$J/job/${JOB}/api/json?tree=lastBuild[number]" | sed -n 's/.*"number":\([0-9]*\).*/\1/p')"
    [[ -n "$n" && "$n" != "${before:-}" ]] && break
    sleep 5
  done
  [[ -n "$n" && "$n" != "${before:-}" ]] || die "the build never started — check the Jenkins queue"

  echo "  build #$n running (static export + composer + release: ~5–10 min)"
  result=""
  for _ in $(seq 1 540); do       # up to 45 min
    json="$(api "$J/job/${JOB}/${n}/api/json?tree=building,result")"
    if [[ "$(field building <<<"$json")" == "false" ]]; then
      result="$(field result <<<"$json")"; break
    fi
    sleep 5
  done
  if [[ "$result" != "SUCCESS" ]]; then
    api "$J/job/${JOB}/${n}/consoleText" | tail -40
    die "build #$n finished as '${result:-TIMEOUT}' — full log: http://${PUBLIC_IP}:${JENKINS_PORT}/job/${JOB}/${n}/console"
  fi
  echo "  build #$n: SUCCESS — release $n is live"
fi

# ════════════════════════════════════════════════════════════════════
# 4. First platform admin
# ════════════════════════════════════════════════════════════════════
log "4/5 First platform admin"
if [[ "$SKIP_SEED" == 1 || "$(user_count)" =~ ^[1-9] ]]; then
  echo "  users already exist — skipped (the seeder would reset that account's password)"
else
  # Inline, not via .env: config is cached, so env() ignores .env and the
  # seeder would fall back to the public prototype credentials.
  # Never the full db:seed — LegacyJsonSeeder loads fictional sample data.
  ( cd "$APP/current" && sudo -u agrienergy env ADMIN_EMAIL="$APP_ADMIN_EMAIL" ADMIN_PASSWORD="$APP_ADMIN_PASSWORD" \
      php artisan db:seed --class=RolesAndAdminSeeder --force )
  [[ "$(user_count)" =~ ^[1-9] ]] || die "seeding ran but the users table is still empty"
  echo "  ${APP_ADMIN_EMAIL} can sign in at https://${DOMAIN}/admin/login"
fi

# ════════════════════════════════════════════════════════════════════
# 5. Nightly backup
# ════════════════════════════════════════════════════════════════════
log "5/5 Nightly database backup"
PGPASS="$APP/.pgpass"      # agrienergy's home directory
install -o agrienergy -g agrienergy -m 600 /dev/null "$PGPASS"
printf '%s:%s:%s:%s:%s\n' "$(env_value DB_HOST)" "$(env_value DB_PORT)" "$DB_NAME" \
  "$(env_value DB_USERNAME)" "$(env_value DB_PASSWORD)" > "$PGPASS"
cat > /etc/cron.d/agrienergy-backup <<EOF
# Agri-Energy Desk — nightly dump, one per weekday (7 kept). Managed by setup-prod.sh.
15 2 * * * agrienergy pg_dump -Fc -h $(env_value DB_HOST) -U $(env_value DB_USERNAME) ${DB_NAME} > ${APP}/backups/nightly-\$(date +\%u).dump
EOF
chmod 644 /etc/cron.d/agrienergy-backup
sudo -u agrienergy env HOME="$APP" pg_dump -Fc -h "$(env_value DB_HOST)" -U "$(env_value DB_USERNAME)" "$DB_NAME" \
  > /dev/null && echo "  test dump ok — runs daily 02:15 into ${APP}/backups/" \
  || warn "test dump failed — check ${PGPASS}"

# ── Done ─────────────────────────────────────────────────────────────
cat <<EOF

$(printf '\033[1;32m')All set.$(printf '\033[0m')
  Site      https://${DOMAIN}
  Jenkins   http://${PUBLIC_IP}:${JENKINS_PORT}   (user: ${JENKINS_ADMIN_USER})

  Deploy:   git push origin1 main:production      (picked up within 5 min, or Build Now)
  Rollback: Jenkins → ${JOB} → Build with Parameters → ROLLBACK_TO=<build #>

  If ${JENKINS_PORT} does not open in the browser, allow ${JENKINS_PORT}/tcp in the
  provider's firewall / hosting panel too.
EOF
