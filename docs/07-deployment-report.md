# Deployment Report

**Deliverable:** ToR Deliverable 8 — Evidence of successful production deployment

> **Status.** Sections 1–6 are the production deployment runbook and are complete and
> executable. Sections 7–9 record the actual production deployment event and are marked for
> completion once it has taken place.

---

## 1. Target architecture

| Component | Requirement |
|---|---|
| Operating system | Ubuntu 22.04 LTS or equivalent |
| Web server | nginx — TLS termination, static assets, reverse proxy |
| PHP | 8.2+ with PHP-FPM; extensions: `pdo_pgsql`, `mbstring`, `xml`, `curl`, `zip`, `gd` |
| Node.js | 20 LTS, with a process manager (systemd or PM2) |
| Database | PostgreSQL 14+ |
| TLS | Valid certificate; automatic renewal (Let's Encrypt or institutional CA) |
| Storage | Persistent volume for `api/storage/app/public` |

Minimum sizing for initial production: 2 vCPU, 4 GB RAM, 40 GB storage for the application
host, with the database either co-located or on a managed instance.

---

## 2. Pre-deployment checklist

- [ ] DNS records for the public site and the API point to the server
- [ ] TLS certificates issued and installed; HTTP redirects to HTTPS
- [ ] PostgreSQL role and database created; the application role has no superuser rights
- [ ] `.env` files created from `.env.example` with production values; not in version control
- [ ] `APP_ENV=production`, `APP_DEBUG=false`
- [ ] `APP_KEY` generated for this environment
- [ ] `SESSION_SECRET` (frontend) is a fresh secret of at least 32 characters
- [ ] SMTP credentials configured and a test message delivered
- [ ] Backup destination provisioned and writable
- [ ] Firewall permits 80/443 only; database not exposed publicly

---

## 3. Deployment procedure

### 3.1 Backend

```bash
cd /var/www/agri-energy/api
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan db:seed --class=RolesAndAdminSeeder --force   # first deployment only
php artisan storage:link
php artisan config:cache && php artisan route:cache && php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache
```

### 3.2 Frontend

```bash
cd /var/www/agri-energy/UI
npm ci
npm run build
# served by a process manager, e.g.
pm2 start "npm run start" --name agri-energy-ui
pm2 save
```

### 3.3 nginx

```nginx
server {
    listen 443 ssl http2;
    server_name agrienergydesk.go.ug;

    ssl_certificate     /etc/letsencrypt/live/agrienergydesk.go.ug/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agrienergydesk.go.ug/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 25M;   # media uploads

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.agrienergydesk.go.ug;
    root /var/www/agri-energy/api/public;
    index index.php;

    ssl_certificate     /etc/letsencrypt/live/api.agrienergydesk.go.ug/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.agrienergydesk.go.ug/privkey.pem;

    client_max_body_size 25M;

    location / { try_files $uri $uri/ /index.php?$query_string; }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}

server {
    listen 80;
    server_name agrienergydesk.go.ug api.agrienergydesk.go.ug;
    return 301 https://$host$request_uri;
}
```

---

## 4. Backup and monitoring

**Database backup** — nightly, retained 30 days, plus a monthly copy retained 12 months:

```bash
# /etc/cron.d/agri-energy-backup
0 2 * * * postgres pg_dump -Fc agrienergy_desk > /var/backups/agri-energy/db-$(date +\%F).dump
```

**Media backup** — mirror `api/storage/app/public` to the same destination daily.

**Restore rehearsal** — quarterly, into a staging database, and record the result.

**Monitoring** — uptime check against the public homepage and `/api/v1/site-config`; disk
space alert at 80%; log review for 5xx responses. Application logs are in
`api/storage/logs/`.

---

## 5. Post-deployment verification

Run after every deployment:

| # | Check | Expected |
|---|---|---|
| 1 | Public homepage over HTTPS | Loads, certificate valid |
| 2 | `GET /api/v1/projects` | 200 with published records only |
| 3 | Admin sign-in | Succeeds; dashboard renders |
| 4 | Create, publish and view a test record | Appears on the public site, then remove it |
| 5 | Partner registration | Creates a pending account; sign-in refused |
| 6 | Review queue approval | Publishes and writes an audit entry |
| 7 | Report generation with PDF and Excel download | Both files open correctly |
| 8 | Record factsheet download from a public detail page | Both formats download |
| 9 | Search and type-ahead | Return ranked results |
| 10 | Map | Renders markers and regional shading |
| 11 | Newsletter subscribe and confirm | Confirmation email received; subscription activates |
| 12 | Contact form | Enquiry appears in the admin inbox |
| 13 | `APP_DEBUG` | `false` — error pages disclose no stack traces |
| 14 | Mobile handset | Public site fully usable |

---

## 6. Rollback

1. Restore the previous application release directory (or `git checkout` the previous tag
   and re-run the build steps).
2. If the release included migrations, `php artisan migrate:rollback --step=1`. Every
   migration implements `down()`.
3. If data was affected, restore the most recent `pg_dump` taken before the release.
4. Clear and rebuild caches: `php artisan optimize:clear && php artisan config:cache`.
5. Re-run the §5 verification checks.

Always take a database dump immediately before applying a release that includes
migrations.

---

## 7. Production deployment record

`[TO BE COMPLETED: fill in once the platform has been deployed to NREP's production
environment.]`

| Item | Value |
|---|---|
| Deployment date | `[TO BE COMPLETED]` |
| Deployed by | `[TO BE COMPLETED]` |
| Release version / commit | `[TO BE COMPLETED]` |
| Public site URL | `[TO BE COMPLETED]` |
| API base URL | `[TO BE COMPLETED]` |
| Hosting provider / environment | `[TO BE COMPLETED]` |
| Server specification | `[TO BE COMPLETED]` |
| PHP / Node / PostgreSQL versions | `[TO BE COMPLETED]` |
| TLS certificate authority and expiry | `[TO BE COMPLETED]` |
| Backup destination and schedule | `[TO BE COMPLETED]` |
| Monitoring configured | `[TO BE COMPLETED]` |

---

## 8. Verification results

`[TO BE COMPLETED: record the outcome of each check in §5 against the production
environment, with the date and the name of the person who performed it.]`

| # | Check | Result | Verified by | Date |
|---|---|---|---|---|
| 1 | | | | |

---

## 9. Handover

`[TO BE COMPLETED]`

| Item | Handed to | Date |
|---|---|---|
| Server and database credentials (transferred securely) | | |
| Domain and DNS control | | |
| TLS certificate renewal process | | |
| Source code repository access | | |
| Backup destination access | | |
| Monitoring and alert routing | | |
| Support contact and escalation for the warranty period | | |

**Sign-off**

| | Name | Position | Signature | Date |
|---|---|---|---|---|
| Deployed by | `[TO BE COMPLETED]` | Consultant | | |
| Accepted by | `[TO BE COMPLETED]` | NREP Contract Manager | | |
