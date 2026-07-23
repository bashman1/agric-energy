# Inception Report

**Deliverable:** ToR Deliverable 1 — Detailed implementation methodology, work plan, risk
assessment and project schedule
**Payment milestone:** Month 1 (UGX 2,500,000)

> **Status.** The methodology, work plan, risk register and schedule below are complete.
> Contract-specific facts — dates, named personnel, the stakeholder list agreed with NREP —
> are marked `[TO BE COMPLETED]` and must be filled in before submission.

---

## 1. Contract particulars

| Item | Value |
|---|---|
| Assignment | Design, Development, Deployment and Technical Support of the Agri-Energy Desk Digital Platform |
| Client | National Renewable Energy Platform (NREP) |
| Consultant | `[TO BE COMPLETED]` |
| Contract signature date | `[TO BE COMPLETED]` |
| Duration | Six (6) months from contract signature |
| Contract value | UGX 15,000,000 inclusive of all taxes, in six equal monthly instalments |
| Contract Manager (NREP) | `[TO BE COMPLETED]` |
| Warranty and support | Six (6) months from deployment |

---

## 2. Understanding of the assignment

Information on Uganda's Agri-Energy sector is currently dispersed across institutions.
The consequences NREP has identified are concrete: duplicated interventions, low
visibility of ongoing projects, weak collaboration between actors, and planning decisions
made without access to the available evidence.

The Agri-Energy Desk addresses this by consolidating projects, technologies, thematic
knowledge, organisations, publications, policies, events and funding opportunities into
one platform, with a governed contribution process so the sector itself can keep the
content current.

Two implications shaped our approach:

1. **The platform's value is proportional to the quality and currency of its content**, not
   to its feature count. Contribution, review and publication must be easy for the people
   who hold the information, and controlled enough that NREP can stand behind what is
   published. This is why the editorial workflow — not the page templates — is the core of
   the system.
2. **The platform must outlive the consultancy.** It is specified as a digital public good:
   a documented REST API, open data endpoints, a modular content model that accepts new
   entity types without rework, and documentation sufficient for another team to maintain
   it.

---

## 3. Methodology

An **iterative, deliverable-driven** approach aligned to the ToR's six monthly milestones.
Each phase closes with an artefact NREP formally approves before the next begins.

### 3.1 Phases

| Phase | Purpose | Output |
|---|---|---|
| 1. Inception & planning | Confirm scope, governance, communication and schedule | This report |
| 2. Requirements analysis | Consult stakeholders; map current processes; define roles and workflows | Requirements Analysis Report |
| 3. Specification & design | Specify the system; design the information architecture and interface | SRS; UI/UX design package |
| 4. Development | Build the platform module by module, demonstrating working software as it lands | Working platform; database |
| 5. Testing & QA | Automated testing, security review, and user acceptance testing with NREP | Testing Report |
| 6. Deployment, training & handover | Production deployment, administrator training, documentation handover | Deployment Report; manuals; Training Report; Final Report |

### 3.2 Engineering practice

- Every schema change is a version-controlled migration; production schemas are never
  edited by hand.
- Behaviour carrying a guarantee — access control, workflow enforcement, data scoping — is
  covered by an automated test that runs against the real HTTP stack.
- Authorisation is enforced in the API. The user interface hides what a user may not do;
  the API refuses it.
- Static analysis (types, lint, accessibility rules) runs on every change.
- Documentation is written alongside the code it describes, not reconstructed at the end.

### 3.3 Quality assurance

| Gate | When |
|---|---|
| Automated test suite passes | Every change |
| Type check and lint pass | Every change |
| Production build succeeds | Every change |
| Deliverable reviewed and approved by NREP | End of each phase |
| Security review against OWASP Top 10 | Before deployment |
| User acceptance testing | Before handover |

---

## 4. Work plan

Per the ToR indicative schedule:

| Activity | Duration | Deliverable | Milestone |
|---|---|---|---|
| Inception and planning | 1 week | Inception report | Month 1 |
| Requirements analysis | 2 weeks | Requirements analysis report | Month 1 |
| UI/UX design | 4 weeks | SRS; UI/UX design package | Month 2 |
| Platform development | 4 weeks | Core modules, then remaining modules and database | Months 3–4 |
| Testing and quality assurance | 2 weeks | Testing report | Month 5 |
| Deployment, training and handover | 1 week | Deployment report, manuals, technical documentation, training report, final report | Month 6 |

