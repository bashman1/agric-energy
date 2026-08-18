# Deployment — UAT

Target: a single DigitalOcean droplet serving **https://menu.smartcollect.co.ug**.

The frontend is a **Next.js Node server** (`agrienergy-ui.service`) behind nginx.
Public pages render **per request** against Laravel, so content approved in the
admin panel is on the public site immediately.

> Until 2026-08, the frontend was a static export served off disk. It was
> replaced because the public site was a snapshot: an approved partner, project
> or theme stayed invisible until someone re-ran the build. If you are reading
> older notes that say "publishing requires a rebuild", they are out of date.

---

## Architecture

```
                    ┌──────────────── nginx :443 (TLS) ────────────────┐
  browser ───────►  │  /api/v1/*        ──────► php-fpm (Laravel)      │
                    │  /storage/*       ──────► disk (uploaded media)  │
                    │  /up              ──────► php-fpm (health)       │
                    │  /*               ──────► Next.js :3000          │
                    └──────────────────────────────┬──────────────────┘
                                                   │ renders each page against
                                                   ▼
                               nginx 127.0.0.1:8080 ──► php-fpm (Laravel)
```

The Node server binds to loopback only; nginx is the sole public entry point.
Its server-side calls go to the internal `:8080` listener, so a page render
never leaves the droplet.

One origin, so there is **no CORS configuration anywhere** and the browser calls
`/api/v1` directly. Auth is a Sanctum bearer token held in `sessionStorage`.

### On-disk layout

```
/var/www/agrienergy/repo/
├── api/                     Laravel (.env lives here); served from api/public
└── UI/                      Next.js source
    └── .next/               ← the build the Node server serves (gitignored)
```

---

## How the frontend is built and served

`deploy/scripts/build-ui.sh` runs `next build`, which emits `UI/.next`.
`agrienergy-ui.service` then serves it with `next start` on `127.0.0.1:3000`.

**The build no longer needs a live API.** Pages are rendered on demand, not
baked, so nothing is fetched at build time. What the build *does* still inline
is any `NEXT_PUBLIC_*` variable — there are none today.

`API_URL` is now a **runtime** setting, read per request by
`UI/lib/api/client.ts`. It is supplied by the systemd unit's `EnvironmentFile`.

### Publishing is live

An editor hitting **Publish**, or an admin approving a submission, changes the
public site on the next page load. No rebuild, no deploy, no cron job.

Run `deploy.sh` only when **source code** changes.

The one failure mode worth knowing: if `API_URL` is unreachable, `apiGet`
swallows the error and returns an empty list, so pages return 200 but render
without content. `deploy.sh`'s final smoke test checks `/projects/` body size
precisely to catch that.

---

## What is server-rendered and what is client-rendered

| Area | Rendering | Why |
|---|---|---|
| Public pages + detail pages | Server, per request (`ƒ`) | Live content, and it is in the HTML for crawlers |
| Listing-page filters | Client, over server-rendered data | The full list arrives in the HTML; filtering is instant |
| `/search` | Client | Arbitrary queries are not worth a round trip |
| `/admin/*`, `/partner/*` | Client SPA | Authenticated, token-driven, nothing to gain from SSR |

`next build` prints the rendering mode per route. **Every public content route
should show `ƒ (Dynamic)`.** If one shows `○ (Static)`, it has been frozen at
build time and will stop reflecting new content — that is the regression to
watch for.

Admin editors are single routes keyed by query string —
`/admin/projects/edit?slug=x` rather than `/admin/projects/x`. That is a
leftover from the export era; it works fine and was left alone.

> **Never reintroduce `cache: "force-cache"` in `lib/api/client.ts`.** It is
> what froze the old site. The server path uses `no-store` so each request
> re-reads Laravel. If the API needs relief, use a short
> `{ next: { revalidate: 30 } }` window instead — bounded staleness rather
> than indefinite.

> **`useSearchParams` still needs a Suspense boundary.** `lib/hooks/useUrlFilters.ts`
> reads `location.search` in an effect to sidestep it; keep using it.

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

