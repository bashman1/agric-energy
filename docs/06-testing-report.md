# Testing Report

**Deliverable:** ToR Deliverable 7 — Results of unit, integration, security and user
acceptance testing

> **Status.** Sections 1–5 record automated testing actually executed against the
> delivered code. Section 6 (User Acceptance Testing) records an activity involving NREP
> staff and is marked for completion.

---

## 1. Test strategy

| Level | Approach | Tooling |
|---|---|---|
| Unit | Isolated helper and formatting logic | PHPUnit |
| Integration / feature | Full HTTP request → routing → authorisation → database → response, against a real database schema | PHPUnit + Laravel `RefreshDatabase` |
| Static analysis | Type correctness and lint rules, including accessibility | `tsc --noEmit`, ESLint with `jsx-a11y` |
| Build verification | Production build of the web tier | `next build` |
| Security | Access-control tests per role, plus the review in §5 | PHPUnit |
| Manual / exploratory | Rendered output of generated documents inspected page by page | Manual |
| User acceptance | Scripted scenarios executed by NREP staff | §6 |

Feature tests exercise the real HTTP stack rather than mocking it, so route registration,
middleware, gates, validation and serialisation are all covered by every test.

---

## 2. Automated test results

Command: `php artisan test` (run from `api/`).

**Result: 36 tests passed, 352 assertions, 0 failures.**

### 2.1 Public access scoping

| Test | Verifies |
|---|---|
| `public_sees_only_published_content` | Draft records are never returned to unauthenticated callers (FR-02) |
| `staff_admin_flag_sees_drafts_partner_does_not` | The `?admin=true` flag elevates only for staff roles (FR-46) |
| `open_data_csv_contains_published_projects_only` | Open-data CSV excludes unpublished records |
| `open_data_geojson_only_exposes_published_geolocated_projects` | GeoJSON excludes unpublished and ungeolocated records |
| `open_data_regions_aggregates_count_budget_and_beneficiaries` | Regional aggregates are computed correctly |

### 2.2 Authentication, onboarding and RBAC

| Test | Verifies |
|---|---|
| `partner_registration_creates_pending_account` | Self-registration yields a pending account (FR-32) |
| `organization_registration_creates_pending_partner` | Organisation registration creates the linked partner profile |
| `organization_registration_requires_org_fields` | Organisation payload validation |
| `pending_partner_cannot_login` | Unapproved accounts cannot authenticate (FR-32) |
| `approved_partner_receives_a_token` | Approved accounts receive a Sanctum token (FR-30) |
| `partner_cannot_manage_users` | Privilege escalation is refused (SEC-11) |
| `analytics_requires_staff` | Analytics is staff-only (FR-34) |
| `reports_require_staff` | Reporting is staff-only; anonymous 401, partner 403 (FR-34) |

### 2.3 Editorial workflow

| Test | Verifies |
|---|---|
| `partner_submission_is_forced_pending` | Partner writes cannot self-publish, whatever the payload (FR-41) |
| `reviewer_approve_publishes_and_audits` | Approval publishes the record and writes an audit entry (FR-43, FR-70) |

### 2.4 Search

| Test | Verifies |
|---|---|
| `search_returns_ranked_results` | Relevance ordering (FR-21) |
| `suggest_ranks_prefix_matches_and_hides_drafts` | Suggestions rank prefixes first and exclude drafts (FR-23) |
| `suggest_returns_nothing_below_two_characters` | Minimum query length |
| `suggest_caps_the_result_list` | Result cap enforced |

### 2.5 Engagement features

| Test | Verifies |
|---|---|
| `newsletter_subscribe_then_confirm_activates_the_subscriber` | Double opt-in (FR-52) |
| `newsletter_confirm_with_an_unknown_token_is_rejected` | Token forgery is refused |
| `newsletter_unsubscribe_deactivates_the_subscriber` | Unsubscribe (FR-53) |
| `duplicate_subscribe_is_idempotent_and_clears_a_previous_unsubscribe` | Re-subscription behaviour |
| `newsletter_subscribe_validates_the_email` | Input validation |
| `newsletter_subscribers_requires_staff` | Subscriber list is staff-only |
| `opportunities_can_be_filtered_by_type` | Tender/procurement filtering (FR-10) |
| `posts_can_be_filtered_by_category` | Newsroom filtering |

### 2.6 Reporting module

| Test | Verifies |
|---|---|
| `catalogue_lists_available_reports` | Catalogue shape and content (FR-61) |
| `unknown_report_is_not_found` | Unknown report keys return 404 |
| `invalid_period_is_rejected` | Malformed dates return 422 (FR-64) |
| `every_report_returns_a_renderable_document` | Every report satisfies the document contract, and every row width matches its column count — the invariant the PDF/Excel renderers depend on |
| `period_scopes_counts_and_month_buckets` | Period filtering and month bucketing (FR-64) |
| `project_portfolio_reflects_published_projects` | Portfolio figures exclude drafts and sum beneficiaries correctly |
| `stakeholder_directory_excludes_unpublished_partners` | Directory scoping |

---

## 3. Static analysis and build verification

