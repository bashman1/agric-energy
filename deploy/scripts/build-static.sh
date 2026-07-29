#!/usr/bin/env bash
# ============================================================
# Build the Next.js frontend static export LOCALLY so it can be committed
# and shipped by a plain `git pull` on the server (no Node build on the box).
#
# The export is written to api/public/static/, which is tracked by git.
#
# ── How to run ──────────────────────────────────────────────
#   bash deploy/scripts/build-static.sh
#
# Then commit and push the built files:
#   git add api/public/static api/public UI
#   git commit -m "Rebuild static export"
#   git push origin main
#
# Or in one line:
#   bash deploy/scripts/build-static.sh \
#     && git add api/public/static api/public UI \
#     && git commit -m "Rebuild static export" \
#     && git push origin main
#
# ── Notes ───────────────────────────────────────────────────
#  • Requires Node 20 (loaded here via nvm; the machine default is v16,
#    which Next.js rejects).
#  • The build prerenders public pages against your LOCAL Laravel API — the
#    script starts `php artisan serve` on :8000 if it isn't already running.
#    Prerendered public pages therefore reflect your LOCAL database content.
#  • NEXT_PUBLIC_API_URL=/api/v1 is baked into the browser bundle so the
#    deployed site calls the API same-origin. Never bake a localhost URL.
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_PORT="${API_PORT:-8000}"
LOCAL_API="http://127.0.0.1:${API_PORT}/api/v1"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# ── Node 20 via nvm ──────────────────────────────────────────────────
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || die "nvm not found at $NVM_DIR"
nvm use 20 >/dev/null 2>&1 || die "Node 20 not installed — run: nvm install 20"
log "Using $(node -v)"

# ── Ensure the local API is up (needed to prerender public pages) ────
STARTED_API=0
if ! curl -fsS --max-time 5 "${LOCAL_API}/site-config" >/dev/null 2>&1; then
  log "Local API not responding — starting php artisan serve on :${API_PORT}"
  ( cd "$REPO_ROOT/api" && nohup php artisan serve --host=127.0.0.1 --port="$API_PORT" \
      >/tmp/agrienergy-serve.log 2>&1 & )
  STARTED_API=1
  for _ in $(seq 1 10); do
    curl -fsS --max-time 3 "${LOCAL_API}/site-config" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -fsS --max-time 3 "${LOCAL_API}/site-config" >/dev/null 2>&1 \
    || die "API still not reachable at ${LOCAL_API} (check /tmp/agrienergy-serve.log)"
fi

# ── Build the static export ──────────────────────────────────────────
#   API_URL             = local API, used only to prerender pages at build time
#   NEXT_PUBLIC_API_URL = relative base baked into the browser bundle
log "Building static export → api/public/static"
API_URL="$LOCAL_API" \
NEXT_PUBLIC_API_URL="/api/v1" \
NODE_OPTIONS="--max-old-space-size=2048" \
bash "$REPO_ROOT/deploy/scripts/build-ui.sh"

# ── Stop the API if we started it ────────────────────────────────────
if [ "$STARTED_API" -eq 1 ]; then
  pkill -f "artisan serve --host=127.0.0.1 --port=${API_PORT}" 2>/dev/null || true
  log "Stopped the temporary API server"
fi

log "Done. Now commit + push the static files:"
printf '    git add api/public/static api/public UI\n'
printf '    git commit -m "Rebuild static export"\n'
printf '    git push origin main\n'


#  bash deploy/scripts/build-static.sh