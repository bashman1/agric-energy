# Deployment — Production

Target: **https://agrienergy.nrep.ug**, VM `45.136.71.160` (Ubuntu 24.04, 4 vCPU, 3.5 GB).
Deployed by **Jenkins on the same VM**, from the **`production`** branch of
`National-Renewable-Energy-Platform/NREP-Energy-Desk`, using the **static export**
(nginx + PHP-FPM + PostgreSQL, no Node process at runtime).

UAT (`menu.smartcollect.co.ug`) is documented in [README.md](README.md) and is
**not affected** by anything here:

| | UAT | Production |
|---|---|---|
| Branch | `main` | `production` |
| Deployed by | `update-server.sh`, by hand | `Jenkinsfile`, Jenkins on the VM |
| Static export | committed in git | rebuilt by Jenkins in its workspace, never committed |
| Layout | `cp -a api/.` over a live docroot | clean release per build + atomic `current` symlink |
| Files | `deploy/nginx/menu.*`, `api.env.uat.example` | `deploy/nginx/agrienergy.nrep.ug.conf.example`, `api.env.prod.example` |

Jenkins never pushes, so nothing it does can reach UAT.

---

## What is on the VM

The VM also serves **other sites**. Production adds only isolated pieces:

| Piece | Where |
|---|---|
| App tree | `/var/www/agrienergy-prod/` (owner `agrienergy`) |
| PHP-FPM pool | `/etc/php/8.3/fpm/pool.d/agrienergy.conf` → `/run/php/agrienergy.sock` |
| Database | PostgreSQL 16, db `agrienergy_desk`, role `agrienergy`, localhost only |
| Jenkins | `http://45.136.71.160:8081`, Java 21, `-Xmx768m`, job `agrienergy-production` |
| Release script | `/opt/agrienergy/bin/release-prod.sh` (root-owned) |
| sudo rules | `/etc/sudoers.d/agrienergy-jenkins` |
| nginx vhost | `/etc/nginx/sites-available/agrienergy.nrep.ug` (from the `.conf.example`; backups in `/root/nginx-backups/`) |

**MariaDB is not used.** The app requires PostgreSQL (`jsonb` columns, `ilike`,
`tsvector` full-text search), so PostgreSQL 16 runs alongside it.

No queue worker and no cron are needed: nothing is queued and nothing is scheduled.

```
/var/www/agrienergy-prod/
├── releases/<build#>/       contents of api/ incl. vendor/ and public/static/
├── shared/.env              600 — the only copy
├── shared/storage/          uploads (app/public), private disk (app/private), logs
├── backups/<build#>-*.dump  pg_dump taken before every migrate (last 10)
└── current -> releases/<build#>        nginx root = current/public
```

### Laravel dependencies
- **Already on the VM:** PHP 8.3 CLI + FPM + OPcache, Composer 2.7.
- **Installed by `provision-prod.sh`:** `php8.3-pgsql`, `mbstring`, `xml`, `curl`,
  `zip`, `gd`, `bcmath`, `intl`, plus PostgreSQL 16 and `rsync`/`unzip`/`git`.
  `ctype`, `fileinfo`, `tokenizer` and `openssl` come with PHP's base packages.
- **Build only:** Node 20 via nvm for the `jenkins` user (`build-static.sh` sources nvm).
- **Composer packages** (laravel 11, sanctum, spatie permission + activitylog,
  scramble, tinker) need no further system libraries.

Check with: `php -m | grep -E 'pgsql|mbstring|xml|curl|zip|gd|bcmath|intl'`

---

## Users and permissions

| User | Can | Cannot |
|---|---|---|
| `agrienergy` (system, no shell) | own the app tree, run the FPM pool, run releases, `systemctl reload php8.3-fpm` | log in, anything else as root |
| `jenkins` | build in its workspace, run `/opt/agrienergy/bin/release-prod.sh` **as agrienergy** | write to the app tree, read `.env`, any other sudo |
| `www-data` (nginx) | read `current/public` (group `agrienergy`) | write anywhere in the tree, read `storage/app/private` |

