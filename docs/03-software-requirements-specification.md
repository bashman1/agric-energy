# Software Requirements Specification (SRS)

**Project:** Agri-Energy Desk Digital Platform
**Client:** National Renewable Energy Platform (NREP)
**Deliverable:** ToR Deliverable 3 — Software Requirements Specification
**Document status:** As-built specification, reconciled against the delivered source code

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements of the Agri-Energy
Desk, a national digital knowledge-management and collaboration platform for Uganda's
Productive Use of Renewable Energy (PURE) in agriculture. It is the controlling
specification for development, testing and acceptance.

### 1.2 Scope

The Agri-Energy Desk is a public web platform with three audiences:

1. **Public users** — browse and search Agri-Energy information without an account.
2. **Partner contributors** — registered organisations that submit content for review.
3. **NREP staff** — editors, reviewers and administrators who curate, approve and publish
   content and administer the platform.

The system consists of a REST API (`api/`, Laravel 11 + PostgreSQL) and a server-rendered
web client (`UI/`, Next.js 16). All persistence, authorisation and business rules live in
the API; the web client is a consumer of that API and holds no privileged credentials in
the browser.

### 1.3 Definitions

| Term | Meaning |
|---|---|
| Content entity | A publishable record type: project, technology, theme, partner, resource, post, event, opportunity, policy |
| Workflow status | Editorial state of a record: `draft`, `pending`, `in_review`, `approved`, `published`, `rejected`, `archived` |
| Published | `published = true`; the record is visible to unauthenticated users |
| Staff | A user holding `super-admin`, `editor` or `reviewer` |
| Slug | URL-safe unique identifier for a content record |
| PURE | Productive Use of Renewable Energy |

### 1.4 References

- Terms of Reference — *Consultancy Services for the Design, Development, Deployment and Technical Support of the Agri-Energy Desk Digital Platform*, NREP
- OWASP Top 10 (2021) — web application security risks
- WCAG 2.1 Level AA — accessibility guidelines

---

## 2. Overall description

### 2.1 Product perspective

The platform is a new, self-contained system. It is designed as a digital public good:
all content is exposed through a versioned REST API (`/api/v1`) and selected datasets are
published as open data (CSV, GeoJSON), so other national systems can integrate without
bespoke work.

```
┌────────────────────────────┐   REST /api/v1 (JSON)   ┌────────────────────────────┐
│ UI/ — Next.js 16           │ ───────────────────────▶│ api/ — Laravel 11          │
│ • Public site + GIS map    │ ◀───────────────────────│ • PostgreSQL + Eloquent    │
│ • Admin portal             │  Sanctum bearer token   │ • Sanctum auth + RBAC      │
│ • Partner portal           │                         │ • Workflow + audit log     │
└────────────────────────────┘                         │ • Search, analytics, media │
                                                        └────────────────────────────┘
```

### 2.2 User classes

| Class | Authentication | Capabilities |
|---|---|---|
| Public visitor | None | Browse and search published content; download open data and record factsheets; subscribe to the newsletter; submit an enquiry |
| Partner contributor (`partner`) | Self-registration, admin approval required | Everything a public visitor can do, plus submit content that enters the approval workflow, and track their own submissions |
| Reviewer (`reviewer`) | Created by administrator | Review queue: approve or reject submitted content; read analytics and reports |
| Editor (`editor`) | Created by administrator | Full content CRUD across all entities; taxonomy and site configuration; analytics and reports |
| Super administrator (`super-admin`) | Created by administrator/seeder | All of the above, plus user management (approve, suspend, assign roles) and the audit trail |

### 2.3 Operating environment

- **Server:** PHP 8.2+, PostgreSQL 14+, Node.js 20+
- **Client:** current versions of Chrome, Firefox, Safari and Edge on desktop, tablet and
  mobile
- **Network:** designed for constrained bandwidth — server-rendered HTML, no heavyweight
  client bundles on public pages. Page content is present in the initial HTML response; a
  CSS scroll-reveal animation is layered on top of it, with a `<noscript>` rule that
  un-hides content where JavaScript is unavailable and a `prefers-reduced-motion` rule that
  shows it without animation.

### 2.4 Design and implementation constraints

- All authorisation decisions are enforced server-side in the API. The web client's
  session cookie is an encrypted transport for the API token only (`iron-session`,
  HTTP-only), never a source of authority.
