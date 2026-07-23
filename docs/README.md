# Agri-Energy Desk — Consultancy Deliverables

Documentation set for the *Consultancy Services for the Design, Development, Deployment
and Technical Support of the Agri-Energy Desk Digital Platform* (National Renewable
Energy Platform — NREP), structured against the Deliverables table of the Terms of
Reference.

| # | ToR deliverable | Document | Status |
|---|---|---|---|
| 1 | Inception report | [01-inception-report.md](01-inception-report.md) | Template — needs contract dates & team |
| 2 | Requirements analysis report | [02-requirements-analysis-report.md](02-requirements-analysis-report.md) | Drafted — needs consultation records |
| 3 | Software requirements specification (SRS) | [03-software-requirements-specification.md](03-software-requirements-specification.md) | Complete |
| 4 | UI/UX design package | [04-ui-ux-design-package.md](04-ui-ux-design-package.md) | Complete (as-built design system) |
| 5 | Developed platform | [../README.md](../README.md) + this set | Software in `api/` and `UI/` |
| 6 | Database architecture | [05-database-architecture.md](05-database-architecture.md) | Complete |
| 7 | Testing report | [06-testing-report.md](06-testing-report.md) | Complete for automated tests; UAT pending |
| 8 | Deployment report | [07-deployment-report.md](07-deployment-report.md) | Runbook complete; production record pending |
| 9 | User manuals | [08-user-manual.md](08-user-manual.md), [09-administrator-manual.md](09-administrator-manual.md) | Complete |
| 10 | Technical documentation | [10-technical-documentation.md](10-technical-documentation.md) | Complete |
| 11 | Training report | [11-training-report.md](11-training-report.md) | Template — needs delivery record |
| 12 | Final consultancy report | [12-final-consultancy-report.md](12-final-consultancy-report.md) | Template — needs closure data |

## How to read this set

Documents fall into two categories.

**As-built documentation** (3, 4, 5, 6 partially, 8, 9, 10) is written from the delivered
source code and is accurate at the time of writing. Where a document states a behaviour,
that behaviour is implemented and — in most cases — covered by an automated test.

**Records of real-world events** (1, 2, 7 UAT section, 11, 12, and the production section
of 8) cannot be authored from source code: they record consultations held, training
delivered, environments provisioned and acceptance obtained. These are provided as
complete, structured documents with every derivable section written out, and explicit
`[TO BE COMPLETED: …]` markers wherever a fact about an actual event is required. **Do not
submit those documents to NREP until the markers are replaced with real records** — they
are drafting aids, not evidence.

## Conventions

- Dates are written `DD Month YYYY`.
- Code paths are relative to the repository root: `api/` (Laravel backend), `UI/`
  (Next.js frontend).
- "Staff" means a user holding `super-admin`, `editor` or `reviewer`; "partner" means an
  approved contributor account; "public" means an unauthenticated visitor.
