# UI/UX Design Package

**Deliverable:** ToR Deliverable 4 — Wireframes, prototypes and approved interface designs
**Document status:** As-built design documentation. The delivered interface *is* the
high-fidelity prototype; this document records the information architecture, design system
and interaction patterns it implements.

---

## 1. Design approach

The platform is a national institutional resource, not a marketing site. The design is
therefore **restrained, border-led and typographically driven**: white surfaces, thin
neutral borders, generous spacing, colour reserved for actions and status. Content
density is favoured over decoration, because the primary task is finding information.

Four principles governed every decision:

1. **Findability first.** Every directory opens with filters visible, not hidden behind a
   control. The URL always reflects the current view so it can be shared.
2. **Legible on a handset over a slow connection.** Pages are server-rendered and their
   content ships in the initial HTML. Motion is a CSS layer on top: a scroll-reveal that
   is disabled under `prefers-reduced-motion` and un-hidden by a `<noscript>` rule where
   JavaScript is unavailable.
3. **One system, not many pages.** A single card pattern, one icon family, one button
   family, one table pattern — reused everywhere so that learning one screen teaches the
   others.
4. **Status is always visible.** Contributors and reviewers can see, at any moment, where a
   record stands in the editorial workflow.

---

## 2. Information architecture

```
Home
├── Projects ─────────── Project detail ──▶ related technologies, partners, themes
├── Technologies ─────── Technology detail ─▶ related projects, resources
├── Thematic ─────────── Theme detail ──────▶ related projects, technologies, resources
├── Partners ─────────── Partner detail ────▶ projects implemented
├── Resources ────────── Resource detail
├── Updates
│   ├── Events ───────── Event detail
│   ├── Opportunities ── Opportunity detail (Tenders is a filtered view)
│   └── News ─────────── Article
├── Map
├── About · Contact · Accessibility · Data (open data) · Newsletter · Search
│
├── Partner Portal      register · login · dashboard · submit content
└── Admin Portal        dashboard · analytics · reports · content · review queue ·
                        users · submissions · newsletter · audit · site config
```

Navigation groups Events, Opportunities and News under a single **Updates** dropdown, so
the top level stays at eight items and each item is a distinct kind of thing. Tenders is a
filtered view of Opportunities rather than a separate destination.

---

## 3. User journeys

**Public researcher — "which solar irrigation projects run in Northern Uganda?"**
Home → Projects → filter Region = Northern Uganda, Technology = Solar Water Pumping →
scan results → open a project → read details, see implementing partners → download the PDF
factsheet.

**Development partner — "who works on post-harvest handling?"**
Home → Thematic → Post-harvest → see the projects, technologies and resources grouped
under the theme → follow through to the partner directory.

**Contributing organisation — "publish our project."**
Partner Portal → Register → (await approval) → Login → Submit → Project → complete form →
submitted as pending → track status on dashboard → receive approval or notes.

**NREP reviewer — "clear today's queue."**
Admin → Review Queue → open item → verify → approve or reject with notes → item leaves the
queue and the action is audited.

**NREP officer — "produce this month's figures."**
Admin → Reports → select report and period → Generate → read on screen → download PDF for
the progress report and Excel for further analysis.

---

## 4. Design system

### 4.1 Colour

| Role | Token | Value | Usage |
|---|---|---|---|
| Brand | `primary-700/800` | `#15803d` / `#166534` | Primary actions, links, page mastheads |
| Brand tints | `primary-50/100` | `#f0fdf4` / `#dcfce7` | Active states, subtle fills |
| Secondary | `secondary-500` | `#f59e0b` | Sparing highlights (featured markers) |
| Accent | `accent-500` | `#0ea5e9` | Data visualisation, charts |
| Ink | `ink-50` … `ink-900` | `#f8f8f6` … `#1a1815` | Warm neutrals carrying the whole layout — text, borders, surfaces |
| Status | green / amber / blue / grey | | Active, pending, completed, archived |

Colour never carries meaning alone; status is always accompanied by a text label.

### 4.2 Typography

| Role | Family | Usage |
|---|---|---|
| Display | Source Serif 4 | Page and section titles — institutional authority |
| Interface | Inter | Body text, controls, tables, data |

A type scale of six steps is used throughout; no page introduces its own sizes.

### 4.3 Components