Why the release script is a **root-owned copy** and not the one in the
workspace: the workspace is whatever was last pushed to `production`. If sudo
ran that file, anyone with push access would run arbitrary code as
`agrienergy`. So updating it is a deliberate step:

```bash
sudo install -o root -g root -m 755 deploy/scripts/release-prod.sh /opt/agrienergy/bin/
```

---

## First deploy

Two scripts, run once as root on the VM. Both check what is already done,
so if one stops partway, fix the cause and run it again.

### 0 — Before anything (your machine / GitHub / DNS)
- **Rotate the GitHub tokens** in the local `.git/config` remote URLs. Both
  PATs are in plain text there. Use SSH remotes instead.
- Push the deploy files and create the branch: `git push origin1 main` then
  `git push origin1 main:production`.
- DNS: an `A` record `agrienergy.nrep.ug → 45.136.71.160`.
- If the hosting provider has its own firewall, allow **80, 443 and 8081/tcp**.

### 1 — `provision-prod.sh`: packages, users, folders
```bash
sudo -i
git clone https://github.com/National-Renewable-Energy-Platform/NREP-Energy-Desk.git /root/agrienergy-src
cd /root/agrienergy-src && git checkout production
DB_PASS='<strong-password>' bash deploy/scripts/provision-prod.sh
```
Installs swap, PostgreSQL 16, the PHP extensions, Jenkins on `0.0.0.0:8081`
(set `JENKINS_LISTEN=127.0.0.1` to keep it private) and nvm + Node 20. Creates the
`agrienergy` user, the app tree, the FPM pool, the sudo rules and the root-owned
release script, and writes `shared/.env` from the template.

### 2 — Fill in `.env`
```bash
nano /var/www/agrienergy-prod/shared/.env
echo "base64:$(openssl rand -base64 32)"     # → APP_KEY
```
`DB_PASSWORD` is the `DB_PASS` from step 1. If SMTP is not issued yet, set
`MAIL_MAILER=log` and blank the mail `CHANGE_ME`s. Nothing proceeds while a
`CHANGE_ME` remains.

### 3 — `setup-prod.sh`: nginx, TLS, Jenkins, first build, admin, backups
```bash
cd /root/agrienergy-src
bash deploy/scripts/setup-prod.sh
```
It asks everything up front: the certbot email, the Jenkins admin user and
password, and the first platform admin's email and password. Then it runs
unattended, except for one pause where it prints a **deploy key to add on GitHub**
(*NREP-Energy-Desk → Settings → Deploy keys*, write access off). It carries on
once it can read the `production` branch with that key.

1. **nginx + TLS.** Refuses if DNS is wrong, if another config already claims the
   domain, or if `nginx -t` already fails. Issues the certificate through a
   temporary port-80 vhost, then installs
   [agrienergy.nrep.ug.conf.example](nginx/agrienergy.nrep.ug.conf.example) as the
   real vhost. A vhost that fails `nginx -t` is reverted, so the other sites stay
   up. Renewal is the certbot snap's timer, with a reload hook.
2. **Jenkins without the wizard.** Installs the plugins (Pipeline, Git, SSH
   Credentials, Credentials Binding, Timestamper, Workspace Cleanup). Then
   [agrienergy-bootstrap.groovy](jenkins/agrienergy-bootstrap.groovy) runs once at
   startup and creates the admin (login required, no anonymous access, no agent
   port), the `nrep-deploy-key` credential and the `agrienergy-production` job. It
   then deletes its plain-text inputs: the password file and the private key file.
3. **First build.** Triggers it and waits. If it fails, prints the end of the log.
4. **First platform admin.** Runs `RolesAndAdminSeeder` with the credentials passed
   inline, and only if the users table is empty. Inline matters because config is
   cached, so `env()` ignores `.env`; without them the seeder would fall back to the
   public prototype login. The full `db:seed` is never run, because it loads
   fictional data.