- Content structure is uniform: every content entity shares the same workflow columns, so
  new entity types can be added without redesigning the workflow.
- No third-party service is required for core operation.

---

## 3. Functional requirements

Requirement IDs are stable and referenced by the Testing Report.

### 3.1 Public access and content discovery

| ID | Requirement | Implementation |
|---|---|---|
| FR-01 | Unauthenticated users can browse published content of every entity type | `GET /api/v1/{entity}` — public routes; unpublished records excluded |
| FR-02 | Unpublished records are never disclosed to unauthenticated users | `Publishable::scopePublished`; verified by test `public_sees_only_published_content` |
| FR-03 | Each content record has a detail page addressed by slug | `GET /api/v1/{entity}/{slug}`; `UI/app/{entity}/[slug]` |
| FR-04 | A public homepage presents announcements, news, featured projects, publications and navigation | `UI/app/page.tsx`; featured selection from site configuration |
| FR-05 | A knowledge repository lists research reports, manuals, policy documents, case studies and multimedia | `resources` and `policies` entities |
| FR-06 | A searchable project directory lists Agri-Energy initiatives with filters | `UI/app/projects`; filters for region, district, value chain, status, technology, theme |
| FR-07 | A technology catalogue describes renewable energy technologies with applications, benefits, limitations and maintenance notes | `technologies` entity |
| FR-08 | A stakeholder directory profiles organisations by type and coverage | `partners` entity |
| FR-09 | An events and learning hub lists conferences, workshops, webinars and training | `events` entity |
| FR-10 | A funding and investment section lists opportunities, tenders and procurement notices | `opportunities` entity, discriminated by `opportunity_type` |
| FR-11 | A GIS map plots geolocated projects with regional aggregates | `UI/app/map`; `GET /api/v1/open-data/regions`, `projects.geojson` |
| FR-12 | Visitors can download any record's details as a PDF factsheet or Excel workbook | `GET /api/export/{type}/{slug}?format=pdf\|xlsx` |
| FR-13 | Selected datasets are published as open data | `GET /api/v1/open-data/projects.csv`, `projects.geojson`, `regions` |

### 3.2 Search

| ID | Requirement | Implementation |
|---|---|---|
| FR-20 | Users can search across all published content from a single query | `GET /api/v1/search` |
| FR-21 | Results are ranked by relevance, with title matches outranking body matches | `SearchController`; test `search_returns_ranked_results` |
| FR-22 | Search supports filtering by thematic area, technology, organisation, geography, publication type and value chain | Entity list filters + search parameters |
| FR-23 | Type-ahead suggestions are offered from two characters upward, capped in length, excluding drafts | `GET /api/v1/search/suggest`; tests `suggest_ranks_prefix_matches_and_hides_drafts`, `suggest_returns_nothing_below_two_characters`, `suggest_caps_the_result_list` |

### 3.3 Authentication and access control

| ID | Requirement | Implementation |
|---|---|---|
| FR-30 | Users authenticate with email and password and receive a bearer token | `POST /api/v1/auth/login` (Laravel Sanctum) |
| FR-31 | Organisations can self-register for a partner account | `POST /api/v1/auth/register` |
| FR-32 | Self-registered accounts are created `pending` and cannot sign in until approved | Tests `partner_registration_creates_pending_account`, `pending_partner_cannot_login` |
| FR-33 | Access is governed by roles: `super-admin`, `editor`, `reviewer`, `partner` | `spatie/laravel-permission` |
| FR-34 | Non-privileged users cannot reach administrative endpoints | Gates `viewAny`, `manage`, `manage-users`; tests `partner_cannot_manage_users`, `analytics_requires_staff`, `reports_require_staff` |
| FR-35 | Sessions expire; tokens are revocable | 8-hour session cookie; `POST /api/v1/auth/logout` revokes the token |
| FR-36 | Email addresses can be verified | `GET /api/v1/auth/verify-email/{id}/{hash}` |

### 3.4 Content management and editorial workflow