Installs nginx, PHP 8.3-FPM, PostgreSQL 16, Node 22 (which now both builds
*and* serves the frontend), Composer and certbot; creates a 2 GB swapfile (a
1–2 GB droplet OOMs during `next build` without it); creates the database and
role; issues the TLS certificate; installs the vhost; closes the firewall to
22/80/443.

```bash
# 2 — configure
cd /var/www/agrienergy/repo
cp deploy/env/api.env.uat.example api/.env
cp deploy/env/ui.env.uat.example  deploy/env/ui.env.production
chmod 600 api/.env deploy/env/ui.env.production

# install the frontend service (reads ui.env.production at runtime)
cp deploy/systemd/agrienergy-ui.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable agrienergy-ui

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

Pulls `main`, installs deps, migrates, rebuilds the frontend, restarts
`agrienergy-ui`, and runs six smoke tests. Flags: `--skip-pull`, `--skip-api`,
`--skip-ui`.

**Only run this for code changes.** Publishing content needs nothing.

A failed build **restores the previous build** rather than leaving the site
broken, and the running server keeps serving throughout. To roll back manually:

```bash
cd /var/www/agrienergy/repo/UI
rm -rf .next && mv .next.old .next
systemctl restart agrienergy-ui
```

---

## The build-time vs runtime env trap

- **`NEXT_PUBLIC_*` are inlined into the bundle during the build**, so changing
  them requires a rebuild. (There are none today.)
- **`API_URL` is runtime.** It is where the Node server renders pages *from*,
  on every request, and it comes from the systemd unit's `EnvironmentFile` —
  so changing it needs `systemctl restart agrienergy-ui`, not a rebuild. The
  browser still uses the relative, same-origin `/api/v1`.
- **`SESSION_SECRET` is gone.** There is no server session; the Sanctum token
  lives in the browser.

---

## Operations

```bash
# logs
journalctl -u agrienergy-ui -f
tail -f /var/log/nginx/agrienergy.error.log
tail -f /var/www/agrienergy/repo/api/storage/logs/laravel.log

# service control
systemctl status agrienergy-ui
systemctl restart agrienergy-ui
systemctl reload nginx
nginx -t

# health
curl -I https://menu.smartcollect.co.ug/up
curl -s https://menu.smartcollect.co.ug/api/v1/projects | head -c 300

# is the Node server up on loopback?
curl -sI http://127.0.0.1:3000/ | head -1

# can the Node server reach the API it renders from?
curl -s http://127.0.0.1:8080/api/v1/projects | head -c 200

# are pages actually rendering content?
curl -s https://menu.smartcollect.co.ug/projects/ | wc -c   # expect >> 8000

# clear Laravel caches after an out-of-band .env edit
cd /var/www/agrienergy/repo/api && php artisan optimize:clear && php artisan optimize
```

TLS renews automatically via the `certbot.timer` systemd unit; verify with
`certbot renew --dry-run`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every page 502s | Node server down | `systemctl status agrienergy-ui`; `journalctl -u agrienergy-ui -n 50` |
| Pages render but are empty | Node cannot reach the API it renders from | check `API_URL` in `ui.env.production`; `curl http://127.0.0.1:8080/api/v1/projects` |
| Pages render unstyled | assets not reaching Node | confirm the nginx `location /` proxies to `:3000` and no stale `assetPrefix` is set in `next.config.ts` |
| Newly published content missing | almost never a deploy problem now | confirm the record is actually published: `select slug, published, workflow_status from partners where slug='x'` |
| A public route stopped updating | route became static | `next build` output shows it as `○` not `ƒ` — a `force-cache` fetch or `generateStaticParams` crept back in |
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
5. **Watch the API under render load.** Every public page view now costs a
   Laravel round trip. That is fine at UAT traffic, but if php-fpm starts
   queueing, add a short `revalidate` window in `UI/lib/api/client.ts` rather
   than reverting to build-time caching.
