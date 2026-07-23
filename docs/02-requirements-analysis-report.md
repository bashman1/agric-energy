# Requirements Analysis Report

**Deliverable:** ToR Deliverable 2 — Summary of stakeholder consultations and documented
business requirements

> **Status.** The problem analysis, user roles, business processes and requirements below
> are documented and were implemented. What this document cannot supply from the delivered
> system is the **record of consultations actually held** — who was met, when, and what
> each said. Those sections are marked `[TO BE COMPLETED]` and must be filled in from
> meeting records before submission to NREP.

---

## 1. Purpose and method

This report documents the discovery phase: the problems the Agri-Energy Desk must solve,
the users it must serve, the business processes it must support, and the requirements
derived from them. It is the input to the Software Requirements Specification.

**Method**

| Activity | Purpose | Record |
|---|---|---|
| Document review | Understand NREP's mandate, the PURE agenda, and existing information holdings | `[TO BE COMPLETED]` |
| Key informant interviews | Understand each stakeholder group's information needs and constraints | `[TO BE COMPLETED]` |
| Consultative workshop | Validate the proposed module structure and workflow | `[TO BE COMPLETED]` |
| Process mapping | Document how Agri-Energy information is currently produced, shared and lost | §4 |
| Requirements validation | Confirm the documented requirements with NREP before specification | `[TO BE COMPLETED]` |

### 1.1 Consultation record

`[TO BE COMPLETED: list every consultation — institution, participants, date, format —
and attach the notes.]`

| # | Institution | Participants | Date | Format |
|---|---|---|---|---|
| 1 | | | | |

---

## 2. Problem analysis

Derived from the ToR background and confirmed during consultation:

| # | Problem | Consequence | Platform response |
|---|---|---|---|
| P1 | Information is dispersed across institutions | No single view of what is happening in the sector | One platform consolidating all content types, with a single search across them |
| P2 | Low visibility of ongoing projects | Interventions are duplicated in the same districts | Searchable, filterable project directory with a geographic view |
| P3 | Difficulty accessing reliable technology information | Poor technology choices; unrealistic expectations | Technology catalogue documenting applications, benefits, **limitations**, operational and maintenance requirements |
| P4 | Scattered financing and investment information | Opportunities missed by those who need them | Opportunities module covering funding, investment, tenders and procurement |
| P5 | Weak collaboration between actors | Fragmented effort | Stakeholder directory plus a contribution portal that puts sector actors inside the platform |
| P6 | Research outputs not disseminated | Evidence unused in planning | Knowledge repository with thematic organisation |
| P7 | Policy documents hard to locate | Compliance uncertainty | Policy and regulatory document register |
| P8 | Events and training not centrally advertised | Low participation | Events and learning hub |
| P9 | No basis for evidence-based planning and reporting | Decisions made without data | Analytics and reporting module with downloadable reports; open data endpoints |

---

## 3. User roles and needs

| Role | Primary need | Derived requirements |
|---|---|---|
| **Public visitor** (farmer organisation, practitioner, student, journalist) | Find reliable information quickly, on a modest device and connection | Open access without registration; strong search and filtering; fast, lightweight pages; downloadable factsheets |
| **Development partner / government institution** | See who is doing what and where, to coordinate and avoid duplication | Project directory with geography and value-chain filters; map; partner directory; exportable data |
| **Financial institution / investor** | Identify credible pipeline and partners | Project portfolio detail; opportunities module; stakeholder profiles |
| **Private sector / technology supplier** | Visibility, and a route to publish offerings | Directory profile; contribution portal |
| **Researcher / academia** | Access evidence and disseminate outputs | Knowledge repository; thematic organisation; publication contribution |
| **Partner contributor** | Contribute organisational content without lengthy processes | Self-registration; simple submission forms; visible submission status |
| **NREP reviewer** | Ensure only accurate, attributable content is published | Review queue; approve/reject with notes; audit trail |
| **NREP editor** | Curate the platform and keep it current | Full content management; taxonomy and site configuration; media management |
| **NREP administrator** | Govern access and report on the platform | User management with approval and roles; audit trail; reporting module |

---

## 4. Business process mapping

### 4.1 Current state (before the platform)

```
Information created by an actor
        │
        ├─▶ held on the originating institution's own website or intranet
        ├─▶ circulated as email attachments within a limited group
        └─▶ presented once at a workshop, then not retained
                 │
                 ▼
        Anyone else seeking it must know who to ask.
        Planning proceeds without it.
```

