#!/usr/bin/env bash
# ============================================================
# Build the Next.js frontend as a static export into api/public/static.
#
# The export is CONTENT-INDEPENDENT: it contains no records at all, only the
# application shell. Every page fetches from /api/v1 in the browser at
# runtime, so the same build serves UAT, staging and production and each one
# shows its own live data. Approve something in the admin panel and it is on
# the public site on the next page load — no rebuild, no redeploy.
#
# That is why this script needs no database and no running API. Earlier
# versions started `php artisan serve` so `next build` could enumerate every
# published slug; the result was a build that carried the builder's local
# content and 404'd on anything approved afterwards. Each dynamic route now
# exports a single shell instead (UI/lib/routing/shell.ts), and Laravel hands
# that shell to any record URL (StaticSiteController).
#
# ── How to run ──────────────────────────────────────────────
#   bash deploy/scripts/build-static.sh
#
# Then commit and push the built files:
#   git add api/public/static UI
#   git commit -m "Rebuild static export"
#   git push origin main
#
# ── Notes ───────────────────────────────────────────────────
#  • Requires Node 20 (loaded here via nvm; the machine default is v16,
#    which Next.js rejects).
#  • NEXT_PUBLIC_API_URL=/api/v1 is baked into the browser bundle so the
#    deployed site calls the API same-origin. Never bake an absolute URL —
#    that is what would tie the artefact to one environment.
#  • Rebuild when the UI SOURCE changes. Content changes never need one.
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# ── One build at a time ──────────────────────────────────────────────
# Two builds in parallel destroy each other rather than failing cleanly:
# `npm ci` deletes node_modules and re-extracts it, so a second run deletes
# files the first is still unpacking. The symptom is hundreds of
# `npm warn tar TAR_ENTRY_ERROR ENOENT` lines across every package and a
# half-installed tree — nothing about it points at the real cause. The copy
# into api/public/static below races the same way. Refuse instead.
#
# The lock is inherited by build-ui.sh via the environment, so it does not
# try to take the same lock again and deadlock against its own parent.
exec 9>"$REPO_ROOT/UI/.build.lock"
flock -n 9 || die "another build is already running in this checkout — wait for it to finish"
export AGRI_BUILD_LOCK_HELD=1

# ── Node 20 via nvm ──────────────────────────────────────────────────
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || die "nvm not found at $NVM_DIR"
nvm use 20 >/dev/null 2>&1 || die "Node 20 not installed — run: nvm install 20"
log "Using $(node -v)"

# ── Build the static export ──────────────────────────────────────────
#   NEXT_PUBLIC_API_URL = relative base baked into the browser bundle.
#   API_URL is deliberately NOT set: nothing is fetched at build time, and
#   leaving it unset means a stray build-time fetch fails loudly here rather
#   than silently baking one machine's data into the artefact.
log "Building static export → UI/out"
STATIC_EXPORT=1 \
NEXT_PUBLIC_API_URL="/api/v1" \
NODE_OPTIONS="--max-old-space-size=2048" \
bash "$REPO_ROOT/deploy/scripts/build-ui.sh"

[ -d "$REPO_ROOT/UI/out" ] || die "next build produced no UI/out — is STATIC_EXPORT honoured in next.config.ts?"

# ── Sanity-check the shells ──────────────────────────────────────────
# If these are missing, every record URL will 404 on the deployed site and
# the failure would only show up in production. Catch it here.
log "Verifying collection shells"
missing=()
for collection in projects technologies themes partners resources events opportunities news; do
  [ -f "$REPO_ROOT/UI/out/${collection}/_entry/index.html" ] || missing+=("$collection")
done
[ ${#missing[@]} -eq 0 ] || die "missing shells for: ${missing[*]} — check generateStaticParams in UI/app/*/[slug]/page.tsx"

# ── Install the export into Laravel's public directory ───────────────
STATIC_DIR="$REPO_ROOT/api/public/static"
log "Installing export → api/public/static"
rm -rf "$STATIC_DIR"
mkdir -p "$STATIC_DIR"
cp -r "$REPO_ROOT/UI/out/." "$STATIC_DIR/"

log "Done — $(find "$STATIC_DIR" -name 'index.html' | wc -l) pages, no content baked in."
printf '    git add api/public/static UI\n'
printf '    git commit -m "Rebuild static export"\n'
printf '    git push origin main\n'


# bash deploy/scripts/build-static.sh
