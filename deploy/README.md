# Deployment — UAT

Target: a single DigitalOcean droplet serving **https://menu.smartcollect.co.ug**.

The frontend is a **Next.js static export** installed into Laravel's
`api/public/static`. There is no Node process in production — Laravel and nginx
serve everything from one origin.

---

## Architecture

```
                    ┌──────────────── nginx :443 (TLS) ────────────────┐
  browser ───────►  │  /api/v1/*        ──────► php-fpm (Laravel)      │
                    │  /storage/*       ──────► disk (uploaded media)  │
                    │  /up              ──────► php-fpm (health)       │
                    │  /static/_next/*  ──────► disk (build assets)    │
                    │  /*               ──────► disk (prerendered HTML)│
                    └─────────────────────────────────────────────────┘
```

One origin, so there is **no CORS configuration anywhere** and the browser calls
`/api/v1` directly. Auth is a Sanctum bearer token held in `sessionStorage`.

### On-disk layout

```
/var/www/agrienergy/repo/
├── api/                     Laravel (.env lives here); served from api/public
│   └── public/static/       ← the exported frontend (gitignored)
└── UI/                      Next.js source
```

---

## How the frontend is built

`deploy/scripts/build-ui.sh` runs `next build` (with `output: "export"`) and
copies `UI/out/` into `api/public/static/`. `UI/public/*` goes to the web root,
not under `/static`, because the app references those with absolute paths.

**The build prerenders every public page against a live Laravel instance.**
`API_URL` must point at a reachable API or the export ships empty pages. The
script refuses to start if it cannot reach the API, `generateStaticParams`
throws if a content type returns zero records, and `deploy.sh` checks that
`/projects` came back larger than 8 KB. A silently-empty export looks exactly
like a successful deploy, which is why it is guarded three times.

### Publishing requires a rebuild

Public pages are baked at build time. An editor hitting **Publish** does not
change the live site until the export is rebuilt:

```bash
bash /var/www/agrienergy/repo/deploy/scripts/deploy.sh --skip-pull --skip-api
```

Run that from cron (say nightly) or wire it to a button, but decide before real
editors start using the admin panel. The admin and partner areas are
client-rendered and always live — this only affects the public site.

---

## What is static and what is client-rendered

| Area | Rendering | Why |
|---|---|---|
| Public pages + detail pages | Prerendered HTML | SEO; content is in the HTML for crawlers |
| Listing-page filters | Client, over prerendered data | Keeps the full list in the exported HTML |
| `/search` | Client | Arbitrary queries cannot be prerendered |
| `/admin/*`, `/partner/*` | Client SPA | Records created after the build have no prerendered page |

Admin editors are single routes keyed by query string — `/admin/projects/edit?slug=x`
rather than `/admin/projects/x` — because a static export can only emit pages
whose params are known at build time.

> **`useSearchParams` is banned on prerendered pages.** In an export it forces
> its whole Suspense subtree to bail to the fallback at build time, so the page
> ships as an empty shell. Use `lib/hooks/useUrlFilters.ts`, which reads
> `location.search` in an effect instead.

> **Build-time fetches must be cached.** `lib/api/client.ts` uses
> `cache: "force-cache"` on the Node path. An uncached fetch is treated as
> dynamic data and the page is exported as an empty shell with the content
> deferred to the client — silently losing the prerender.

---

## Security model

The admin bundle is publicly downloadable — that is normal for an SPA, and safe
only because **Laravel enforces every rule server-side**: `auth:sanctum` plus
`ContentPolicy`, the `manage` / `viewAny` / `manage-users` / `upload-media`
gates, and a `Gate::before` super-admin bypass.

`components/auth/RouteGuard.tsx` is a UX affordance, not a security boundary.
Never put a secret in the frontend bundle.

Two things were tightened when the origins merged:

- **Uploads check approval, not just authentication** (`upload-media` gate).
  Previously any authenticated account — including a pending or suspended one —
  could upload.
- **SVG uploads are rejected.** An SVG is executable markup; served from
  `/storage` on the app's own origin it could read the admin's token out of
  `sessionStorage`. Use PNG or WebP for logos.

---

## First deploy

**Prerequisite:** point an `A` record for `menu.smartcollect.co.ug` at the
droplet's IP and wait for it to resolve — certbot fails otherwise.

```bash
# 1 — provision (as root on the droplet)
ssh root@<droplet-ip>
apt-get update && apt-get install -y git
git clone <repo-url> /var/www/agrienergy/repo

DB_PASS='<strong-password>' \
  bash /var/www/agrienergy/repo/deploy/scripts/provision.sh
```

