#!/usr/bin/env bash
# ============================================================
# Build the Next.js frontend as a static export and install it into
# Laravel's public directory.
#
#   UI/out/            ->  api/public/static/     (pages + _next assets)
#   UI/public/*        ->  api/public/            (favicon, logos, robots)
#
# UI/public files land at the web root, not under /static, because the app
# references them with absolute paths (/logo.png). The build asset prefix
# is /static, so hashed JS/CSS resolve to api/public/static/_next/*.
#
# Run from anywhere; paths are resolved relative to the repo root.
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UI_DIR="$REPO_ROOT/UI"
STATIC_DIR="$REPO_ROOT/api/public/static"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ -d "$UI_DIR" ] || die "UI directory not found at $UI_DIR"

# The export prerenders public pages against a live Laravel instance, so
# API_URL must point at a reachable API *at build time*. A silent failure
# here bakes empty pages into the export, so demand it explicitly.
: "${API_URL:?API_URL must be set to a reachable Laravel API, e.g. http://127.0.0.1:8080/api/v1}"

log "Verifying the API is reachable at $API_URL"
curl -fsS --max-time 10 "$API_URL/site-config" >/dev/null \
  || die "Cannot reach $API_URL — start Laravel before building, or the export bakes empty pages."

log "Installing UI dependencies"
cd "$UI_DIR"
npm ci

log "Building static export"
rm -rf out .next
npx next build

[ -d "$UI_DIR/out" ] || die "next build produced no out/ directory"
[ -f "$UI_DIR/out/index.html" ] || die "export is missing index.html — build did not complete"

log "Installing export into api/public/static"
rm -rf "$STATIC_DIR"
mkdir -p "$STATIC_DIR"
cp -r "$UI_DIR/out/." "$STATIC_DIR/"

log "Copying UI/public assets to the web root"
if [ -d "$UI_DIR/public" ] && [ -n "$(ls -A "$UI_DIR/public" 2>/dev/null)" ]; then
  cp -r "$UI_DIR/public/." "$REPO_ROOT/api/public/"
fi

log "Done — $(find "$STATIC_DIR" -name '*.html' | wc -l) pages installed"
