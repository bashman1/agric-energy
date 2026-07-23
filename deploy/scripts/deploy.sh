#!/usr/bin/env bash
# ============================================================
# Agri-Energy Desk — deploy / redeploy
#
#   git pull → composer install → migrate → static export →
#   install into api/public/static → reload web tier → smoke test
#
# There is no Node process in production. The frontend is a Next.js
# static export served by Laravel/nginx out of api/public/static.
#
# Run on the droplet as root:
#   bash /var/www/agrienergy/repo/deploy/scripts/deploy.sh
#
# Flags:
#   --skip-pull    deploy the working tree as-is (no git fetch)
#   --skip-api     frontend only
#   --skip-ui      Laravel only
# ============================================================
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/agrienergy}"
REPO="${APP_ROOT}/repo"
UI_SRC="${REPO}/UI"
API_SRC="${REPO}/api"
STATIC_DIR="${API_SRC}/public/static"
UI_ENV="${REPO}/deploy/env/ui.env.production"
DOMAIN="${DOMAIN:-menu.smartcollect.co.ug}"
BRANCH="${BRANCH:-main}"

# The export prerenders public pages against Laravel at BUILD time. This
# is the loopback nginx listener, so the build never leaves the droplet.
BUILD_API_URL="${BUILD_API_URL:-http://127.0.0.1:8080/api/v1}"

SKIP_PULL=0; SKIP_API=0; SKIP_UI=0
for arg in "$@"; do
  case "$arg" in
    --skip-pull) SKIP_PULL=1 ;;
    --skip-api)  SKIP_API=1 ;;
    --skip-ui)   SKIP_UI=1 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

log()  { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m warn:\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run as root"
[[ -d "$REPO/.git" ]] || die "no git checkout at $REPO"

# ── Pull ─────────────────────────────────────────────────────────────
if [[ $SKIP_PULL -eq 0 ]]; then
  log "Fetching ${BRANCH}"
  git -C "$REPO" fetch --prune origin
  git -C "$REPO" checkout "$BRANCH"
  git -C "$REPO" reset --hard "origin/${BRANCH}"
fi
log "Deploying $(git -C "$REPO" rev-parse --short HEAD) — $(git -C "$REPO" log -1 --format=%s)"

# ── Laravel ──────────────────────────────────────────────────────────
if [[ $SKIP_API -eq 0 ]]; then
  log "Laravel: dependencies"
  [[ -f "${API_SRC}/.env" ]] || die "missing ${API_SRC}/.env (copy deploy/env/api.env.uat.example)"

  # Fail loudly rather than deploying a half-configured API.
  grep -q 'CHANGE_ME' "${API_SRC}/.env" && die "${API_SRC}/.env still contains CHANGE_ME placeholders"
  grep -q '^APP_KEY=base64:' "${API_SRC}/.env" || die "APP_KEY not set — run: php artisan key:generate"
  grep -q '^APP_DEBUG=false' "${API_SRC}/.env" || warn "APP_DEBUG is not false"

  cd "$API_SRC"
  composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

  log "Laravel: migrations"
  php artisan migrate --force

  log "Laravel: storage link + caches"
  php artisan storage:link 2>/dev/null || true
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
  php artisan event:cache

  chown -R www-data:www-data "${API_SRC}/storage" "${API_SRC}/bootstrap/cache"
  chmod -R ug+rwX "${API_SRC}/storage" "${API_SRC}/bootstrap/cache"

  # The API must be serving this release before the UI build, which
  # prerenders every public page against it.
  log "Laravel: reloading php-fpm so the build sees this release"
  systemctl reload php8.3-fpm || systemctl restart php8.3-fpm
fi

# ── Frontend (static export) ─────────────────────────────────────────
if [[ $SKIP_UI -eq 0 ]]; then
  [[ -f "$UI_ENV" ]] || die "missing ${UI_ENV} (copy deploy/env/ui.env.uat.example)"
  grep -q 'CHANGE_ME' "$UI_ENV" && die "${UI_ENV} still contains CHANGE_ME placeholders"

  # NEXT_PUBLIC_* are inlined at build time, so the env file has to be
  # present as .env.production during the build — not just at runtime.
  install -m 600 "$UI_ENV" "${UI_SRC}/.env.production"

  # Keep the current export so a failed build can be rolled back to it.
  rm -rf "${STATIC_DIR}.old"
  [[ -d "$STATIC_DIR" ]] && cp -a "$STATIC_DIR" "${STATIC_DIR}.old"

  log "Frontend: building static export (~3-6 min on a 2GB droplet)"
  if ! NODE_ENV=production \
       NODE_OPTIONS="--max-old-space-size=1536" \
       API_URL="$BUILD_API_URL" \
       bash "${REPO}/deploy/scripts/build-ui.sh"; then
    warn "Build failed — restoring the previous export"
    rm -rf "$STATIC_DIR"
    [[ -d "${STATIC_DIR}.old" ]] && mv "${STATIC_DIR}.old" "$STATIC_DIR"
    die "frontend build failed; the previous export is still being served"
  fi

  chown -R www-data:www-data "$STATIC_DIR"
fi

# ── Reload web tier ──────────────────────────────────────────────────
log "Reloading php-fpm + nginx"
systemctl reload php8.3-fpm || systemctl restart php8.3-fpm
nginx -t && systemctl reload nginx

# ── Smoke test ───────────────────────────────────────────────────────
log "Smoke tests"
sleep 2
fail=0
check() {
  local name=$1 url=$2 expect=${3:-200}
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$url" || echo 000)
  if [[ "$code" == "$expect" ]]; then
    printf '  \033[1;32mok\033[0m   %-28s %s\n' "$name" "$code"
  else
    printf '  \033[1;31mFAIL\033[0m %-28s %s (expected %s)\n' "$name" "$code" "$expect"
    fail=1
  fi
}
check "Laravel health"    "https://${DOMAIN}/up"
check "Laravel API"       "https://${DOMAIN}/api/v1/projects"
check "Home page"         "https://${DOMAIN}/"
check "Admin login"       "https://${DOMAIN}/admin/login"
check "Unknown route 404" "https://${DOMAIN}/definitely-not-a-page" 404

# A listing page must contain real content, not just chrome. An export
# built against a dead API still "succeeds" but ships empty pages — that
# is the failure mode worth catching automatically, because it looks
# exactly like a successful deploy.
log "Verifying the export has content"
bytes=$(curl -sS --max-time 20 "https://${DOMAIN}/projects" | tr -d '\n' | wc -c)
if [[ "$bytes" -lt 8000 ]]; then
  printf '  \033[1;31mFAIL\033[0m %-28s %s bytes (expected >8000)\n' "/projects body" "$bytes"
  warn "The export looks empty — was the API reachable at ${BUILD_API_URL} during the build?"
  fail=1
else
  printf '  \033[1;32mok\033[0m   %-28s %s bytes\n' "/projects body" "$bytes"
fi

if [[ $fail -eq 0 ]]; then
  log "Deploy complete — https://${DOMAIN}"
  rm -rf "${STATIC_DIR}.old"
else
  warn "Deploy finished with failing checks."
  warn "Logs:  tail -n 100 /var/log/nginx/agrienergy.error.log"
  warn "       tail -n 100 ${API_SRC}/storage/logs/laravel.log"
  warn "Rollback UI:  rm -rf ${STATIC_DIR} && mv ${STATIC_DIR}.old ${STATIC_DIR}"
  exit 1
fi