5. **Nightly backup.** Writes `.pgpass` and `/etc/cron.d/agrienergy-backup` (02:15
   daily, one dump per weekday), then takes a test dump. Copy dumps off the VM too.

When it finishes:
- **Site:** https://agrienergy.nrep.ug
- **Jenkins:** http://45.136.71.160:8081

> **Jenkins is plain HTTP on a public port.** Use a long, unique admin password
> and add no other users or plugins you don't need. Once a subdomain is
> available, put it behind nginx + TLS and set `JENKINS_LISTEN=127.0.0.1`.

## Day to day

**Deploy:** promote `main` to `production`. Jenkins picks it up within 5 minutes,
or you can click *Build Now*.
```bash
git push origin1 main:production
```

**What a build does** ([Jenkinsfile](../Jenkinsfile) → [release-prod.sh](scripts/release-prod.sh)):
1. Refuses any branch but `production`.
2. `bash deploy/scripts/build-static.sh`: static export, checks the 8 collection shells.
3. `composer install --no-dev --optimize-autoloader` in `api/`.
4. Stages `releases/<build#>`, links `shared/.env` + `shared/storage`, checks `.env`.
5. `pg_dump`, then `migrate --force`, `resources:secure-restricted`,
   `permission:cache-reset`, `storage:link`, config/route/view/event caches.
6. Atomic switch of `current`, then a graceful `php-fpm` reload.
7. Smoke tests through the real vhost (`curl --resolve …:127.0.0.1`): `/up`, API,
   home, admin login, 404s, and one record page per collection must not be
   Next's error page.
8. **Smoke tests fail → `current` flips back** to the previous release. Keeps the last 5 releases.

A failure at steps 1–5 never touches the live site.

**Roll back:** *Build with Parameters* → `ROLLBACK_TO=<build#>` (see `ls /var/www/agrienergy-prod/releases`).
This switches **code only**. Migrations stay applied. If a migration was the
problem, restore its dump:
```bash
sudo -u agrienergy pg_restore --clean --if-exists -h 127.0.0.1 -U agrienergy \
  -d agrienergy_desk /var/www/agrienergy-prod/backups/<build#>-*.dump
```

**Content changes need nothing.** The export carries no records, so publishing
in the admin is live on the next page load.

---

## Operations

```bash
readlink /var/www/agrienergy-prod/current                     # live release
tail -f /var/log/nginx/agrienergy-prod.error.log
tail -f /var/www/agrienergy-prod/shared/storage/logs/laravel-*.log
journalctl -u jenkins -f
curl -sI https://agrienergy.nrep.ug/up
# after a hand edit of shared/.env:
cd /var/www/agrienergy-prod/current && sudo -u agrienergy php artisan config:cache && sudo systemctl reload php8.3-fpm
```

| Symptom | Cause | Fix |
|---|---|---|
| Build fails at checkout | deploy key removed on GitHub | re-add `nrep-deploy-key`'s public key, or rotate it in Jenkins → Credentials |
| `sudo: a password is required` | sudoers not installed | `visudo -cf /etc/sudoers.d/agrienergy-jenkins`; re-run provision |
| `nvm not found` | nvm missing for jenkins | re-run provision |
| `next build` killed | memory | `swapon --show` lists `/swapfile` |
| `pg_dump failed` | DB_* in `.env` wrong, or quotes/comments on the line | keep `KEY=value` plain |
| 502 on every page | pool down / wrong socket | `systemctl status php8.3-fpm`; vhost `fastcgi_pass` |
| Old code after a switch | `$document_root` in vhost | use `$realpath_root` |
| Uploaded images 404 | storage link | `ls -l current/public/storage`; nginx needs group `agrienergy` → `systemctl reload nginx` |
| Jenkins not reachable on :8081 | provider firewall | allow 8081/tcp in the hosting panel; `ss -lntp \| grep 8081` shows `0.0.0.0` |
