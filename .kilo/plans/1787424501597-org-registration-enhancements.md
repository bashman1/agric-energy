# Plan: Organisation Registration Enhancements

## Scope
All changes target the partner self-registration flow for **organization** accounts only. The individual flow is unaffected.

## Affected Files
- `UI/app/partner/register/RegisterWizard.tsx`
- `UI/app/partner/register/fields.tsx`
- `api/app/Http/Controllers/Api/V1/AuthController.php`
- `api/app/Models/User.php`
- `api/tests/Feature/PlatformTest.php`
- New migration: `api/database/migrations/2026_08_22_XXXXXX_add_username_to_users.php`

---

## Change 1 — `email` becomes the organisation email (i)

**Current:** The form collects `email` (login) and `orgEmail` (organisation). They are separate fields.

**New:** The single `email` field in the "info" step IS the organisation email. The login credentials step reuses the same value.

**Frontend:**
- Remove the `orgEmail` field from the `info` step.
- The `email` field in the `info` step is now the org email (label: "Organisation Email", type: email).
- In `buildBody()`, send `email` as both `email` (login) and `orgEmail` (partner), OR change the backend to use `email` for both.
- In `INITIAL`, remove `orgEmail` and repurpose `email` as the org email during the org flow.

**Backend:**
- In `AuthController::register()`, `email` continues to be the user's login email (stored in `users.email`).
- `createPartnerDraft()` should set `email` on the partner from `$data['email']` (already does via `$data['orgEmail']` — change to use `email`).
- Remove `orgEmail` from validation rules.

---

## Change 2 — Make org info fields required (ii)

Make the following fields **required** in both frontend validation (`validate()` for `"info"` step) and backend validation rules:

| Field | Form key | Backend rule |
|---|---|---|
| Registration Number | `registrationNumber` | `required\|string\|max:255` |
| TIN | `taxId` | `required\|string\|max:255` |
| Physical Address | `physicalAddress` | `required\|string\|max:1000` |
| Sector of Operation | `sectors` | `required\|array\|min:1` |
| Mission | `mission` | `required\|string\|max:2000` |
| Brief Description | `description` | `required\|string\|max:2000` |
| Area of Expertise | `expertise` | `required\|array\|min:1\|max:3` |

Frontend: add `required` prop to `TextField`/`TextArea`/`ComboSelect` and add step validation.

Backend: update `AuthController::register()` validation rules from `nullable` to `required` for these fields when `accountType === 'organization'`.

---

## Change 3 — National / International mutual exclusion (iii)

**Current:** `COVERAGE_SCOPES = ["National", "Regional", "District", "International"]` — all checkboxes, all selectable together.

**New:** Replace the checkbox group with a **radio-pill group** (single-select) for the top-level scope: `National` | `International`.

- When `National` is selected: show `Region(s)` checkboxes (UGANDA_REGIONS) and `District(s)` comboselect (lazy-loaded via `fetchDistrictMeta`). Hide countries.
- When `International` is selected: show `Country / Countries` comboselect. Hide regions/districts.
- `National` and `International` are mutually exclusive (radio behaviour).

**Frontend changes:**
- Replace `COVERAGE_SCOPES` checkbox group with a radio-pill group for scope selection.
- Add conditional rendering: `if (coverageScope === 'National')` → show regions + districts; `if (coverageScope === 'International')` → show countries.
- Remove the old checkbox behaviour where both could be selected.

**Backend:** No schema change needed. `coverage_scope` is a JSON array — it will now contain exactly one value: `["National"]` or `["International"]`.

---

## Change 4 — Expertise max 3 with help text (iv)

**Frontend:**
- Add `help="Select up to 3 areas of expertise."` to the expertise `CheckboxGroup`.
- In `validate()` for `"expertise"` step: `if (form.expertise.length > 3) return "Select up to 3 areas of expertise."`
- Disable (grey out) unchecked options once 3 are selected, or allow toggling but show error on validation.

**Backend:**
- Update validation rule: `'expertise' => 'required|array|min:1|max:3'` (only for org).

---

## Change 5 — Contact person prefilled & all required (v)

**Frontend:**
- Add `useEffect` (or inline in `up`) that sets `contactEmail` to `orgEmail` whenever `orgEmail` changes during the `info` step.
- Mark all contact person fields as `required`:
  - `contactName` — already required
  - `contactPosition` — add `required`
  - `contactEmail` — already required (will be prefilled)
  - `contactPhone` — add `required`
