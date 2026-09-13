#!/usr/bin/env bash
# ============================================================
# Build the Next.js frontend.
#
# By default `next build` emits UI/.next, which agrienergy-ui.service serves
# with `next start` on 127.0.0.1:3000. When STATIC_EXPORT=1 is set (as
# build-static.sh does), it instead emits a static export into UI/out, which
# build-static.sh installs into api/public/static.
#
# Run it when the UI SOURCE changes. For the server build, restart after:
#   systemctl restart agrienergy-ui
#
# Run from anywhere; paths are resolved relative to the repo root.
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UI_DIR="$REPO_ROOT/UI"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ -d "$UI_DIR" ] || die "UI directory not found at $UI_DIR"

# One build at a time — see the lock in build-static.sh for why a parallel
# `npm ci` corrupts node_modules instead of failing. Taken here too so running
# this script on its own is covered, but skipped when build-static.sh already
# holds it: re-locking the same file from a child would deadlock.
if [ -z "${AGRI_BUILD_LOCK_HELD:-}" ]; then
  exec 9>"$UI_DIR/.build.lock"
  flock -n 9 || die "another build is already running in this checkout — wait for it to finish"
fi

cd "$UI_DIR"

# Next 16 refuses to build on anything older. Catch it here rather than
# letting the failure surface as a confusing parse error mid-build.
node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
[ "$node_major" -ge 20 ] || die "Node >= 20 required, found $(node -v 2>/dev/null || echo none)"

log "Installing UI dependencies"
npm ci

# Not --omit=dev: typescript and tailwind are devDependencies and the
# build needs them. They are compile-time only and never ship.

log "Building (~3-6 min on a 2GB droplet)"
rm -rf .next
npx next build

[ -d "$UI_DIR/.next" ] || die "next build produced no .next directory"
[ -f "$UI_DIR/.next/BUILD_ID" ] || die "build is missing BUILD_ID — it did not complete"

log "Done — built $(cat "$UI_DIR/.next/BUILD_ID")"
log "Restart the server to pick it up:  systemctl restart agrienergy-ui"
