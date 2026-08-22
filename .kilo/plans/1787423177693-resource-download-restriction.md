# Plan: Add file-download restriction for resources

## Goal
Allow partners and admins to mark a resource attachment as **read-only** (viewable but not downloadable) or **read-and-download** (current default behavior).

## Current state
- `resources` table has `file_url` (attachment URL) and `external_url` (link to online version).
- Resource detail page (`UI/app/resources/[slug]/page.tsx`) shows a "Download Resource" button whenever `fileUrl` is non-empty.
- No per-resource download restriction exists.
- Partner submission form and admin edit form both use generic field-rendering from schemas.

## Design

### Data model
Add a single boolean column `file_downloadable` to the `resources` table (default `true`).

- `true` = current behavior (download allowed).
- `false` = hide the explicit download button; the file is still visible through an embedded viewer or a "View" link that opens in a new tab.

### Backend changes (Laravel)

1. **Migration** — `api/database/migrations/<timestamp>_add_file_downloadable_to_resources.php`
   - Add `file_downloadable` boolean (default `true`, nullable) to `resources`.

2. **Model** — `api/app/Models/Resource.php`
   - Add `'file_downloadable' => 'boolean'` to `$casts`.

3. **Controller** — `api/app/Http/Controllers/Api/V1/ResourceController.php`
   - Add `'fileDownloadable' => 'file_downloadable'` to the `$map` in `inboundAttributes()`.

4. **API Resource** — `api/app/Http/Resources/ResourceResource.php`
   - Add `'fileDownloadable' => (bool) $this->file_downloadable` to `toArray()`.

### Frontend changes (Next.js)

1. **TypeScript type** — `UI/lib/types/index.ts`
   - Add `fileDownloadable?: boolean` (default `true`) to the `Resource` interface.

2. **Admin form schema** — `UI/components/admin/contentSchemas.ts`
   - Add a checkbox field `{ key: "fileDownloadable", label: "Allow download", type: "checkbox", help: "Uncheck to make this file view-only (no download button)." }` to the `resources` module fields.

3. **Partner submission schema** — `UI/app/partner/submit/[type]/schemas.ts`
   - Add the same checkbox field to the `resources` schema.

4. **Resource detail page** — `UI/app/resources/[slug]/page.tsx`
   - Condition the download button on `resource.fileDownloadable !== false`.
   - When `fileDownloadable` is `false`, render a "View Resource" button that opens `resource.fileUrl` in a new tab (`target="_blank"`) without download-promoting styling. Keep `externalUrl` unchanged (always allowed).

### Forms behavior
- `AdminContentForm.tsx` and `SubmitForm.tsx` already render `checkbox` fields generically; the new schema entries will appear automatically without further code changes.

### Edge cases
- If `fileUrl` is empty, no download/view button appears regardless of `fileDownloadable`.
- `externalUrl` is always shown when present (it is an external link, not a controlled attachment).
- Existing resources without `file_downloadable` column will be `NULL` after migration; treat `NULL` as `true` (downloadable) in frontend and backend.

## Validation
- Run existing test suite / lint checks after changes.
- Manually verify:
  1. Admin can create a resource with "Allow download" unchecked → detail page shows "View Resource" instead of "Download Resource".
  2. Partner can submit a resource with the same setting.
  3. Existing resources (no flag set) still show the download button.
