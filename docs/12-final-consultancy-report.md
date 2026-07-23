# Final Consultancy Report

**Deliverable:** ToR Deliverable 12 — Summary of implementation, lessons learned and
recommendations
**Payment milestone:** Month 6 (UGX 2,500,000)

> **Status.** Sections 2–4 and 6–8 describe the delivered system and are accurate.
> Sections 1, 5 and 9 record contract closure facts — dates, acceptance, actual schedule
> performance — and are marked `[TO BE COMPLETED]`.

---

## 1. Assignment summary

| Item | Value |
|---|---|
| Assignment | Design, Development, Deployment and Technical Support of the Agri-Energy Desk Digital Platform |
| Client | National Renewable Energy Platform (NREP) |
| Consultant | `[TO BE COMPLETED]` |
| Contract period | `[TO BE COMPLETED]` to `[TO BE COMPLETED]` |
| Contract value | UGX 15,000,000, inclusive of all applicable taxes |
| Warranty and support period | Six months from deployment: `[TO BE COMPLETED]` to `[TO BE COMPLETED]` |
| Production URL | `[TO BE COMPLETED]` |

---

## 2. What was delivered

A two-tier web platform: a Laravel 11 REST API over PostgreSQL, and a server-rendered
Next.js 16 web client comprising the public site, the administration portal and the partner
contribution portal.

### 2.1 Modules against the ToR

| ToR requirement (§Platform Development) | Delivered |
|---|---|
| Public homepage with announcements, news, featured projects, publications and navigation | ✓ Configurable from the admin portal |
| Knowledge repository — research reports, technical manuals, policy documents, case studies, multimedia | ✓ Resources and Policies modules |
| Searchable project directory, extensible to East Africa | ✓ Filters on region, district, value chain, status, technology and theme; geography stored as free-form region/district plus coordinates, so it is not bound to Ugandan administrative units |
| Technology catalogue for agricultural value chains | ✓ Including limitations, operational and maintenance requirements |
| Stakeholder directory | ✓ Government, development partners, financiers, private sector, researchers, civil society |
| Events and learning hub | ✓ Conferences, workshops, webinars, training |
| Administration portal — content, users, workflow approvals, configuration | ✓ for content, users and workflow approvals; site configuration is read-only in the portal (see §2.3) |
| Secure, normalised, scalable relational database | ✓ PostgreSQL; see [Database Architecture](05-database-architecture.md) |
| Advanced search with multi-parameter filtering and relevance ranking | ✓ Including type-ahead suggestions |
| Analytics and reporting with downloadable reports | ✓ Eight reports with configurable periods, PDF and Excel output |
| Secure authentication and role-based access control | ✓ Sanctum tokens; four roles |
| Content creation, publishing and approval workflows | ✓ Seven-state editorial workflow; partner submissions cannot self-publish |
| Upload, categorisation and management of digital resources | ✓ |
| Dashboards and administrative reports | ✓ |
| Complete audit trails | ✓ Every content mutation, with actor and changed fields |
| RESTful API for future integration | ✓ 84 endpoints under `/api/v1`, OpenAPI documented at `/docs/api` |

### 2.2 Delivered beyond the minimum

| Addition | Rationale |
|---|---|
| Open data endpoints (CSV, GeoJSON, regional aggregates) | Makes the platform a digital public good and supports GIS reuse without bespoke integration |
| Per-record PDF factsheets and Excel workbooks on every public detail page | Users work offline and in briefing documents; requested behaviour in every knowledge platform of this kind |
| Newsletter with double opt-in | Sustained engagement without third-party dependence |
| Trilingual interface (English, French, Kiswahili) | Regional accessibility and future East Africa expansion |
| Funding, investment, tender and procurement notices in one module | Consolidates the financing information the ToR identifies as scattered |

### 2.3 Known gaps at the time of writing

Stated plainly so they can be scheduled rather than discovered:

| Gap | Effect | Recommendation |
|---|---|---|
| Site configuration screen is read-only | Homepage hero, statistics and featured content cannot be changed from the portal, although the API supports it (`PUT /api/v1/site-config`) | Build the editing form against the existing endpoint — the highest-priority remaining item, since it is a routine editorial task |
| No taxonomy editing screen | Controlled vocabularies require a technical change, although the API supports it (`PUT /api/v1/taxonomy`) | Build a simple list editor against the existing endpoint |
| No self-service password reset | Administrators must reset passwords for users on request | Implement the standard Laravel password-reset flow (the `password_reset_tokens` table already exists) during the warranty period |
| No email notification when a user account is approved or suspended | Applicants must retry sign-in to discover their status | Add a notification on the approve/suspend actions in `UserController` |
| No email notification to reviewers when content is submitted | The review queue must be checked rather than pushed | Add a digest notification to reviewers |
| Search uses ranked `LIKE` rather than full-text indexing | Adequate at current volumes; will degrade as content grows | Move to PostgreSQL `tsvector` with GIN indexes when volume warrants it |

---

## 3. Implementation approach and what it produced

Development was deliverable-driven, with each phase approved before the next began. Three
decisions shaped the result:

**Authorisation lives in the API.** The interface hides what a user may not do; the API
refuses it. Partner-submitted content is normalised server-side to unpublished and pending
regardless of the submitted payload. This is what allows NREP to open contribution to the
sector without risking what appears on a national platform.

**One content model, nine entity types.** Every publishable entity shares the same
workflow, audit and reporting columns. Adding a tenth entity type is a migration, a model,
a controller and a test — not a redesign. This is the single largest contributor to the
platform's maintainability.

