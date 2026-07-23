# Administrator Manual

**Deliverable:** ToR Deliverable 9 (part 2 of 2) — Administrator manual
**Audience:** NREP staff holding `editor`, `reviewer` or `super-admin` roles

---

## 1. Signing in

The admin portal is at `/admin`. Sign in with your platform email and password. Sessions
last eight hours, after which you are returned to the sign-in page.

If you do not have an account, a super-administrator must create one for you and assign
your role. Do not share accounts — every action is recorded against the signed-in user in
the audit trail.

---

## 2. Roles and what each can do

| Capability | Reviewer | Editor | Super-admin |
|---|:---:|:---:|:---:|
| View analytics and reports | ✓ | ✓ | ✓ |
| Review queue: approve / reject | ✓ | ✓ | ✓ |
| Create, edit, delete content | | ✓ | ✓ |
| Manage taxonomies and site configuration | | ✓ | ✓ |
| Manage the contact inbox | | ✓ | ✓ |
| Manage newsletter subscribers | | ✓ | ✓ |
| Approve, suspend and assign roles to users | | | ✓ |
| View the audit trail | | | ✓ |

Roles are enforced by the API, not merely hidden in the interface. Attempting a privileged
action without the role fails server-side.

---

## 3. The admin dashboard

`/admin` summarises the platform: content totals, items awaiting review, pending user
approvals and recent enquiries. Each tile links to the screen where you act on it.

---

## 4. Managing content

Every content type — Projects, Technologies, Themes, Partners, Resources, News & Stories,
Events, Opportunities, Policies — has a list screen and an edit form with the same shape.

### 4.1 The list screen

Search by title, filter by status, and sort by column. Each row offers **Edit** and
**Delete**. Deletion removes the record and its relationship links; it does not remove the
audit history of the record.

### 4.2 Creating and editing

1. Click **New** on the list screen, or **Edit** on a row.
2. Complete the fields. The **slug** is the record's public address — it is generated from
   the title, and changing it on a published record changes the public URL and breaks
   existing links.
3. Use the relationship pickers to connect the record to technologies, themes or partners.
   These connections drive the related-content sections on the public site.
4. Set **Published** when the record should be publicly visible. Set **Featured** to
   promote it on the homepage.
5. Save.

### 4.3 Locations

Project forms include a location picker. Set the district and region, and place the marker
for the map. Projects without coordinates do not appear on the map but remain in all
directories and reports.

### 4.4 Media

Use the upload control on the form to attach images and documents. Uploaded files are
served from the platform, so they stay available regardless of external websites.
Compress large PDFs before uploading — many users are on constrained connections.

---

## 5. The review queue

`/admin/review` lists everything awaiting a decision, including all partner submissions.

For each item:

- **Open** it to read the full record as submitted.
- **Approve** — the record is published immediately and becomes publicly visible.
- **Reject** — you must give notes. The contributor sees these notes and can revise and
  resubmit.

Both actions are recorded in the audit trail with your name and the time.

**Review guidance.** Before approving, check that the record is accurate and attributable,
that the organisation named is real and correctly identified, that budget or beneficiary
figures are plausible and sourced, and that no personal data of private individuals is
included.

---

## 6. Managing users

`/admin/users` (super-admin only).

| Action | Effect |
|---|---|
| **Approve** | A pending registration becomes active and can sign in |
| **Suspend** | Sign-in is blocked immediately; the account and its content remain |
| **Assign roles** | Grants or removes `editor`, `reviewer`, `partner`, `super-admin` |

Approve an organisation only after verifying it is genuine — approval places it in the
national stakeholder directory. Grant `super-admin` sparingly.

**Two limitations to be aware of.** Approving or suspending an account does not currently
send the user an email — tell them directly. And there is no password-reset control in the
portal: a user who has lost their password must be reset by the technical support contact.
Both are recorded as gaps in the Final Consultancy Report for resolution during the
warranty period.

---

## 7. Enquiries

`/admin/submissions` is the inbox for messages sent through the public Contact page. Each
enquiry moves through **new → read → responded → archived**. Use the notes field to record
what response was given, so the next person to open it has the history.

---

## 8. Newsletter

`/admin/newsletter` lists subscribers and their confirmation status. Only confirmed,
un-unsubscribed addresses should ever receive a mailing. Use **Export** to obtain the list
for your mailing tool. Treat the export as personal data: store it securely, do not
circulate it, and delete working copies when finished.