**Payment schedule** (ToR §Payment Schedule): six equal instalments of UGX 2,500,000, each
payable on approval of that month's deliverables, inclusive of withholding tax.

`[TO BE COMPLETED: convert the durations above into calendar dates from the contract
signature date, and attach the Gantt chart.]`

---

## 5. Stakeholder engagement plan

| Group | Interest | Engagement |
|---|---|---|
| NREP secretariat | Platform ownership; coordination mandate | Weekly progress meetings; approval of every deliverable |
| Government institutions (MAAIF, MEMD, ERA, local government) | Policy alignment; project visibility | Requirements consultation; directory profiles |
| Development partners | Coordination; avoiding duplication | Requirements consultation; content contribution |
| Financial institutions | Investment pipeline visibility | Requirements consultation; opportunities module |
| Private sector / technology suppliers | Market visibility | Directory profiles; content contribution |
| Researchers and academia | Evidence access and dissemination | Knowledge repository requirements |
| Civil society and farmer organisations | Access to practical information | Usability testing; accessibility requirements |

`[TO BE COMPLETED: name the specific institutions and individuals agreed with NREP, and
schedule the consultation sessions.]`

---

## 6. Governance and communication

| Mechanism | Frequency | Participants |
|---|---|---|
| Progress review meeting | Weekly | Consultant lead, NREP Contract Manager |
| Written progress report | Monthly, with invoice | Consultant → Contract Manager |
| Deliverable review | End of each phase | NREP review team |
| Demonstration of working software | Months 3 and 4 | NREP secretariat and invited stakeholders |
| Escalation | As required | Consultant lead → Contract Manager → NREP management |

All deliverables are submitted electronically. Approval is confirmed in writing before the
next phase begins.

---

## 7. Team

`[TO BE COMPLETED: name each team member, their role, and their level of effort.]`

| Role | Responsibility | Person | Effort |
|---|---|---|---|
| Team lead / solution architect | Architecture, client relationship, delivery | | |
| Backend developer | API, database, workflow, security | | |
| Frontend developer | Public site, admin and partner portals | | |
| UI/UX designer | Information architecture, design system, prototypes | | |
| QA / test engineer | Test strategy, execution, UAT facilitation | | |

---

## 8. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Stakeholder availability delays requirements consultation | Medium | High | Front-load scheduling; accept written input where meetings are impossible; time-box the phase |
| 2 | Scope expands beyond the ToR during design | High | High | SRS is formally approved and becomes the change-control baseline; changes assessed against schedule and budget |
| 3 | Insufficient seed content at launch, leaving the platform looking empty | High | Medium | Migrate existing NREP records during development; agree a launch content target; train contributors before go-live |
| 4 | Hosting environment not ready in month 6 | Medium | High | Confirm hosting decisions in month 1; provision and test in month 5 |
| 5 | Partner organisations do not contribute after launch | Medium | High | Low-friction submission; clear review turnaround; contributor training; NREP-led outreach |
| 6 | Data quality — unverified budget and beneficiary figures | Medium | Medium | Figures labelled as self-reported wherever displayed; review step before publication |
| 7 | Key person dependency within the consultant team | Medium | High | Documented architecture and conventions; no undocumented deployment steps |
| 8 | Security incident after handover | Low | High | OWASP-aligned controls; audit trail; warranty period covers security updates |
| 9 | Capacity gap in NREP to maintain the platform after handover | Medium | High | Administrator training; task-oriented manuals; six-month support period |
| 10 | Connectivity constraints degrade the user experience | Medium | Medium | Server-side rendering; no heavyweight client bundles; tested at handset width |

---

## 9. Assumptions

1. NREP will nominate a Contract Manager with authority to approve deliverables.
2. NREP will provide access to the stakeholders required for consultation.
3. NREP will provide or fund the production hosting environment and the domain.
4. Existing content NREP wishes to migrate will be supplied in a machine-readable form.
5. NREP will nominate the administrators to be trained.

---

## 10. Deliverables and acceptance

Each deliverable in the ToR table is submitted for written approval before the next phase
begins. Acceptance criteria for the platform itself are specified in the SRS
([03-software-requirements-specification.md](03-software-requirements-specification.md)).

---

## 11. Submission

| | Name | Position | Signature | Date |
|---|---|---|---|---|
| Submitted by | `[TO BE COMPLETED]` | Consultant | | |
| Approved by | `[TO BE COMPLETED]` | NREP Contract Manager | | |
