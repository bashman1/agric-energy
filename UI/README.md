# Agri-Energy Desk — Frontend (Next.js 16)

Public site + admin portal + partner self-service portal for the Agri-Energy Desk.
Consumes the Laravel REST API in `../api`. See the repository root `README.md` for
the full overview.

## Requirements

**Node 20+** (Next.js 16). Use `nvm use 20` if your system default is older.

## Setup

```bash
npm install
cp .env.example .env.local
# set:  API_URL=http://127.0.0.1:8000/api/v1
npm run dev            # http://localhost:3000
```

The Laravel API must be running (default `http://localhost:8000`).

## Structure

| Path | What |
|---|---|
| `app/` (public) | home, projects, technologies, themes, partners, resources, events, opportunities, map, search, contact |
| `app/admin/` | dashboard, analytics, content CRUD, review queue, users, submissions, site-config |
| `app/partner/` | register, login, dashboard, submit content |
| `app/api/` | thin proxy routes that attach the server-side Sanctum token to admin/partner writes |
| `lib/data/*.ts` | data-service functions calling the API (stable signatures) |
| `lib/api/client.ts` | server-side API client (`apiGet` / `apiSend`) |
| `lib/auth/session.ts` | iron-session cookie holding the Sanctum token + roles |
| `middleware.ts` | guards `/admin` (staff) and `/partner` (authenticated) |
| `components/shared/FileUpload.tsx` | reusable upload widget (→ `/api/media`) |

## Auth model

Login (`/api/auth/login`) authenticates against the Laravel API and stores the
returned Sanctum token + roles in an encrypted, httpOnly iron-session cookie. Admin
and partner write operations go through `app/api/*` proxy routes that read the token
server-side and forward it — the token is never exposed to the browser.

## Type check / build

```bash
npx tsc --noEmit
npm run build
```