| Check | Command | Result |
|---|---|---|
| TypeScript type check | `npx tsc --noEmit` | Pass — no errors |
| Lint (incl. `jsx-a11y`) | `npx eslint .` | Pass — no errors |
| Production build | `npm run build` | Pass — all routes compiled |

---

## 4. Manual verification

| Area | Method | Result |
|---|---|---|
| Record factsheet PDFs | Generated for all eight public record types; pages rendered to images and inspected | Pass — correct pagination, table headers repeat across page breaks, footer carries source URL, timestamp and page numbers |
| Record factsheet workbooks | Generated and re-opened programmatically; cell contents compared against the source record | Pass — values, headings and merged regions correct |
| Report documents | All eight reports generated in both formats and checked for file validity | Pass — 8/8 PDFs and 8/8 workbooks valid; wide report matrices correctly switch to landscape |
| Access control on exports | Requested a report export without a session | Pass — 401 |
| Error handling | Unknown slug, unknown report, unsupported format, malformed date | Pass — 404, 404, 400, 422 respectively |
| Responsive layout | Public directory rendered at 360px, 768px and 1440px | Pass — no horizontal overflow; filters stack; navigation collapses to the menu button at handset and tablet widths |

---

## 5. Security testing

| OWASP risk | Control | Verification |
|---|---|---|
| A01 Broken access control | Server-side gates on every privileged route | Covered by §2.2 tests; exports verified to return 401 without a session |
| A02 Cryptographic failures | bcrypt password hashing; encrypted HTTP-only session cookie; TLS in production | Configuration review |
| A03 Injection | Eloquent parameter binding; no interpolated SQL | Code review of every query site |
| A04 Insecure design | Partner writes normalised server-side; workflow cannot be bypassed from the client | Test `partner_submission_is_forced_pending` |
| A05 Security misconfiguration | `APP_DEBUG=false` and secrets outside version control in production | Deployment checklist |
| A07 Identification/authentication failures | Approval gate before first sign-in; revocable tokens; session expiry | Tests `pending_partner_cannot_login`, `approved_partner_receives_a_token` |
| A08 Software/data integrity | Dependencies pinned in `composer.lock` / `package-lock.json` | Lockfiles committed |
| A09 Logging failures | Every content mutation audited with actor and changes | Test `reviewer_approve_publishes_and_audits` |

**Not yet covered by manual testing.** Admin-portal screens have been exercised at desktop
width only; the full admin portal should be walked through at handset and tablet widths
during UAT (§6, scenario 15). Cross-browser verification on Safari and Edge is also
outstanding.

**Recommended before go-live:** an independent penetration test, `composer audit` and
`npm audit` on the release commit, and enabling HSTS plus a Content-Security-Policy header
at the web server.

---

## 6. User acceptance testing

> `[TO BE COMPLETED: UAT has not been recorded. Execute the scenarios below with NREP
> staff and record the outcome, tester, date and any defects raised.]`

**Proposed UAT scenarios**

| # | Scenario | Role | Expected outcome | Result | Tester | Date |
|---|---|---|---|---|---|---|
| 1 | Find a project by district and value chain from the public site | Public | Filtered results; detail page opens | | | |
| 2 | Download a project factsheet as PDF and as Excel | Public | Both files download and open correctly | | | |
| 3 | Search for a technology by partial name | Public | Suggestions appear from two characters; results ranked | | | |
| 4 | Register an organisation for a partner account | Public | Account created as pending; sign-in refused until approved | | | |
| 5 | Approve the pending partner account | Super-admin | Partner can now sign in | | | |
| 6 | Submit a project from the partner portal | Partner | Record created as pending, not visible publicly | | | |
| 7 | Review and approve the submission | Reviewer | Record published and visible publicly; audit entry written | | | |
| 8 | Reject a submission with notes | Reviewer | Contributor sees the rejection and the notes | | | |
| 9 | Create, edit and unpublish a resource | Editor | Changes reflected publicly and audited | | | |
| 10 | Upload a PDF publication and attach it to a resource | Editor | File downloads correctly from the public page | | | |
| 11 | Generate the Project Portfolio report for a chosen period | Editor | Figures match the admin lists; PDF and Excel download | | | |
| 12 | Generate the User Engagement report | Editor | Registration and enquiry counts match the admin screens | | | |
| 13 | Edit homepage featured content | Editor | Homepage updates | | | |
| 14 | Review the audit trail for the day's activity | Super-admin | All actions above appear with the correct actor | | | |
| 15 | Complete the full journey on a mobile handset | Public | All pages usable at handset width | | | |

**Sign-off**

| | Name | Position | Signature | Date |
|---|---|---|---|---|
| Tested by | `[TO BE COMPLETED]` | | | |
| Accepted by | `[TO BE COMPLETED]` | NREP Contract Manager | | |

---

## 7. Defect log

`[TO BE COMPLETED: record defects raised during UAT, their severity, resolution and
verification date. No open defects are known from automated testing at the time of
writing.]`

| ID | Description | Severity | Status | Resolved | Verified by |
|---|---|---|---|---|---|
| | | | | | |

---

## 8. Conclusion

All automated tests pass and the platform meets the functional and security requirements
covered by that suite. Formal acceptance is subject to completion of §6 and closure of any
defects recorded in §7.