**Weaknesses:** no shared index; no way to discover what exists; no persistence beyond the
originating institution; no quality control; no aggregate view for planning.

### 4.2 Target state — content contribution and publication

```
Contributor completes a submission
        ▼
Saved as PENDING, not publicly visible          ← enforced server-side
        ▼
Appears in NREP review queue
        ▼
Reviewer verifies accuracy and attribution
        ├── Approve ──▶ PUBLISHED, publicly visible, audit entry written
        └── Reject ───▶ returned with notes, contributor revises and resubmits
```

### 4.3 Target state — organisation onboarding

```
Organisation self-registers
        ▼
Account created PENDING; sign-in refused        ← enforced server-side
        ▼
NREP administrator verifies the organisation is genuine
        ├── Approve ──▶ account active; may contribute
        └── Decline ──▶ account remains inactive
```

### 4.4 Target state — enquiry handling

```
Visitor submits an enquiry ──▶ inbox (NEW) ──▶ READ ──▶ RESPONDED ──▶ ARCHIVED
                                              (notes recorded at each step)
```

### 4.5 Target state — periodic reporting

```
NREP officer selects a report and a period
        ▼
Report generated from live platform data
        ▼
Reviewed on screen ──▶ downloaded as PDF (circulation) or Excel (analysis)
        ▼
Included in NREP progress and coordination reporting
```

---

## 5. Requirements derived

Requirements are stated in full, with identifiers, in the
[Software Requirements Specification](03-software-requirements-specification.md). This
section records the traceability from problem to requirement.

| Problem | Requirement group | SRS IDs |
|---|---|---|
| P1 Dispersed information | Content directories and unified search | FR-01 – FR-10, FR-20 – FR-23 |
| P2 Project visibility | Project directory, filters, GIS map, open data | FR-06, FR-11, FR-13 |
| P3 Technology information | Technology catalogue | FR-07 |
| P4 Financing information | Opportunities module | FR-10 |
| P5 Weak collaboration | Stakeholder directory, partner portal, contribution workflow | FR-08, FR-31, FR-40 – FR-45 |
| P6 Research dissemination | Knowledge repository, thematic organisation | FR-05 |
| P7 Policy access | Policy register | FR-05 |
| P8 Events | Events and learning hub | FR-09 |
| P9 Evidence-based planning | Analytics, reporting, open data, exports | FR-12, FR-13, FR-60 – FR-65, FR-80 – FR-82 |
| Cross-cutting: trust in published content | Editorial workflow, RBAC, audit trail | FR-30 – FR-34, FR-41 – FR-46, FR-70 – FR-73 |

---

## 6. Non-functional requirements from context

| Context observed | Requirement |
|---|---|
| Users are frequently on mobile devices and constrained bandwidth | Server-rendered pages; no page depends on client-side JavaScript to show content; mobile-first layout (NFR-02, NFR-04) |
| The platform is a public national resource | Accessibility to WCAG 2.1 AA (NFR-06) |
| Content will be contributed by external organisations | Every mutation audited; nothing publishes without review (NFR-08) |
| The platform must be maintained by NREP after handover | Documentation, training, modular architecture, warranty support (NFR-09) |
| Uganda is the initial scope, East Africa is anticipated | Geography stored as free-form region/district plus coordinates, not fixed to Ugandan administrative units |
| Multiple working languages in the sector | Interface translatable; English, French and Kiswahili provided (NFR-10) |

---

## 7. Out of scope for this phase

Recorded so that expectations are explicit. Each is anticipated by the architecture but is
not part of this consultancy:

- Investment matchmaking between opportunities and organisations
- Machine-to-machine integrations with specific national systems (the API is the surface;
  individual integrations are separate work)
- A public contributor reputation or rating system
- Advanced GIS analysis beyond mapping and regional aggregation
- A native mobile application
- Automated ingestion from partner systems

---

## 8. Validation

`[TO BE COMPLETED: record the session at which NREP confirmed these requirements, the
participants, and any amendments agreed.]`

| | Name | Position | Signature | Date |
|---|---|---|---|---|
| Prepared by | `[TO BE COMPLETED]` | Consultant | | |
| Validated by | `[TO BE COMPLETED]` | NREP Contract Manager | | |
