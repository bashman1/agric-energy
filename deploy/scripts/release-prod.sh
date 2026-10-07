#!/usr/bin/env bash
# ============================================================
# Agri-Energy Desk — PRODUCTION release (https://agrienergy.nrep.ug)
#
# Called by the Jenkinsfile, as the `agrienergy` user:
#
#   sudo -u agrienergy /opt/agrienergy/bin/release-prod.sh <api-dir> <release-id>
#   sudo -u agrienergy /opt/agrienergy/bin/release-prod.sh --rollback <release-id>
#
# <api-dir> is the Jenkins workspace's api/ directory, already holding
# vendor/ (composer install --no-dev) and public/static (build-static.sh).
#
# UAT does not use this script. UAT keeps update-server.sh, which copies api/
# over a live docroot. Production uses releases + an atomic symlink instead:
#
#   /var/www/agrienergy-prod/
#   ├── releases/<id>/        one clean tree per build — never layered
#   ├── shared/.env           survives every release
#   ├── shared/storage/       uploads, private disk, logs
#   ├── backups/              pg_dump taken before each migrate
#   └── current -> releases/<id>     nginx root is current/public
#
# A fresh tree per release is what rules out the stale-static failure seen on
# UAT (see update-server.sh): nothing from an older build can shadow the
# collection shells, because an older build is never in the served tree.
#
# SECURITY: sudo runs the ROOT-OWNED copy in /opt/agrienergy/bin, never the
# one in the workspace — otherwise anyone who can push to `production` could
# run arbitrary code as `agrienergy`. After changing this file, reinstall it:
#   sudo install -o root -g root -m 755 deploy/scripts/release-prod.sh /opt/agrienergy/bin/
# ============================================================
set -euo pipefail

APP="${APP:-/var/www/agrienergy-prod}"
DOMAIN="${DOMAIN:-agrienergy.nrep.ug}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
KEEP_BACKUPS="${KEEP_BACKUPS:-10}"

RELEASES="$APP/releases"
SHARED="$APP/shared"
BACKUPS="$APP/backups"
CURRENT="$APP/current"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  die "usage: $0 <api-dir> <release-id>  |  $0 --rollback <release-id>"
}

[[ "$(id -un)" == "agrienergy" ]] || die "run as agrienergy (sudo -u agrienergy $0 …)"
[[ -d "$RELEASES" && -d "$SHARED" ]] || die "$APP is not provisioned — run provision-prod.sh"

# One release at a time. Jenkins already disables concurrent builds; this
# also covers someone running the script by hand during a build.
exec 9>"$APP/.release.lock"
flock -n 9 || die "another release is in progress"

# ── Helpers ──────────────────────────────────────────────────────────
env_value() {
  # Plain KEY=value lines only; surrounding quotes stripped.
  grep -E "^$1=" "$SHARED/.env" | tail -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/^'\''(.*)'\''$/\1/'
}

switch_to() {
  # ln + mv -T is atomic: a request sees the old tree or the new one, never
  # a missing `current`.
  ln -sfn "$1" "$APP/current.new"
  mv -T "$APP/current.new" "$CURRENT"
  # Graceful (in-flight requests finish), and it covers the other sites'
  # pools too without dropping them. Clears OPcache for this release.
  sudo -n /usr/bin/systemctl reload php8.3-fpm || die "php-fpm reload failed"
}

smoke_tests() {
  # --resolve pins the domain to this host, so the tests exercise the real
  # vhost and certificate even before (or regardless of) public DNS.
  local base="https://${DOMAIN}"
  local resolve=(--resolve "${DOMAIN}:443:127.0.0.1")
  local fail=0

  check() {
    local name=$1 path=$2 expect=${3:-200} code rc=0
    # curl prints the status even when the transfer then breaks, so judge
    # its exit code separately — a right status with a truncated body is a
    # broken page, not a pass.
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "${resolve[@]}" "${base}${path}") || rc=$?
    if [[ $rc -ne 0 ]]; then
      printf '  \033[1;31mFAIL\033[0m %-30s %s, then the transfer broke (curl exit %s)\n' "$name" "${code:-no response}" "$rc"
      fail=1
    elif [[ "$code" == "$expect" ]]; then
      printf '  \033[1;32mok\033[0m   %-30s %s\n' "$name" "$code"
    else
      printf '  \033[1;31mFAIL\033[0m %-30s %s (expected %s)\n' "$name" "$code" "$expect"
      fail=1
    fi
  }

  sleep 2
  check "Laravel health"      "/up"
  check "Laravel API"         "/api/v1/projects"
  check "Home page"           "/"
  check "Admin login"         "/admin/login"
  check "Unknown route 404"   "/definitely-not-a-page" 404
  check "Shell path refused"  "/projects/_entry/" 404

  # Record pages answer 200 even when broken (Next's error document), so a
  # status check cannot see it. Take one real slug per collection and make
  # sure what comes back is a page. Same check as update-server.sh.
  local collection slug body
  for collection in projects technologies themes partners resources events opportunities news; do
    slug=$(curl -sS --max-time 20 "${resolve[@]}" "${base}/api/v1/${collection}" \
      | sed -n 's/.*"slug":"\([^"]*\)".*/\1/p' | head -1 || true)
    if [[ -z "$slug" ]]; then
      printf '  skip %-30s no records\n' "/${collection}/…"
      continue
    fi
    body=$(curl -sS --max-time 20 "${resolve[@]}" "${base}/${collection}/${slug}" || true)
    if [[ -z "$body" ]] || grep -q '__next_error__' <<<"$body"; then
      printf '  \033[1;31mFAIL\033[0m %-30s Next error page\n' "/${collection}/${slug}"
      fail=1
    else
      printf '  \033[1;32mok\033[0m   %-30s %s bytes\n' "/${collection}/${slug}" "${#body}"
    fi
  done

  return "$fail"
}