| Component | Behaviour |
|---|---|
| **Card** | White surface, 12px radius, 1px `ink-200` border, subtle shadow; hover lifts 2px and warms the border |
| **Button** | `.btn` base with `primary` (filled), `secondary` (outlined) and `ghost` variants; 40px minimum height for touch |
| **Badge** | Rounded status pill, colour plus text label |
| **Filter bar** | Always visible above a directory; selections reflected in the URL |
| **Table** | Left-aligned first column, right-aligned numerics with tabular figures, hairline row separators, horizontal scroll on narrow screens |
| **Download menu** | Button plus dropdown offering PDF and Excel; closes on outside click, Escape, or focus leaving the group |
| **Empty state** | Explains why a list is empty and offers the action that resolves it |
| **Icons** | One line-icon family at 1.5px stroke; decorative icons are `aria-hidden` |

### 4.4 Layout and breakpoints

A 1440px (90rem) maximum content width with a consistent page gutter that widens at 640px
and 1024px. Breakpoints: 640px (small),
768px (tablet), 1024px, 1280px (desktop navigation). Directory grids run 1 / 2 / 3 columns
across those breakpoints. The admin sidebar collapses to a drawer below 1024px.

---

## 5. Key screen specifications

**Homepage.** Hero with the platform's purpose and a search entry point; headline
statistics; featured projects; latest news; featured technologies and thematic areas;
newsletter sign-up. All content configurable from the admin portal.

**Directory page.** Page header with title and one-line purpose; filter bar; result count;
card grid; empty state when filters exclude everything.

**Detail page.** Breadcrumb; green masthead carrying status badges, title, summary and the
Download control; two-column body — narrative on the left, key facts and related records on
the right. Collapses to a single column on handsets.

**Map.** Full-width map with regional shading, project markers, a legend, and a summary
panel; a link to the underlying open data.

**Admin list.** Page header with a primary action; search and status filter; dense table
with row actions.

**Admin form.** Single column, grouped fieldsets, required-field marking, inline
validation, relationship pickers, media upload, publish and feature toggles, save/cancel
pinned in view.

**Reports.** Report and period selector as a plain form; generated report with summary
tiles, then sections as charts or tables; PDF and Excel actions in the report header.

---

## 6. Accessibility specification

Target: **WCAG 2.1 Level AA**.

| Requirement | Implementation |
|---|---|
| Keyboard operability | Every interactive element reachable and operable by keyboard; dropdowns close on Escape and return focus to their trigger |
| Focus visibility | Visible focus ring on all focusable elements |
| Skip link | "Skip to main content" as the first focusable element |
| Landmarks | `header`, `nav`, `main`, `footer` on every page; navigation regions labelled |
| Current location | `aria-current="page"` on the active navigation item |
| Contrast | Text meets 4.5:1; large text and UI borders meet 3:1 |
| Forms | Every control has a persistent visible label; errors are announced in text |
| Icons | Decorative icons hidden from assistive technology; standalone icon controls carry accessible names |
| Motion | Animation suppressed under `prefers-reduced-motion` |
| Enforcement | `eslint-plugin-jsx-a11y` runs as part of lint |

---

## 7. Content design

- Sentence case for headings and buttons.
- Buttons name the action: "Generate", "Download PDF", "Approve" — never "Submit" alone.
- Dates render as `22 July 2026`; numbers are grouped; currency is prefixed with its code
  (`USD 285,000`).
- Empty states say what is missing and what to do about it.
- Every figure that is self-reported by a third party is labelled as such where it is
  displayed.

---

## 8. Internationalisation

Interface strings live in `UI/messages/{en,fr,sw}.json` and are resolved through
`next-intl`. Layouts are built to tolerate the ~30% expansion typical of French. Adding a
language means adding one catalogue file and one entry in the language selector.

---

## 9. Design assets

The delivered source is the authoritative design artefact:

| Asset | Location |
|---|---|
| Design tokens (colour, type, shadow, radius) | `UI/app/globals.css` (`@theme` block) |
| Component patterns | `UI/components/` |
| Icon set | `UI/components/shared/icons.tsx` |
| Interface copy | `UI/messages/` |

`[TO BE COMPLETED: attach the wireframe and prototype files reviewed with NREP during the
design phase, and the record of design sign-off, if a design tool such as Figma was used
alongside the implemented interface.]`