| ID | Requirement | Implementation |
|---|---|---|
| FR-40 | Staff can create, update and delete every content entity | `POST/PUT/DELETE /api/v1/{entity}[/{slug}]`; admin portal forms |
| FR-41 | Partner-submitted content is always created unpublished with status `pending`, regardless of the values requested | Enforced server-side; test `partner_submission_is_forced_pending` |
| FR-42 | A review queue lists all content awaiting approval | `GET /api/v1/review/queue`; `UI/app/admin/review` |
| FR-43 | A reviewer can approve content, which publishes it and records the action | `POST /api/v1/{type}/{slug}/approve`; test `reviewer_approve_publishes_and_audits` |
| FR-44 | A reviewer can reject content with notes returned to the contributor | `POST /api/v1/{type}/{slug}/reject`; `review_notes` |
| FR-45 | Contributors can track the status of their own submissions | `GET /api/v1/my/content` |
| FR-46 | Staff can preview unpublished content | `?admin=true` with a staff token; test `staff_admin_flag_sees_drafts_partner_does_not` |
| FR-47 | Digital resources can be uploaded, categorised and managed | `POST /api/v1/media`; resource records reference the stored file |
| FR-48 | Controlled vocabularies are editable without a code change | `GET/PUT /api/v1/taxonomy` — **API only; no admin editing screen yet** |
| FR-49 | Homepage content, featured records and contact details are configurable | `GET/PUT /api/v1/site-config` — **API only; the admin screen is read-only** |

### 3.5 Stakeholder engagement

| ID | Requirement | Implementation |
|---|---|---|
| FR-50 | Visitors can submit enquiries, which reach an administrative inbox | `POST /api/v1/submissions`; `UI/app/admin/submissions` |
| FR-51 | Enquiries have a lifecycle: `new`, `read`, `responded`, `archived` | `PATCH /api/v1/submissions/{id}` |
| FR-52 | Visitors can subscribe to a newsletter with double opt-in | `POST /api/v1/newsletter/subscribe`, `GET /newsletter/confirm/{token}`; test `newsletter_subscribe_then_confirm_activates_the_subscriber` |
| FR-53 | Subscribers can unsubscribe from a link, and re-subscribing is idempotent | `GET /newsletter/unsubscribe/{token}`; tests `newsletter_unsubscribe_deactivates_the_subscriber`, `duplicate_subscribe_is_idempotent_and_clears_a_previous_unsubscribe` |
| FR-54 | Staff can list and export the subscriber base | `GET /api/v1/newsletter/subscribers`, `/newsletter/export` |

### 3.6 Analytics and reporting

| ID | Requirement | Implementation |
|---|---|---|
| FR-60 | An analytics dashboard summarises content, workflow, users and enquiries | `GET /api/v1/analytics/overview`; `UI/app/admin/analytics` |
| FR-61 | Authorised users can generate administrative reports over a chosen period | `GET /api/v1/reports/{report}?from=&to=`; `UI/app/admin/reports` |
| FR-62 | The reporting module covers platform performance, user engagement and content utilisation | Reports: platform overview, content inventory, content growth & trends, content utilisation, user engagement, project portfolio, stakeholder directory, opportunities & events |
| FR-63 | Every report is downloadable as PDF and Excel | `GET /api/admin/reports/{report}?format=pdf\|xlsx` |
| FR-64 | Report periods default to a rolling 12 months and accept an explicit range | `ReportController::show`; test `period_scopes_counts_and_month_buckets` |
| FR-65 | Full content datasets are exportable as CSV | `GET /api/v1/analytics/export/{type}` |

### 3.7 Audit and accountability

| ID | Requirement | Implementation |
|---|---|---|
| FR-70 | Every create, update and delete of content is recorded with actor, subject and timestamp | `spatie/laravel-activitylog` via the `Publishable` trait |
| FR-71 | Super-administrators can browse and filter the audit trail | `GET /api/v1/audit`; `UI/app/admin/audit` |
| FR-72 | Audit records include the changed attributes | `Activity::changes()` |
| FR-73 | Editorial activity is reportable | Content Utilisation report |

### 3.8 Integration

| ID | Requirement | Implementation |
|---|---|---|
| FR-80 | All platform capabilities are exposed over a versioned REST API | `/api/v1`, 84 registered routes |
| FR-81 | The API is documented and browsable | OpenAPI via `dedoc/scramble` at `/docs/api` |
| FR-82 | Machine-readable open data is available without authentication | `/api/v1/open-data/*` |

---

## 4. Non-functional requirements