**Documentation and tests written alongside the code.** 36 automated tests cover the
guarantees that matter — access scoping, workflow enforcement, role separation, report
integrity — and run against the real HTTP stack.

---

## 4. Results

| Measure | Value |
|---|---|
| Content entity types | 9 |
| API endpoints | 84 registered routes under `/api/v1` |
| Web pages / routes | 58 |
| Database tables | 37 (including relationship, auth and framework tables) |
| Administrative reports | 8, each with PDF and Excel output |
| Automated tests | 36 passing, 352 assertions |
| Interface languages | 3 |
| Roles | 4 (`super-admin`, `editor`, `reviewer`, `partner`) plus public |

---

## 5. Schedule and budget performance

`[TO BE COMPLETED: record planned versus actual dates for each milestone, note any
variances and their causes, and confirm all six instalments were invoiced and paid.]`

| Milestone | Planned | Actual | Variance | Deliverables approved |
|---|---|---|---|---|
| Month 1 — Inception and requirements | | | | |
| Month 2 — Architecture, UI/UX, SRS | | | | |
| Month 3 — Core modules | | | | |
| Month 4 — Remaining modules and database | | | | |
| Month 5 — Testing, QA and UAT | | | | |
| Month 6 — Deployment, training, handover | | | | |

---

## 6. Lessons learned

| # | Lesson | Recommendation for future assignments |
|---|---|---|
| 1 | Enforcing the editorial workflow in the API rather than the interface removed an entire class of risk from opening contribution to external organisations | Treat "who may publish" as a server-side security control, never a UI concern |
| 2 | A uniform content model made each additional entity type cheap; the ninth cost a fraction of the first | Invest in the shared abstraction before the second entity type, not the fifth |
| 3 | Building the export layer as a renderer-agnostic document model meant administrative reports reused the record-factsheet renderers unchanged | Model the document, not the file format |
| 4 | A platform's launch credibility depends on it not being empty | Agree a seed-content target and migrate existing records during development, not after |
| 5 | Server-side rendering was the right call for the connectivity conditions of the audience | Let the audience's network conditions, not framework fashion, decide the rendering strategy |
| 6 | Documenting figures as self-reported at the point of display prevents them being quoted as audited data | Label data provenance in the interface, not only in documentation |

---

## 7. Recommendations to NREP

### 7.1 Immediate (first three months after handover)

1. **Populate before promoting.** Set a content target per module and reach it before any
   public launch campaign. An empty directory teaches visitors not to return.
2. **Commit to a review turnaround.** Publish a service standard — for example, five
   working days — and staff the review queue to meet it. Contributors stop contributing
   when submissions sit.
3. **Run contributor onboarding.** Recruit and brief a first cohort of partner
   organisations; the platform's value scales with the number of organisations that use it
   as their publishing channel.
4. **Verify backups by restoring one.** A backup that has never been restored is an
   assumption, not a control.
5. **Assign named ownership.** Nominate a content owner and a technical owner. Platforms
   without an owner decay.

### 7.2 Medium term (three to twelve months)

6. **Report monthly from the platform's own reporting module** into NREP's coordination
   reporting, so the platform earns its place in an existing process.
7. **Commission an independent penetration test** before promoting the platform to a wider
   public audience.
8. **Review the taxonomies** once real contribution patterns are visible; controlled
   vocabularies designed before use always need adjustment after it.
9. **Publish the API** to the institutions most likely to integrate, and record who
   consumes it.
10. **Retire stale content deliberately** using the Content Inventory report, which lists
    published records untouched for twelve months.

### 7.3 Longer term

11. **East Africa expansion** — the data model already supports it; the work is content
    partnerships and a country dimension in the filters, not re-engineering.
12. **Investment matchmaking** — opportunities and partner profiles already carry the
    sector, value-chain and coverage attributes such a feature would consume.
13. **Full-text search** — if search volume grows, move from ranked `LIKE` to PostgreSQL
    `tsvector` with GIN indexes; `SearchController` is the only call site affected.
14. **Automated ingestion** from partner systems for institutions that publish structured
    data of their own.

---

## 8. Sustainability and handover

| Element | Provision |
|---|---|
| Intellectual property | All software, source code, databases, documentation and designs are the property of NREP per the ToR |
| Source code | Repository transferred to NREP control, with full history |
| Documentation | This deliverable set, plus in-code documentation and generated API documentation |
| Capacity | Administrator training delivered and documented ([Training Report](11-training-report.md)) |
| Support | Six-month warranty covering defect resolution, security updates and performance optimisation |
| Maintenance without the consultant | No proprietary components; all dependencies are open source with active maintenance; architecture and conventions documented in [Technical Documentation](10-technical-documentation.md) |

**Ongoing costs NREP should budget for:** hosting and domain, TLS certificates (free with
Let's Encrypt), SMTP delivery, backup storage, and periodic dependency and security
updates after the warranty period.

---

## 9. Closure

`[TO BE COMPLETED]`

| Item | Status |
|---|---|
| All ToR deliverables submitted and approved | |
| Production deployment accepted | |
| Training delivered and accepted | |
| Source code and credentials transferred | |
| Warranty period commenced | |
| Final invoice submitted | |

| | Name | Position | Signature | Date |
|---|---|---|---|---|
| Submitted by | `[TO BE COMPLETED]` | Consultant | | |
| Accepted by | `[TO BE COMPLETED]` | NREP Contract Manager | | |