- Update `validate()` for `"contact"` to check all four fields.

**Backend:**
- Update validation: `contactName`, `contactPosition`, `contactEmail`, `contactPhone` all `required_if:accountType,organization`.

---

## Change 6 — Add username field (vi)

**Requirement:** During account creation (credentials step), add a "Username" field with help text "Organisation username".

**Database:**
- New migration adding `username` column to `users` table: `$table->string('username')->unique()->nullable();`
- Add `'username'` to `User::$fillable`.

**Frontend:**
- Add `username` to `INITIAL` state.
- In `credentials` step, add a `TextField` for username (required, label: "Username", help: "Organisation username").
- In `validate()` for `"credentials"`: `if (!f.username.trim()) return "Username is required."` and optionally check uniqueness via API or just let backend enforce.
- Include `username` in `buildBody()`.

**Backend:**
- Add validation rule: `'username' => 'required|string|max:255|unique:users,username'`
- In `User::create()`, include `'username' => $data['username']`.

---

## Change 7 — Partner type: funding / implementing partner (vii)

The `partners` table already has a `type` column (nullable string).

**Frontend:**
- Add `partnerType` to `INITIAL` state.
- Add a new step **"Partner Type"** after `category` (or merge into category step as a required radio/select). Options: `Funding Partner`, `Implementing Partner`.
- In `validate()` for new step: `if (!f.partnerType) return "Please select a partner type."`
- Include `partnerType` in `buildBody()` (as `partnerType` key, mapped to `type` in backend).

**Backend:**
- Add validation rule: `'partnerType' => 'required|in:Funding Partner,Implementing Partner'`
- In `createPartnerDraft()`, map `partnerType` → `type`: `'type' => $data['partnerType']`

**Test:**
- Update `test_organization_registration_creates_pending_partner` to include `partnerType`.

---

## Step Order (Organization flow)

Current: `account → category → info → coverage → focus → profile → expertise → contact → credentials`

New: `account → category → partner_type → info → coverage → focus → profile → expertise → contact → credentials`

(Partner type step inserted after category.)

---

## Validation Summary

### Frontend `validate()` cases to update:
- `"info"` — enforce required: orgName, orgEmail, registrationNumber, taxId, physicalAddress, sectors
- `"profile"` — enforce required: mission, description (currently optional, now required)
- `"expertise"` — enforce required + max 3
- `"contact"` — enforce required: contactName, contactPosition, contactEmail, contactPhone
- `"credentials"` — enforce required: email, username, password, password_confirmation

### Backend `register()` rules to update:
- `orgName` → `required`
- `orgEmail` → remove (replaced by `email`)
- `registrationNumber` → `required`
- `taxId` → `required`
- `physicalAddress` → `required`
- `sectors` → `required|array|min:1`
- `mission` → `required`
- `description` → `required`
- `expertise` → `required|array|min:1|max:3`
- `contactName` → `required`
- `contactPosition` → `required`
- `contactPhone` → `required`
- `username` → `required|string|max:255|unique:users,username`
- `partnerType` → `required|in:Funding Partner,Implementing Partner`

---

## Migration

New file: `2026_08_22_XXXXXX_add_username_to_users.php`
```php
Schema::table('users', function (Blueprint $table) {
    $table->string('username')->unique()->nullable()->after('name');
});
```

---

## Test Updates

1. `test_organization_registration_creates_pending_partner` — add `partnerType`, `username`, and make all new required fields present.
2. `test_organization_registration_requires_org_fields` — expand to test new required fields.
3. Add a new test `test_organization_registration_rejects_excess_expertise` — assert 422 when >3 expertise items.
4. Add a new test `test_organization_registration_rejects_duplicate_username` — assert 422.

---

## Open Questions / Decisions

1. **Username vs name for login:** Should `username` replace `email` as the login credential, or should both be required? (Recommendation: keep email as login + username as display/organisation handle — minimal change.)

2. **Partner type storage:** The `partners.type` column already exists. Should it store the exact string (`Funding Partner`) or a slug (`funding_partner`)? (Recommendation: exact string, consistent with existing `category` pattern.)

3. **National/International UX:** Should the user be able to change scope after selecting regions/countries (clearing dependent fields), or should scope be locked once chosen? (Recommendation: allow changing scope, clear dependent fields automatically.)