---

## 9. Analytics

`/admin/analytics` gives an at-a-glance view: content by type, workflow status, projects by
region and status, projects per thematic area, and enquiries by status. CSV exports of the
full dataset for each content type are available at the foot of the page.

---

## 10. Reports

`/admin/reports` is the reporting module.

### 10.1 Generating a report

1. Choose a report from the dropdown.
2. Optionally set **From** and **To** dates. Leave them blank for a rolling 12-month
   window ending today.
3. Click **Generate**.

The report appears with summary figures at the top and its sections below, some as bar
charts and some as tables. The page address contains the report and period, so you can
bookmark or share a specific report view with a colleague.

### 10.2 Available reports

| Report | Answers |
|---|---|
| **Platform Overview** | How large is the platform, how much is published, what is awaiting review, how active is the team |
| **Content Inventory** | What exists in each content type, by editorial status, and which published records have gone stale |
| **Content Growth & Trends** | How much content was added and updated each month, by type |
| **Content Utilisation** | Who is contributing, what actions they take, and which records receive the most editorial attention |
| **User Engagement** | Registrations over time, users by role and status, contributed content, enquiries and newsletter reach |
| **Project Portfolio** | The published portfolio by region, status and value chain, with budget and beneficiary totals and a full project register |
| **Stakeholder Directory** | Partner organisations by type and coverage, with a contactable directory |
| **Opportunities & Events** | Open funding, investment and procurement notices, and the events calendar for the period |

### 10.3 Downloading

Each generated report offers **PDF** and **Excel**:

- **PDF** for circulation and inclusion in progress reports. It carries the report title,
  the reporting period, generation timestamp, source address and page numbering.
- **Excel** for further analysis, with each section as a labelled block of data.

Both contain exactly what is on screen. Reports are generated at the moment of request,
so a report downloaded today reflects today's data.

### 10.4 Interpreting figures

- "In period" figures count records by the date they were created; totals without a period
  qualifier are current snapshots.
- Budget and beneficiary figures are **self-reported by implementing partners** and are not
  independently audited. Say so when quoting them externally.
- The Content Utilisation report is built from the audit trail, so it reflects editorial
  activity on the platform, not public readership.

---

## 11. Site configuration

`/admin/site-config` shows the current homepage hero, headline statistics and featured
content.

**This screen is currently read-only.** The API supports updating site configuration
(`PUT /api/v1/site-config`) and taxonomies (`PUT /api/v1/taxonomy`), but no editing
interface has been built for either. Until one is, ask the technical support contact to
make changes to:

- the homepage hero, headline statistics, featured records and public contact details;
- the controlled vocabularies (value chains, project statuses, resource types, partner
  types, technology categories, beneficiary tags).

When taxonomy editing does arrive, note that renaming a term updates it wherever it is
displayed, and removing a term does not delete records that used it — so retire terms with
care.

Both editing screens are recorded as gaps in the Final Consultancy Report.

---

## 12. Audit trail

`/admin/audit` (super-admin only) is the complete record of content changes: who did what,
to which record, when, and which fields changed. Filter by action or content type.

The audit trail is append-only — it cannot be edited or cleared from the interface. Use it
to answer "who changed this and when", to investigate an unexpected change, and as evidence
in periodic reporting.

---

## 13. Routine administration

| Frequency | Task |
|---|---|
| Daily | Clear the review queue; triage the enquiry inbox |
| Weekly | Approve or decline pending user registrations; check the Platform Overview report |
| Monthly | Generate and file the reports required for NREP progress reporting; review the Content Inventory for stale records |
| Quarterly | Review user accounts and remove access no longer needed; confirm backups restore correctly (with the technical team) |

---

## 14. Good practice

- **Never share accounts.** The audit trail is only as useful as the identity behind it.
- **Publish deliberately.** Anything published is immediately public and may be indexed by
  search engines.
- **Attribute data.** Record the source of figures in the record description.
- **Protect personal data.** Do not publish personal contact details of private
  individuals; organisational contacts are appropriate, personal ones are not.
- **Prefer editing to deleting.** Unpublishing keeps the record and its history; deletion
  discards the record.

---

## 15. Getting help

| Issue | Contact |
|---|---|
| Access, roles, account problems | Your NREP super-administrator |
| Platform faults or errors | The technical support contact provided at handover, within the warranty period |
| Content questions | The NREP Agri-Energy Desk content lead |
