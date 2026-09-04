#!/bin/bash
# ============================================================
# Agri-Energy Desk — server update (run ON the droplet)
#
#   git pull → sync api/ into the docroot → migrate → optimise
#
# The app is deployed by copying api/ up into /var/www/agric/, so
# /var/www/agric/public is the docroot and the exported frontend is served
# from /var/www/agric/public/static.
#
# WHY THE STATIC DIR IS SYNCED SEPARATELY
# `cp -a` only ever writes over — it never removes. A file deleted from the
# repo therefore lives forever in the copied tree. That is harmless for PHP
# (nothing routes to an orphaned class) but NOT for the exported frontend:
# before 2026-08-24 the export prerendered one directory per record, and
# nginx's try_files matches public/static/projects/<slug>/index.html before
# it ever falls back to index.php. So a stale pre-fix page was served
# INSTEAD of the collection shell — answering 200 with Next's error
# document — for every record that existed back then, while records created
# later resolved fine. Status-code smoke tests all passed throughout.
#
# public/static is a pure build artefact, so it is safe to mirror with
# --delete. The rest of the tree is NOT: a blanket --delete at the docroot
# would wipe .git, UI/, deploy/, storage/ uploads and .env.
# ============================================================
set -uo pipefail

APP=/var/www/agric
OWNER=smart

cd "$APP" || { echo "Directory $APP does not exist."; exit 1; }

# Take ownership so git and the copy can write.
echo "Changing ownership to '$OWNER' for $APP/..."
sudo chown -R "$OWNER" "$APP/"

echo "Pulling the latest changes from the git repository..."
sudo -u "$OWNER" git pull origin main --rebase=false || {
  echo "Git pull failed. Please check the repository or permissions."
  exit 1
}

# Debris from a build that was ever run on this host would be untracked, so
# the pull leaves it alone and the mirror below would faithfully copy it up.
echo "Clearing untracked build debris from api/public/static..."
sudo -u "$OWNER" git clean -fdq -- api/public/static

echo "Copying api contents to $APP/..."
sudo cp -a "$APP/api/." "$APP/" || {
  echo "Failed to copy api contents."
  exit 1
}

# The one directory that must MIRROR rather than accumulate. Trailing
# slashes are load-bearing: they mean "the contents of", not "the directory".
echo "Mirroring the exported frontend (removing files dropped from the build)..."
if command -v rsync >/dev/null 2>&1; then
  sudo rsync -a --delete "$APP/api/public/static/" "$APP/public/static/" || {
    echo "Failed to mirror public/static."
    exit 1
  }
else
  # Same result without rsync. Staged next to the target and swapped in, so
  # the site is never left without a static tree mid-copy.
  sudo rm -rf "$APP/public/static.new" "$APP/public/static.old"
  sudo cp -a "$APP/api/public/static" "$APP/public/static.new" || {
    echo "Failed to stage public/static."
    exit 1
  }
  [ -d "$APP/public/static" ] && sudo mv "$APP/public/static" "$APP/public/static.old"
  sudo mv "$APP/public/static.new" "$APP/public/static"
  sudo rm -rf "$APP/public/static.old"
fi

# public/storage must point at the storage of the app that is RUNNING. The
# copy above brings api/public/storage along as a symlink, and if it was ever
# created by running artisan inside api/ it still points at
# $APP/api/storage/app/public — while php-fpm, running from $APP, writes
# uploads to $APP/storage/app/public. Uploads then land on disk correctly and
# 404 over HTTP. --force because the link already exists.
echo "Re-linking public/storage to this app's storage..."
sudo -u "$OWNER" php artisan storage:link --force || {
  echo "storage:link failed — uploaded images will not be served."
  exit 1
}

echo "Running database migrations..."
sudo -u "$OWNER" php artisan migrate --force || {
  echo "Database migration failed."
  exit 1
}

echo "Resetting the permission cache..."
sudo -u "$OWNER" php artisan permission:cache-reset || {
  echo "Permission cache reset failed."
  exit 1
}

echo "Clearing and caching Laravel..."
sudo -u "$OWNER" php artisan optimize || {
  echo "Laravel optimization failed."
  exit 1
}

echo "Changing ownership back to 'www-data' for $APP..."
sudo chown -R www-data:www-data "$APP/"

# ── Verify record pages actually resolve ─────────────────────────────
# These are what a stale static tree breaks silently: they answer 200 with
# Next's error document rather than a failing status, so nothing above
# would notice. Take one real slug per collection from the API and assert
# the page that comes back is a page.
DOMAIN="${DOMAIN:-menu.smartcollect.co.ug}"
echo "Verifying record pages resolve..."
fail=0
for collection in projects technologies themes partners resources events opportunities news; do
  slug=$(curl -sS --max-time 20 "https://${DOMAIN}/api/v1/${collection}" \
    | sed -n 's/.*"slug":"\([^"]*\)".*/\1/p' | head -1)
  if [ -z "$slug" ]; then
    printf '  skip  %-42s no records\n' "/${collection}/…"
    continue
  fi
  body=$(curl -sS --max-time 20 "https://${DOMAIN}/${collection}/${slug}")
  if printf '%s' "$body" | grep -q '__next_error__'; then
    printf '  FAIL  %-42s Next error page\n' "/${collection}/${slug}"
    fail=1
  else
    printf '  ok    %-42s %s bytes\n' "/${collection}/${slug}" "${#body}"
  fi
done

if [ "$fail" -ne 0 ]; then
  echo
  echo "Record pages are being shadowed by stale files in $APP/public/static."
  echo "Force a full re-mirror:  sudo rm -rf $APP/public/static && sudo $0"
  exit 1
fi

echo "Update completed successfully!"
