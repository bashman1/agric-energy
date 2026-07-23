# Technical Documentation

**Deliverable:** ToR Deliverable 10 — Source code documentation, API documentation and
system architecture documentation

---

## 1. System architecture

### 1.1 Topology

```
                    ┌───────────────────────────────┐
   Browser ────────▶│  Web server (nginx)           │
                    │  TLS termination, static files │
                    └────────────┬──────────────────┘
                        ┌────────┴────────┐
                        ▼                 ▼
          ┌───────────────────┐   ┌────────────────────┐
          │ Next.js 16 (Node) │   │ PHP-FPM (Laravel)  │
          │ UI/ — port 3000   │──▶│ api/ — port 8000   │
          │ SSR + admin/API   │   │ REST /api/v1       │
          │ route handlers    │   └─────────┬──────────┘
          └───────────────────┘             │
                                            ▼
                                  ┌────────────────────┐
                                  │ PostgreSQL 14+     │
                                  └────────────────────┘
                                  ┌────────────────────┐
                                  │ storage/app/public │  uploaded media
                                  └────────────────────┘
```

### 1.2 Why two tiers

The API is the system of record and the only component that touches the database. Every
authorisation decision is made there. The Next.js tier renders HTML, holds the browser
session, and proxies privileged calls server-side so that API tokens never reach client
JavaScript. This split is what makes the platform integrable: any future client — a
mobile app, a GIS tool, another government system — consumes the same API with the same
guarantees.

### 1.3 Request paths

**Public page.** Browser → Next.js server component → `lib/data/*` → `apiGet` → Laravel →
PostgreSQL. HTML is returned fully rendered; no data fetching happens in the browser.

**Privileged action.** Browser → Next.js route handler under `UI/app/api/**` →
`requireAdminSession()` reads the encrypted cookie → attaches the Sanctum bearer token →
Laravel authorises and acts. The token is never serialised into HTML.

**Direct API consumer.** Client → `Authorization: Bearer <token>` → Laravel. Same
authorisation path as the web client.

---

## 2. Backend (`api/`)

### 2.1 Layout

```
api/
├── app/
│   ├── Http/Controllers/Api/V1/   one controller per resource
│   ├── Models/                    Eloquent models
│   │   └── Concerns/Publishable   shared workflow + activity logging
│   ├── Policies/ContentPolicy     content authorisation
│   └── Providers/AppServiceProvider  gate definitions
├── database/
│   ├── migrations/                schema (source of truth)
│   └── seeders/                   RolesAndAdminSeeder, LegacyJsonSeeder
├── routes/api.php                 all /api/v1 routes
└── tests/Feature/                 end-to-end API tests
```

### 2.2 Key abstractions

**`Publishable` trait** (`app/Models/Concerns/Publishable.php`) — mixed into every content
model. Provides the workflow status constants, the `published`, `featured` and
`pendingReview` query scopes, the `author` relation, and activity-log configuration. Adding
a new content type means creating a migration, a model that uses this trait, and a
controller; the workflow, audit trail and reporting pick it up automatically.

**Authorisation gates** (`app/Providers/AppServiceProvider.php`):

| Gate | Grants |
|---|---|
| `viewAny` | `editor`, `reviewer` — read analytics and reports |
| `manage` | `editor` and above — write content, taxonomy, site configuration |
| `manage-users` | `super-admin` only — user administration and the audit trail |

**Workflow enforcement.** Partner-originated writes are normalised server-side to
`published = false`, `workflow_status = 'pending'` before persistence, regardless of the
submitted payload. This is a security control, not a UI convenience.

**Audit logging.** `spatie/laravel-activitylog` records the actor, subject, event and
changed attributes for every content mutation. The log is insert-only.

### 2.3 Adding a content type

1. Migration creating the table with the shared content columns.
2. Model using `Publishable`, with `$guarded = ['id']` and any `$casts`.
3. Controller in `app/Http/Controllers/Api/V1/` following the existing index/show/store/
   update/destroy shape.
4. Register the routes in `routes/api.php` (the content loop covers the standard verbs).
5. Add the type to `ReportController::CONTENT` so it appears in reports.
6. Add a feature test.

---

## 3. Frontend (`UI/`)

