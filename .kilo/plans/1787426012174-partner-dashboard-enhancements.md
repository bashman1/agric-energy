# Partner Dashboard Enhancements (Requirement 15)

## Context

The partner self-service portal lets partners submit content via
`UI/app/partner/submit/[type]/`. Fields are declared in
`UI/app/partner/submit/[type]/schemas.ts` and rendered generically by
`UI/app/partner/submit/[type]/SubmitForm.tsx`, which only supports
`text | textarea | date | checkbox | upload-image | upload-document`.

Compared with the admin editor (`UI/components/admin/AdminProjectForm.tsx`), the
partner forms are missing many fields, render `region`/`district` as free text
(not dropdowns), and have no way to (a) pick technologies from the registered
catalogue, (b) tag collaborative/funding partners to notify, or (c) capture
structured operational notes. There is **no partner notification system** at all
(only email verification + a TODO in `SubmissionController`).

This plan closes requirement 15 across five sub-items (i–v).

### Decisions confirmed with user
- **(i) Themes** → partners get a *Thematic Areas* multi-select (registered themes) inside the Project form, **not** a standalone theme submission.
- **(iii) Channels** → **in-app inbox + email**.
- **(iii) Target/scope** → one or more designated partners, notified **on publish** (post-approval).
- **(v) Op notes** → structured fields on the **Technology** submission form, stored in `technologies.operational_notes` (jsonb).

---

## Backend changes (Laravel `api/`)

### 1. New column: `projects.notify_partner_ids` (jsonb)
- Migration `…_add_notify_partner_ids_to_projects` (`$table->jsonb('notify_partner_ids')->nullable()`), with `down()`.
- `Project` model: add `'notify_partner_ids' => 'array'` to `$casts`.
- `ProjectController::inboundAttributes()` add `'notifyPartnerIds' => 'notify_partner_ids'`.
- `ProjectResource`: expose `'notifyPartnerIds' => $this->notify_partner_ids ?? []`.

### 2. Notification subsystem
- Migration for a `notifications` table (Laravel default shape: `id`, `type`, `notifiable_type`, `notifiable_id`, `data` json, `read_at`, timestamps). User model already uses `Notifiable`.
- New notification class `app/Notifications/ContentPublishedNotification.php`:
  - `toDatabase($notifiable)` → `{ type, title, contentType, slug, actor, publishedAt }` (powers the in-app inbox).
  - `toMail($notifiable)` → localized subject/body with a deep link to the published item (reuse existing `config/mail.php`; no new mail service needed).
- `WorkflowController::approve()`: after publishing, resolve `$model->notify_partner_ids` (partner slugs) → for each partner, load its users (`User::where('partner_id', $partner->id)`) and `$user->notify(new ContentPublishedNotification($model))`. Guard: skip if empty; wrap in try/catch so a mail failure never blocks the publish.
- New `NotificationController` (`index` lists `auth()->user()->notifications()` ordered by `created_at`, unread first; `markRead($id)` and `markAllRead`). Gate on `auth:sanctum`.
- `routes/api.php` (inside `auth:sanctum` group): `GET notifications`, `POST notifications/{id}/read`, `POST notifications/read-all`.

### 3. Operational notes (Technology) — already mapped
`TechnologyController` already maps `operationalNotes → operational_notes`. No controller change needed; the frontend will send a structured object (see Frontend §5). Add `'operational_notes' => 'array'` cast if not present on `Technology`.

### 4. Reference data for partner form
Reuse existing endpoints; no new backend work:
- `GET /taxonomy` → `partnerTypes`, `technologyCategories`, `projectStatuses`, `valueChains`.
- `GET /partners?type=<slug>` → partners filtered by type (already supported).
- `GET /technologies`, `GET /themes` → registered catalogues.
- District/region meta is client-side (`fetchDistrictMeta()` in `UI/lib/geo/ugandaGeo.ts`); no endpoint needed.

---

## Frontend changes (`UI/`)

### 5. `schemas.ts` — add field types + parity fields
Extend `FieldType` with `select` and `multiselect`. Add `FieldDef` props:
`options?: {id,label}[]`, `optionsFrom?: 'partners-by-type' | 'technologies' | 'themes' | 'taxonomy:partnerTypes' | 'taxonomy:technologyCategories' | 'taxonomy:projectStatuses' | 'taxonomy:valueChains' | 'regions' | 'districts-by-region'`, `dependsOn?: key` (for district→region), `multiple?: boolean`.