activate() {
  # Switch to $1 and verify; on failure put $2 (the previous release) back.
  local target=$1 previous=$2
  log "Switching current → $(basename "$target")"
  switch_to "$target"

  log "Smoke tests"
  if smoke_tests; then
    return 0
  fi

  if [[ -n "$previous" && -d "$previous" ]]; then
    warn "Smoke tests failed — reverting to $(basename "$previous")"
    switch_to "$previous"
    warn "Reverted. Database migrations were NOT rolled back; the pre-migrate dump is in $BACKUPS"
  else
    warn "Smoke tests failed and there is no previous release to revert to"
  fi
  return 1
}

previous_release() {
  [[ -L "$CURRENT" ]] && readlink -f "$CURRENT" || true
}

# ── Rollback mode ────────────────────────────────────────────────────
if [[ "${1:-}" == "--rollback" ]]; then
  id="${2:-}"
  [[ "$id" =~ ^[0-9]+$ ]] || usage
  target="$RELEASES/$id"
  [[ -d "$target" ]] || die "no such release: $id (have: $(ls "$RELEASES" | sort -n | tr '\n' ' '))"
  prev="$(previous_release)"
  [[ "$prev" == "$target" ]] && die "release $id is already live"
  warn "Rolling back code only. Migrations made since release $id stay applied."
  activate "$target" "$prev" || die "rollback to $id failed smoke tests"
  log "Rolled back to release $id"
  exit 0
fi

# ── Release mode ─────────────────────────────────────────────────────
SRC="${1:-}"; ID="${2:-}"
[[ -n "$SRC" && "$ID" =~ ^[0-9]+$ ]] || usage
SRC="$(cd "$SRC" && pwd)" || die "cannot read $SRC"
[[ -f "$SRC/artisan" ]] || die "$SRC is not the api/ directory"
[[ -f "$SRC/vendor/autoload.php" ]] || die "$SRC/vendor missing — run composer install --no-dev first"
for collection in projects technologies themes partners resources events opportunities news; do
  [[ -f "$SRC/public/static/${collection}/_entry/index.html" ]] \
    || die "static export missing the ${collection} shell — run deploy/scripts/build-static.sh first"
done

TARGET="$RELEASES/$ID"
[[ -e "$TARGET" ]] && die "release $ID already exists"

# Fail loudly rather than deploying a half-configured API (same checks as deploy.sh).
[[ -f "$SHARED/.env" ]] || die "missing $SHARED/.env (copy deploy/env/api.env.prod.example)"
grep -q 'CHANGE_ME' "$SHARED/.env" && die "$SHARED/.env still contains CHANGE_ME placeholders"
grep -q '^APP_KEY=base64:' "$SHARED/.env" || die 'APP_KEY not set — generate one with: echo "base64:$(openssl rand -base64 32)"'
grep -q '^APP_DEBUG=false' "$SHARED/.env" || die "APP_DEBUG must be false in production"
grep -q '^DB_CONNECTION=pgsql' "$SHARED/.env" || die "DB_CONNECTION must be pgsql (the app uses jsonb / ilike / tsvector)"

PREV="$(previous_release)"

log "Staging release $ID from $SRC"
mkdir -p "$TARGET"
# Owner rwx, group (www-data is in group agrienergy) read-only, others none.
rsync -a --no-owner --no-group --chmod=D2750,F640 \
  --exclude='/.env' --exclude='/.env.*' \
  --exclude='/storage' --exclude='/public/storage' \
  --exclude='/bootstrap/cache/*.php' \
  --exclude='/node_modules' --exclude='/tests' --exclude='/.phpunit.cache' \
  "$SRC/" "$TARGET/"

ln -sfn "$SHARED/.env" "$TARGET/.env"
ln -sfn "$SHARED/storage" "$TARGET/storage"

cd "$TARGET"

log "Backing up the database"
backup="$BACKUPS/${ID}-$(date +%Y%m%d-%H%M%S).dump"
PGPASSWORD="$(env_value DB_PASSWORD)" pg_dump -Fc \
  -h "$(env_value DB_HOST)" -p "$(env_value DB_PORT)" \
  -U "$(env_value DB_USERNAME)" "$(env_value DB_DATABASE)" > "$backup" \
  || { rm -f "$backup"; rm -rf "$TARGET"; die "pg_dump failed — release aborted before any change"; }
chmod 600 "$backup"
ls -1t "$BACKUPS"/*.dump 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f

log "Laravel: migrations"
php artisan migrate --force

# Idempotent; moves any view-only file still on the public disk to the
# private one, where it is only reachable through a signed API link.
log "Laravel: securing view-only resource files"
php artisan resources:secure-restricted

log "Laravel: permission cache, storage link, caches"
php artisan permission:cache-reset
php artisan storage:link --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

activate "$TARGET" "$PREV" || die "release $ID failed smoke tests"

# ── Prune old releases (never the live one) ──────────────────────────
live="$(readlink -f "$CURRENT")"
ls -1 "$RELEASES" | grep -E '^[0-9]+$' | sort -n | head -n -"$KEEP_RELEASES" | while read -r old; do
  [[ "$RELEASES/$old" == "$live" ]] && continue
  rm -rf "${RELEASES:?}/$old"
done

log "Release $ID is live — $(ls -1 "$RELEASES" | wc -l) releases kept (rollback: ROLLBACK_TO=<id>)"
