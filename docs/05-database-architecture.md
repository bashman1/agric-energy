# Database Architecture

**Deliverable:** ToR Deliverable 6 — Database architecture with supporting documentation
**DBMS:** PostgreSQL 14+
**ORM:** Eloquent (Laravel 11)
**Schema source of truth:** `api/database/migrations/`

---

## 1. Design principles

1. **Normalised.** Relationships between content entities are modelled as join tables with
   foreign keys, not as arrays of identifiers. Referential integrity is enforced by the
   database, not by application code.
2. **Uniform content model.** Every publishable entity carries the same editorial columns
   (`featured`, `published`, `workflow_status`, `created_by`, `review_notes`,
   `reviewed_at`, `created_at`, `updated_at`). One workflow implementation therefore
   serves all nine content types, and a tenth can be added without redesigning it.
3. **Slug-addressed.** Every content record has a unique, URL-safe `slug`. Public URLs and
   API paths use the slug; numeric ids never appear in public URLs.
4. **Semi-structured where appropriate.** Genuinely list-shaped attributes with no
   relational meaning (a technology's benefits, a project's beneficiary tags, a gallery)
   are stored as `jsonb` rather than as satellite tables. Anything that is queried,
   filtered or joined is a real column or a real relation.
5. **Indexed for the access patterns that exist.** Every column exposed as a public filter
   carries an index.
6. **Auditable.** All content mutations are written to an append-only activity log.

---

## 2. Logical model

```
                 ┌──────────┐
                 │  users   │──┐ created_by (author)
                 └────┬─────┘  │
     partner_id       │        ├────────────────────────────────┐
          ┌───────────┘        │                                │
          ▼                    ▼                                ▼
    ┌──────────┐         ┌──────────┐  project_technology  ┌────────────┐
    │ partners │◀───────▶│ projects │◀────────────────────▶│technologies│
    └────┬─────┘ partner_└────┬─────┘                      └─────┬──────┘
         │       project      │ project_theme                    │
         │                    ▼                                  │
         │              ┌──────────┐   technology_theme          │
         └─────────────▶│  themes  │◀────────────────────────────┘
       partner_theme    └────┬─────┘
                             │ resource_theme
                             ▼
                       ┌───────────┐  resource_technology
                       │ resources │◀──────────────────── technologies
                       └───────────┘

  Standalone content:  posts · events · opportunities · policies
  Support:  taxonomy_items · site_config · submissions · subscribers · activity_log
  Auth:  users · roles · permissions · model_has_roles · personal_access_tokens
```

---

## 3. Tables

### 3.1 Shared content columns

Present on `projects`, `technologies`, `themes`, `partners`, `resources`, `posts`,
`events`, `opportunities`, `policies`:

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial PK | Internal only |
| `slug` | varchar UNIQUE | Public identifier |
| `featured` | boolean, default false | Promoted on the homepage |
| `published` | boolean, default false | Public visibility switch |
| `workflow_status` | varchar, indexed, default `draft` | `draft`, `pending`, `in_review`, `approved`, `published`, `rejected`, `archived` |
| `created_by` | FK → `users.id`, nullable, ON DELETE SET NULL | Contributing author |
| `review_notes` | text, nullable | Reviewer feedback returned to the contributor |
| `reviewed_at` | timestamp, nullable | When the review decision was taken |
| `created_at`, `updated_at` | timestamps | Drive the growth and utilisation reports |

### 3.2 Content entities

**`projects`** — Agri-Energy initiatives.
`title`, `summary`, `description`, `region`\*, `district`\*, `regions` (jsonb),
`districts` (jsonb), `location_note`, `lat`/`lng` (decimal 10,6), `funding_partner`,
`budget` (decimal 15,2), `budget_currency`, `beneficiary_count` (integer),
`value_chain`\*, `beneficiaries` (jsonb), `status`\*, `start_date`, `end_date`,
`outcomes`, `featured_image`, `gallery` (jsonb), `external_url`.

**`technologies`** — renewable energy technologies for agricultural value chains.
`name`, `category`\*, `summary`, `description`, `applications` (jsonb),
`benefits` (jsonb), `limitations` (jsonb), `operational_notes` (jsonb),
`maintenance_notes` (jsonb).

**`themes`** — thematic areas.
`name`, `icon`, `summary`, `description`, `why_it_matters`.

**`partners`** — stakeholder organisations.
`name`, `type`\*, `summary`, `description`, `website`, `email`, `phone`, `logo`,
`regions` (jsonb), `district_coverage` (jsonb), plus the self-registration profile block:
`category`, `acronym`, `registration_number`, `tax_id`, `year_established`,
`physical_address`, `postal_address`, `mission`, `employees_band`, `branches_band`,
`beneficiaries_band`, `annual_budget_range`, `contact_name`, `contact_position`,
`contact_email`, `contact_phone`, `coverage_scope`, `countries`, `sectors`,
`value_chains`, `expertise`.

**`resources`** — knowledge repository items.
`title`, `type`\*, `summary`, `description`, `file_url`, `external_url`,
`publication_date`.

**`posts`** — newsroom.
`title`, `category`\* (`news`, `story`, `press_release`, `announcement`), `excerpt`,
`body` (longtext), `featured_image`, `gallery` (jsonb), `published_at`.

**`events`** — events and learning hub.
`title`, `type`\* (conference, workshop, webinar, training), `summary`, `description`,
`starts_at`, `ends_at`, `is_online`, `location`, `registration_url`, `featured_image`.