**Project schema** additions (to match `AdminProjectForm` minus privileged `published`/`featured` toggles, which the workflow forces):
- `region` → `select` (`optionsFrom: 'regions'`), `district` → `select` (`optionsFrom: 'districts-by-region'`, `dependsOn: 'region'`).
- `valueChain` → `select` (`optionsFrom: 'taxonomy:valueChains'`).
- `status` → `select` (`optionsFrom: 'taxonomy:projectStatuses'`, default `Active`).
- `fundingPartner` → `select` (`optionsFrom: 'partners-by-type'` free-ish; keep text fallback).
- `implementingPartnerIds` → `multiselect` (`optionsFrom: 'partners-by-type'`).
- `technologyIds` → `multiselect` (`optionsFrom: 'technologies'`). **(iv) Technologies from registered catalogue.**
- `themeIds` → `multiselect` (`optionsFrom: 'themes'`). **(i) Thematic Areas select.**
- `beneficiaryCount`, `budget`, `budgetCurrency`, `startDate`(month), `endDate`(month), `outcomes`, `externalUrl`, plus attachments handled by existing upload.
- `notifyPartnerIds` → `multiselect` (`optionsFrom: 'partners-by-type'`) labelled "Partners to notify on publish (collaborative / funding)". **(iii)**

**Opportunity schema**: add `region`/`district` selects (it has a `region` column). **(ii)**

**Technology schema** additions: `category` → `select` (`taxonomy:technologyCategories`); `applications`, `benefits`, `limitations` textareas; and a structured **Operational notes** group **(v)**:
- `operationalNotes.amountUsed` (text), `operationalNotes.technologyStatus` → `select` (`new` / `existing` / `bought`), `operationalNotes.notes` (textarea). These compose into the `operationalNotes` json sent to `operational_notes`.

**Resources / Events**: add `region`/`district` only where the schema/table supports it (events have `location`, not region — skip; resources skip). Keep parity light; reference `Admin*Form` components for exact admin fields.

### 6. `SubmitForm.tsx` — render selects + arrays
- Support `select`/`multiselect`. For `optionsFrom`, resolve options from props (`referenceData` passed by `page.tsx`) or client fetches (`partners?type=`, `technologies`, `themes`, `taxonomy`, `fetchDistrictMeta`).
- `partners-by-type`: render a two-step control — pick a partner **type** (from `partnerTypes`), then a partner **select** filtered by `?type=`. This directly implements (iii) "select partner type then select a partner".
- `districts-by-region`: district options filtered by the selected `region` value.
- Extend form state to hold `string[]` for multiselect; payload sends `technologyIds`, `themeIds`, `implementingPartnerIds`, `notifyPartnerIds` as string arrays (already accepted by controllers).
- Submit unchanged: `apiSend("POST", type, values)` (Laravel forces `pending`).

### 7. `page.tsx` — inject reference data
Server component already fetches `FIELD_SCHEMAS`. Add: fetch taxonomy, partners (all), technologies, themes once and pass as `referenceData` prop to `SubmitForm`. Mark `generateStaticParams` still valid (schemas are static; options resolve at runtime in the client).

### 8. Partner notification inbox (UI)
- `UI/app/partner/notifications/page.tsx` + client: list notifications (GET `notifications`), show read/unread styling, "Mark read" + "Mark all read" buttons. Deep-link to the published item (`/projects/[slug]`, etc.) using `data.contentType`/`data.slug`.
- `UI/app/partner/PartnerNav.tsx`: add a bell with an unread count (fetch `/notifications`, count `read_at === null`). Link to the notifications page.
- Add `/partner/notifications` to the partner nav and `PartnerShell`/layout routing.

---

## Data-flow summary (notification, item iii)
1. Partner submits Project → selects partner **type** → picks one/more collaborative/funding partners → saved as `notify_partner_ids`.
2. Reviewer approves (`WorkflowController::approve`) → item published.
3. Backend resolves those partner slugs → their users → `ContentPublishedNotification` → database row (inbox) + email.
4. Notified partner sees it in `/partner/notifications` and/or receives an email.

---

## Validation / acceptance
- `php artisan migrate` applies cleanly with `down()` revertible.
- Partner Project form now shows region/district **dropdowns**, technology/theme/implementing-partner **multiselects**, status/value-chain selects, and a "Partners to notify" selector.
- Submitting a Project with a notify target creates it `pending`; after admin approval the target partner's users each get an in-app notification + email, and the item is published.
- Technology form captures structured operational notes (amount used, new/existing/bought, notes) persisted to `operational_notes`.
- `npm run lint` / `tsc` pass in `UI/`; existing tests in `api/tests` still pass (add a feature test: approval dispatches a notification to `notify_partner_ids` users).

## Risks / open questions
- **Email deliverability**: relies on `config/mail.php` being configured in the target environment; notification must not block publish (wrap in try/catch).
- **"any item" scope for region/district (ii)**: applied to types that actually store geography (projects, opportunities). Confirm if resources/events should also get them (they lack the columns).
- **Notify target resolution**: notifies all users of the chosen partner org. Confirm that is the intended recipient set (vs. a single primary contact).
- **Performance**: partner list for the type→partner selector is small; fine without pagination.
- Out of scope: standalone theme submission, SMS, real-time push (inbox is pull/refresh based).
