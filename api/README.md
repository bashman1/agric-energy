# Agri-Energy Desk — API (Laravel 11)

REST backend for the Agri-Energy Desk. PostgreSQL + Eloquent, Sanctum token auth,
spatie RBAC + activity-log audit, editorial approval workflow, ranked full-text
search, analytics/reporting, and media uploads.

See the repository root `README.md` for the full-stack overview and quick start.

## Setup

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed      # schema + roles + admin + imports ../UI/data JSON
php artisan storage:link
php artisan serve --port=8000
```

## API surface (`/api/v1`)

| Area | Endpoints |
|---|---|
| Auth | `POST auth/register` (partner, → pending), `POST auth/login`, `POST auth/logout`, `GET auth/me`, `GET auth/verify-email/{id}/{hash}` |
| Content (read public / write staff+partner) | `GET|POST projects` · `GET|PUT|DELETE projects/{slug}` — same for `technologies, themes, partners, resources, events, opportunities, policies, posts` |
| Workflow | `GET review/queue`, `POST {type}/{slug}/submit|approve|reject` |
| Users (super-admin) | `GET users`, `POST users/{id}/approve|suspend`, `PUT users/{id}/roles` |
| Partner self-service | `GET my/content`, `POST media` |
| Search | `GET search?q=&type=` (ranked, faceted) |
| Analytics (staff) | `GET analytics/overview`, `GET analytics/export/{type}` (CSV) |
| Audit (super-admin) | `GET audit` |
| Config | `GET|PUT site-config`, `GET|PUT taxonomy`, `submissions` |

Interactive OpenAPI docs: **`/docs/api`** (JSON at `/docs/api.json`).

## Roles & workflow

Roles: `super-admin`, `editor`, `reviewer`, `partner`. Authorization lives in
`app/Policies/ContentPolicy.php` (+ gates in `app/Providers/AppServiceProvider.php`).
Content models use the `App\Models\Concerns\Publishable` trait (workflow states +
scopes + activity logging). Partner submissions are forced to `pending`; only
`?admin=true` requests from staff (resolved via the sanctum guard) see drafts.

## Tests

```bash
# one-time: CREATE DATABASE agrienergy_test OWNER agrienergy;
php artisan test
```

Feature tests (`tests/Feature/PlatformTest.php`) cover public read scoping, partner
onboarding/approval, RBAC, the approval workflow + audit, draft visibility, ranked
search, and analytics authorization. They run against the `agrienergy_test`
PostgreSQL database configured in `phpunit.xml`.

## Data import

`database/seeders/LegacyJsonSeeder.php` imports the prototype's flat-JSON content
from `LEGACY_DATA_DIR` (default `../UI/data`), converting string-ID arrays into
pivot rows. It is idempotent (matches by slug) and safe to re-run.

## Security

`ForceJsonResponse` + `SecurityHeaders` middleware are prepended to the API group;
login/register/media are rate-limited; passwords are hashed (bcrypt); CORS is
restricted to `FRONTEND_URLS`. For production set `APP_DEBUG=false`,
`APP_ENV=production`, HTTPS, and a real mail + object-storage driver.