**`opportunities`** — funding, investment, tender and procurement notices.
`title`, `funder`, `opportunity_type`\* (`funding`, `investment`, `tender`,
`procurement`), `summary`, `description`, `amount`, `currency`, `sector`\*,
`value_chain`\*, `region`\*, `deadline` (date), `eligibility`, `external_url`.

**`policies`** — policy and regulatory documents.
`title`, `category`\*, `summary`, `description`, `document_url`, `publication_date`.

\* indexed.

### 3.3 Relationship tables

Composite primary key on both columns; both foreign keys `ON DELETE CASCADE`.

| Table | Links |
|---|---|
| `project_technology` | projects ↔ technologies |
| `project_theme` | projects ↔ themes |
| `partner_project` | partners ↔ projects |
| `partner_technology` | partners ↔ technologies |
| `partner_theme` | partners ↔ themes |
| `resource_technology` | resources ↔ technologies |
| `resource_theme` | resources ↔ themes |
| `technology_theme` | technologies ↔ themes |

### 3.4 Users and access control

**`users`** — `name`, `email` (unique), `password` (bcrypt), `status`\*
(`pending`, `approved`, `suspended`), `account_type` (`individual` or `organisation`),
`organisation`, `phone`, `partner_id` (FK → `partners.id`, ON DELETE SET NULL),
`approved_at`, `email_verified_at`, timestamps.

Roles and permissions use the standard `spatie/laravel-permission` schema: `roles`,
`permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`.
Roles in use: `super-admin`, `editor`, `reviewer`, `partner`.

API tokens are held in `personal_access_tokens` (Laravel Sanctum), hashed at rest and
individually revocable.

### 3.5 Support tables

| Table | Purpose |
|---|---|
| `taxonomy_items` | Controlled vocabularies (`group`, `name`, `slug`, `sort`), unique on (`group`, `slug`) — value chains, project statuses, resource types, partner types, technology categories, beneficiary tags |
| `site_config` | Singleton row: hero content, headline statistics, featured record ids, contact details, about summary |
| `submissions` | Public enquiries. UUID primary key; `submission_type`, `name`, `organisation`, `email`, `subject`, `message`, `status`\* (`new`, `read`, `responded`, `archived`), `email_status`, `admin_notes`, `submitted_at` |
| `subscribers` | Newsletter list with double opt-in: `email` (unique), `name`, a unique 64-character `token` used for both confirmation and unsubscribe links, `confirmed_at`, `unsubscribed_at` |
| `activity_log` | Append-only audit trail (spatie): `log_name`, `description`, `subject_type`/`subject_id`, `causer_type`/`causer_id`, `properties` (jsonb, before/after values), `event`, `batch_uuid`, `created_at` |

Framework tables (`migrations`, `sessions`, `cache`, `cache_locks`, `jobs`,
`job_batches`, `failed_jobs`, `password_reset_tokens`) follow Laravel defaults.

---

## 4. Integrity rules

| Rule | Enforcement |
|---|---|
| Slugs are unique per entity | Unique constraint |
| Deleting a content record removes its relationship rows | `ON DELETE CASCADE` on all pivots |
| Deleting a user does not delete their content | `created_by` and `partner_id` are `ON DELETE SET NULL` |
| A record cannot be published by a partner | Application-level: partner writes force `published = false`, `workflow_status = 'pending'` |
| Taxonomy terms are unique within their group | Unique (`group`, `slug`) |
| Audit records are never updated or deleted by the application | Insert-only usage of `activity_log` |

---

## 5. Indexing

- Unique index on every `slug`, and on `users.email`.
- Secondary indexes on all public filter columns: `projects.region`, `projects.district`,
  `projects.value_chain`, `projects.status`, `technologies.category`, `partners.type`,
  `resources.type`, `events.type`, `opportunities.sector`, `opportunities.value_chain`,
  `opportunities.region`, `opportunities.opportunity_type`, `policies.category`,
  `posts.category`, `users.status`, and `workflow_status` on every content table.
- Composite primary keys on all pivot tables serve as their access index.
- `taxonomy_items` is indexed on `group` and unique on (`group`, `slug`).

**Growth guidance.** If full-text search volume grows beyond the current ranked `LIKE`
implementation, add a PostgreSQL `tsvector` column with a GIN index per content table;
`SearchController` is the only call site that would change.

---

## 6. Backup and recovery

| Item | Procedure |
|---|---|
| Backup method | `pg_dump -Fc` nightly, retained 30 days, plus a monthly retained 12 months |
| Uploaded media | `api/storage/app/public` synchronised to the same backup target |
| Recovery point objective | ≤ 24 hours |
| Recovery time objective | ≤ 4 hours |
| Restore procedure | `pg_restore -c -d agrienergy_desk <dump>`, then `php artisan migrate` to apply any newer migrations, then restore the media directory |
| Verification | Quarterly restore rehearsal into a staging database |

Backup scheduling and credentials are environment-specific — see
[07-deployment-report.md](07-deployment-report.md).

---

## 7. Schema change management

All schema changes are made through Laravel migrations checked into version control.
Never modify a production schema by hand.

```bash
php artisan make:migration describe_the_change
php artisan migrate          # apply
php artisan migrate:rollback # revert the last batch
php artisan migrate:status   # what is applied
```

Every migration implements `down()`, so a release can be reverted.

Seeders:

- `RolesAndAdminSeeder` — creates the four roles and the initial administrator account.
- `LegacyJsonSeeder` — idempotent import of the prototype's JSON content, matched by
  slug; safe to re-run.