### 3.1 Layout

```
UI/
├── app/
│   ├── (public pages)/            projects, technologies, themes, partners,
│   │                              resources, news, events, opportunities,
│   │                              tenders, map, data, search, about, contact
│   ├── admin/                     admin portal (server components)
│   ├── partner/                   partner self-service portal
│   └── api/                       route handlers — privileged proxying, exports
├── components/
│   ├── public/                    site chrome and public UI
│   ├── admin/                     admin tables, forms, sidebar
│   └── shared/                    icons, badges, motion, empty states
├── lib/
│   ├── api/client.ts              the single fetch wrapper for the REST API
│   ├── data/*.ts                  one service module per resource
│   ├── auth/session.ts            iron-session helpers
│   ├── export/                    PDF and Excel document generation
│   └── types/index.ts             shared TypeScript models
└── messages/                      en, fr, sw translation catalogues
```

### 3.2 Data access

`lib/api/client.ts` is the only place that knows the API base URL and the envelope shape.
`apiGet` returns the response's `data` field, or a caller-supplied fallback on any error,
so a backend hiccup degrades a page rather than crashing it. Every `lib/data/*.ts` module
is a thin, typed wrapper over it.

### 3.3 Authentication in the browser tier

`lib/auth/session.ts` wraps `iron-session`. The cookie is encrypted, HTTP-only,
`sameSite=lax`, `secure` in production, and expires after 8 hours. It carries the Sanctum
token and the user's roles. `requireAdminSession()` throws `Unauthorized` when absent;
route handlers translate that into a 401.

### 3.4 Export subsystem (`lib/export/`)

A renderer-agnostic document model shared by record factsheets and administrative reports:

| Module | Responsibility |
|---|---|
| `document.ts` | The `DetailDocument` model — field grids, prose, lists, tables — plus formatting helpers |
| `builders.ts` | One builder per public record type, mirroring what each detail page shows |
| `reports.ts` | Maps an administrative report onto the same model |
| `pdf.ts` | Renders to A4 PDF (jsPDF); switches to landscape when a table exceeds six columns |
| `xlsx.ts` | Renders to a styled single-sheet workbook (ExcelJS) |

Both renderers run server-side only, so neither library is shipped to the browser.

---

## 4. API reference

Base URL: `/api/v1`. Interactive OpenAPI documentation is generated by
`dedoc/scramble` and served at `/docs/api`.

**Conventions.** Successful responses wrap the payload in `{"data": …}`. Authentication is
`Authorization: Bearer <token>`. Content records are addressed by slug. Validation errors
return `422` with per-field messages; authorisation failures return `403`; missing
authentication returns `401`.

### 4.1 Public endpoints (no authentication)

| Method | Path | Purpose |
|---|---|---|
| GET | `/{entity}` | List published records. `{entity}` ∈ projects, technologies, themes, partners, resources, posts, events, opportunities, policies |
| GET | `/{entity}/{slug}` | Single published record |
| GET | `/search?q=` | Ranked search across all published content |
| GET | `/search/suggest?q=` | Type-ahead suggestions (min. 2 characters) |
| GET | `/taxonomy` | Controlled vocabularies |
| GET | `/site-config` | Homepage and site configuration |
| GET | `/open-data/regions` | Per-region project counts, budgets, beneficiaries |
| GET | `/open-data/projects.csv` | Published projects as CSV |
| GET | `/open-data/projects.geojson` | Geolocated published projects as GeoJSON |
| POST | `/submissions` | Submit a public enquiry |
| POST | `/newsletter/subscribe` | Newsletter sign-up (double opt-in) |
| GET | `/newsletter/confirm/{token}` | Confirm a subscription |
| GET | `/newsletter/unsubscribe/{token}` | Unsubscribe |
| POST | `/auth/register` | Partner self-registration |
| POST | `/auth/login` | Obtain a bearer token |
| GET | `/auth/verify-email/{id}/{hash}` | Email verification |

### 4.2 Authenticated endpoints