Installs nginx, PHP 8.3-FPM, PostgreSQL 16, Node 22 (needed to *build* the
export, not to serve it), Composer and certbot; creates a 2 GB swapfile (a
1–2 GB droplet OOMs during `next build` without it); creates the database and
role; issues the TLS certificate; installs the vhost; closes the firewall to
22/80/443.

```bash
# 2 — configure
cd /var/www/agrienergy/repo
cp deploy/env/api.env.uat.example api/.env
cp deploy/env/ui.env.uat.example  deploy/env/ui.env.production
chmod 600 api/.env deploy/env/ui.env.production

# replace every CHANGE_ME in both files
nano api/.env
nano deploy/env/ui.env.production

php api/artisan key:generate          # writes APP_KEY into api/.env

# 3 — deploy
bash deploy/scripts/deploy.sh
```

`deploy.sh` refuses to run while a `CHANGE_ME` placeholder remains, or if
`APP_KEY` is unset.

---

## Redeploying

```bash
bash /var/www/agrienergy/repo/deploy/scripts/deploy.sh
```

Pulls `main`, installs deps, migrates, rebuilds the export, and runs six smoke
tests. Flags: `--skip-pull`, `--skip-api`, `--skip-ui`.

A failed build **restores the previous export** rather than leaving the site
broken. To roll back manually:

```bash
rm -rf /var/www/agrienergy/repo/api/public/static
mv /var/www/agrienergy/repo/api/public/static.old \
   /var/www/agrienergy/repo/api/public/static
```

---

## The build-time vs runtime env trap

- **`NEXT_PUBLIC_*` are inlined into the bundle during the build**, so changing
  them requires a rebuild.
- **`API_URL` is build-time only.** It is where the export prerenders *from*.
  At runtime the browser always uses the relative, same-origin `/api/v1`.
- **`SESSION_SECRET` is gone.** There is no server session; the Sanctum token
  lives in the browser.

---

## Operations

```bash
# logs
tail -f /var/log/nginx/agrienergy.error.log
tail -f /var/www/agrienergy/repo/api/storage/logs/laravel.log

# service control
systemctl reload nginx
nginx -t

# health
curl -I https://menu.smartcollect.co.ug/up
curl -s https://menu.smartcollect.co.ug/api/v1/projects | head -c 300

# is the export actually populated?
curl -s https://menu.smartcollect.co.ug/projects | wc -c   # expect >> 8000

# clear Laravel caches after an out-of-band .env edit
cd /var/www/agrienergy/repo/api && php artisan optimize:clear && php artisan optimize
```

TLS renews automatically via the `certbot.timer` systemd unit; verify with
`certbot renew --dry-run`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every page 404s | export missing | `ls api/public/static/index.html`; re-run `deploy.sh` |
| Pages render but are empty | export built against a dead/empty API | rebuild with `BUILD_API_URL` reachable; check `curl $BUILD_API_URL/projects` |
| Pages render unstyled | `assetPrefix` mismatch | confirm `api/public/static/_next/` exists and the nginx `/static/_next/` block is present |
| Newly published content missing | no rebuild since publish | re-run `deploy.sh --skip-pull --skip-api` |
| API returns HTML instead of JSON | request hit the SPA fallback | check the `^~ /api/v1` block is present and `nginx -t` passes |
| Login returns 401 for valid credentials | wrong credentials or unapproved account | check `users.status` is `approved` |
| Admin page flashes then redirects to login | token expired or revoked | sign in again; the client clears the token on any 401 |
| Uploaded images 404 | missing storage symlink | `cd repo/api && php artisan storage:link` |
| SVG logo upload rejected | intentional — a stored SVG is an XSS vector on this origin | upload PNG or WebP |
| `next build` killed | out of memory | confirm `swapon --show` lists `/swapfile` |
| Stale page after deploy | HTML cached | HTML is sent `no-cache`; hard-refresh and check the `Cache-Control` header |

---

## Before this goes beyond UAT

1. **Rotate the prototype credentials.** `admin@agrienergy.go.ug` /
   `agrienergy2026` is in git history — treat it as public.
2. **Seed data is fictional.** Project budget figures in the prototype dataset
   are invented; they must not be presented as real programme data.
3. **No backups are configured.** Add `pg_dump` to cron plus a DO snapshot
   schedule before any real content is entered.
4. **Mail defaults to `log`.** Registration and verification emails are written
   to `storage/logs`, not sent, until real SMTP credentials are set.
5. **Decide the rebuild trigger.** Publishing does not update the public site
   until the export is rebuilt (see above).