| ID | Requirement | Target | How it is met |
|---|---|---|---|
| NFR-01 | Availability | ≥ 99% monthly | Stateless application tier; process supervision; database backups (see Deployment Report) |
| NFR-02 | Page performance | Standard pages render < 2s on a 3G-equivalent connection | Server-side rendering; no blocking client bundles on public pages; indexed queries |
| NFR-03 | Scalability | Handle growth to national scale without architectural redesign | Stateless API behind a load balancer; normalised schema with indexes on every filter column; modular entity structure |
| NFR-04 | Responsiveness | Fully usable on desktop, tablet and mobile | Mobile-first Tailwind layout; every page verified at 360px, 768px and 1440px |
| NFR-05 | Browser compatibility | Current Chrome, Firefox, Safari, Edge | Standards-based rendering; no proprietary APIs |
| NFR-06 | Accessibility | WCAG 2.1 AA as the working target | Semantic landmarks, skip link, focus management, `aria-current`, labelled controls, `eslint-plugin-jsx-a11y` enforced in CI |
| NFR-07 | Security | OWASP Top 10 controls | See §5 |
| NFR-08 | Auditability | Complete trail of content mutations | Activity log on every publishable model |
| NFR-09 | Maintainability | New content type addable without workflow rework | Shared `Publishable` trait and uniform controller structure |
| NFR-10 | Internationalisation | UI strings translatable | `next-intl`; catalogues for English, French and Kiswahili |
| NFR-11 | Backup and recovery | Daily database backup, ≤ 24h RPO | Documented in the Deployment Report |
| NFR-12 | Logging and monitoring | Application and access logs retained | Laravel log channels; web-server access logs |

---

## 5. Security requirements

| ID | Control | Implementation |
|---|---|---|
| SEC-01 | Passwords stored irreversibly | bcrypt via Laravel `Hash` |
| SEC-02 | Token-based API authentication | Laravel Sanctum personal access tokens |
| SEC-03 | Browser session holds no bearer token in JavaScript-readable storage | `iron-session` encrypted HTTP-only cookie; `secure` in production; `sameSite=lax` |
| SEC-04 | Role-based authorisation on every privileged endpoint | Laravel gates and policies, checked in controllers |
| SEC-05 | Injection prevention | Eloquent parameter binding throughout; no string-interpolated SQL |
| SEC-06 | Cross-site scripting prevention | React escapes by default; rich-text input sanitised before storage |
| SEC-07 | Input validation on every write endpoint | Laravel form validation; `UI/lib/utils/validation.ts` for client-side sanitisation |
| SEC-08 | Mass-assignment protection | Guarded models; partner-supplied `published`/`workflow_status` ignored |
| SEC-09 | Upload restrictions | Type and size validation in `MediaController` |
| SEC-10 | Sensitive configuration outside version control | `.env`; `.env.example` documents required keys |
| SEC-11 | Privilege escalation prevention | Role assignment restricted to `super-admin`; test `partner_cannot_manage_users` |
| SEC-12 | Transport security | TLS terminated at the web server; HSTS recommended (Deployment Report) |

---

## 6. Data requirements

The database manages the entities required by the ToR:

- Projects and programmes
- Renewable energy technologies
- Knowledge resources and publications
- Organisations and stakeholder profiles
- Policies and regulatory documents
- Events and training activities
- Funding and investment opportunities
- Registered users and administrative accounts

Full schema, relationships, indexing and integrity rules are specified in
[05-database-architecture.md](05-database-architecture.md).

---

## 7. Future extensibility

The following are explicitly designed for, and not in the current scope:

- **East Africa expansion** — projects carry free-form region/district plus latitude and
  longitude, so geography is not hard-coded to Uganda's administrative units.
- **Investment matchmaking** — opportunities and partner profiles already carry the
  sector, value-chain and coverage attributes such matching would consume.
- **External system integration** — the versioned REST API and open-data endpoints are the
  designed integration surface.
- **Advanced GIS** — map data is served as standard GeoJSON, consumable by any GIS client.

---

## 8. Acceptance criteria

The platform is accepted when:

1. Every FR- and NFR- requirement above is demonstrable in the deployed environment.
2. The automated test suite passes in full (see [06-testing-report.md](06-testing-report.md)).
3. User acceptance testing is signed off by NREP.
4. Administrator training is delivered and documented.
5. All documentation deliverables are submitted and approved.