| Method | Path | Required role |
|---|---|---|
| GET | `/auth/me` | any |
| POST | `/auth/logout` | any |
| GET | `/my/content` | `partner` and above — own submissions |
| POST | `/{entity}` | `partner` and above (partner writes forced to pending) |
| PUT / DELETE | `/{entity}/{slug}` | `editor` and above |
| POST | `/media` | `partner` and above |
| GET | `/review/queue` | `reviewer` and above |
| POST | `/{type}/{slug}/submit\|approve\|reject` | `reviewer` and above |
| GET | `/submissions`, `/submissions/{id}` | `editor` and above |
| PATCH / DELETE | `/submissions/{id}` | `editor` and above |
| PUT | `/taxonomy`, `/site-config` | `editor` and above |
| GET | `/analytics/overview` | `viewAny` (editor, reviewer) |
| GET | `/analytics/export/{type}` | `viewAny` |
| GET | `/reports` | `viewAny` |
| GET | `/reports/{report}?from=&to=` | `viewAny` |
| GET | `/newsletter/subscribers`, `/newsletter/export` | `editor` and above |
| GET | `/users` | `super-admin` |
| POST | `/users/{user}/approve`, `/users/{user}/suspend` | `super-admin` |
| PUT | `/users/{user}/roles` | `super-admin` |
| GET | `/audit` | `super-admin` |

### 4.3 Reporting endpoints

`GET /api/v1/reports` returns the report catalogue. `GET /api/v1/reports/{report}` returns
a report document:

```json
{
  "data": {
    "key": "project-portfolio",
    "title": "Project Portfolio Report",
    "description": "…",
    "period": { "from": "2025-08-01", "to": "2026-07-22", "label": "1 Aug 2025 – 22 Jul 2026" },
    "generatedAt": "2026-07-22T14:26:00Z",
    "summary": [{ "label": "Published projects", "value": 12 }],
    "sections": [
      {
        "heading": "Projects by region",
        "kind": "table",
        "chart": true,
        "columns": ["Region", "Projects"],
        "rows": [["Northern Uganda", 4]],
        "note": "optional caption"
      }
    ]
  }
}
```

Query parameters `from` and `to` are ISO dates; both are optional and default to a rolling
12-month window ending today. Invalid dates return `422`.

Available reports: `platform-overview`, `content-inventory`, `content-growth`,
`content-utilisation`, `user-engagement`, `project-portfolio`, `stakeholder-directory`,
`opportunities-events`.

### 4.4 Document export endpoints (Next.js tier)

| Method | Path | Access |
|---|---|---|
| GET | `/api/export/{type}/{slug}?format=pdf\|xlsx` | Public — published records only |
| GET | `/api/admin/reports/{report}?format=pdf\|xlsx&from=&to=` | Staff session required |

---

## 5. Configuration

### 5.1 Backend (`api/.env`)

| Key | Purpose |
|---|---|
| `APP_KEY` | Laravel encryption key — generate once per environment |
| `APP_ENV`, `APP_DEBUG` | `production` / `false` outside development |
| `APP_URL` | Public API URL |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection |
| `MAIL_*` | Outbound mail for verification, newsletter and enquiry notifications |
| `SANCTUM_STATEFUL_DOMAINS` | Front-end origin |

### 5.2 Frontend (`UI/.env.local`)

| Key | Purpose |
|---|---|
| `API_URL` | Base URL of the REST API, e.g. `https://api.example.org/api/v1` |
| `SESSION_SECRET` | ≥ 32-character secret encrypting the session cookie |

Neither file is committed. `.env.example` documents required keys.

---

## 6. Local development

```bash
# Backend
cd api
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve --port=8000

# Frontend (Node 20+)
cd UI
npm install
npm run dev            # http://localhost:3000
```

Quality gates:

```bash
cd api && php artisan test          # 36 feature/unit tests
cd UI  && npx tsc --noEmit          # type check
cd UI  && npx eslint .              # lint, including accessibility rules
cd UI  && npm run build             # production build
```

---

## 7. Coding standards

- **PHP** — PSR-12, Laravel conventions; controllers stay thin, authorisation is explicit
  at the top of each action.
- **TypeScript** — strict mode; no `any` in application code; shared models in
  `lib/types`.
- **Comments** explain intent and non-obvious constraints, not mechanics.
- **Tests** accompany behaviour that carries a guarantee — access control, workflow
  enforcement, data scoping.
