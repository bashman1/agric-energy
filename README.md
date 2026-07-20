# Agri-Energy Desk

A national knowledge-management and collaboration platform for Uganda's Productive
Use of Renewable Energy (PURE) in agriculture, delivered for the National Renewable
Energy Platform (NREP).

The platform is a **two-tier application**:

```
┌──────────────────────────────┐     REST /api/v1 (JSON)     ┌──────────────────────────────┐
│  UI/ — Next.js 16 frontend    │ ─────────────────────────▶ │  api/ — Laravel 11 backend    │
│  • Public site + GIS + search │ ◀───────────────────────── │  • PostgreSQL + Eloquent      │
│  • Admin portal               │   Sanctum token auth       │  • Sanctum auth + RBAC        │
│  • Partner self-service portal │                            │  • Approval workflow + audit  │
└──────────────────────────────┘                            │  • Search, analytics, uploads │
                                                             └──────────────────────────────┘
```

## Modules (per the Terms of Reference)

- **Public site** — homepage, project directory, technology catalogue, thematic hub,
  stakeholder/partner directory, knowledge repository (resources), GIS map, ranked
  search, events & learning hub, funding & investment opportunities.
- **Admin portal** — content CRUD for all types, editorial **review queue**
  (approve/reject), **user management** (approve partners, assign roles),
  **analytics & reporting** dashboard with CSV export, site configuration, contact inbox.
- **Partner portal** — self-registration (admin-approved), dashboard, and content
  submission that enters an approval workflow before publishing.

## Roles

`super-admin` · `editor` · `reviewer` · `partner` (contributor) · public.
Partner-submitted content is always created as `pending` and must be approved by a
reviewer/editor before it is published. Every mutation is recorded in an audit log.

## Quick start (local development)

Prerequisites: PHP 8.2+, Composer, PostgreSQL 14+, Node 20+.

### 1. Database

```bash
sudo -u postgres psql -c "CREATE ROLE agrienergy LOGIN PASSWORD 'agrienergy';"
sudo -u postgres psql -c "CREATE DATABASE agrienergy_desk OWNER agrienergy;"
```

### 2. Backend (`api/`)

```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed        # creates schema, roles, admin, imports UI/data JSON
php artisan storage:link          # for media uploads
php artisan serve --port=8000
```

API docs (OpenAPI): http://localhost:8000/docs/api
Default admin: `admin@agrienergy.go.ug` / `agrienergy2026`

### 3. Frontend (`UI/`)

```bash
cd UI
npm install
cp .env.example .env.local         # set API_URL=http://127.0.0.1:8000/api/v1
npm run dev                        # http://localhost:3000  (requires Node 20+)
```

## Testing

```bash
cd api && php artisan test         # feature tests (auth, RBAC, workflow, search, analytics)
cd UI && npx tsc --noEmit          # frontend type check
```

The backend tests use a dedicated `agrienergy_test` PostgreSQL database (configured
in `api/phpunit.xml`); create it once with
`CREATE DATABASE agrienergy_test OWNER agrienergy;`.

## Deployment notes

- **Backend**: containerize `api/`; provision managed PostgreSQL and S3-compatible
  object storage (set `FILESYSTEM_DISK=s3` + AWS_* for media). Run migrations on
  release; `php artisan config:cache route:cache`. Serve behind HTTPS; set
  `APP_ENV=production`, `APP_DEBUG=false`, restrict `FRONTEND_URLS`.
- **Frontend**: `npm run build && npm start`, or deploy to any Node 20 host / Vercel;
  set `API_URL` to the backend's public URL.
- Automated backups of PostgreSQL + object storage; monitoring/log aggregation.

## Repository layout

| Path | What |
|---|---|
| `api/` | Laravel 11 REST API, PostgreSQL, auth/RBAC, workflow, search, analytics |
| `api/app/Http/Controllers/Api/V1/` | Versioned API controllers |
| `api/database/seeders/LegacyJsonSeeder.php` | Imports the prototype's `UI/data` JSON |
| `UI/` | Next.js 16 frontend (public + admin + partner) |
| `UI/lib/data/` | Service functions that call the API (stable signatures) |
| `UI/lib/api/client.ts` | Server-side API client |

See `api/README.md` for backend detail.
