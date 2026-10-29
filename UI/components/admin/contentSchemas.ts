// ============================================================
// Admin content schemas — field definitions per content module.
// Plain module (no "use client") so both the server pages and the
// client form can import the actual objects. Mirrors the idiom in
// app/partner/submit/[type]/schemas.ts.
// ============================================================

export type ContentModule =
  | "posts"
  | "events"
  | "opportunities"
  | "policies"
  | "themes"
  | "technologies"
  | "resources";

export type ContentFieldType =
  | "text"
  | "url"
  | "textarea"
  /**
   * CKEditor. Stores HTML, unlike "textarea" which stores plain text, so
   * only use it for fields the public page renders through <RichText>.
   */
  | "richtext"
  | "select"
  | "date"
  | "datetime"
  | "checkbox"
  | "list"
  | "upload-image"
  | "upload-document"
  | "upload-gallery";

export interface SelectOption {
  value: string;
  label: string;
}

export interface ContentFieldDef {
  key: string;
  label: string;
  type: ContentFieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  /** Rows for textareas (default 4). */
  rows?: number;
  /** Options for `select` fields. */
  options?: SelectOption[];
  /** Render at half width inside the two-column grid. */
  half?: boolean;
  /**
   * Show this field only while another field holds one of these values.
   * Added for the job/vacancy fields, which are meaningless on a grant or a
   * tender. Mirrors `showWhen` on the partner submission schema.
   */
  showWhen?: { key: string; equals: string[] };
  /**
   * Relabel this field based on another field's value — how one shared
   * column reads as "Deadline" on a grant and "Application deadline" on a
   * vacancy. Independent of `showWhen`: a field can be relabelled without
   * being conditional, and vice versa.
   */
  labelWhen?: { key: string; labels: Record<string, string> };
}

export interface ContentModuleDef {
  module: ContentModule;
  /** Singular noun used in headings and buttons ("Post"). */
  singular: string;
  /** Plural noun used in breadcrumbs and list headings ("Posts"). */
  plural: string;
  /** Admin list route, e.g. /admin/posts */
  adminPath: string;
  /** Public detail route prefix, e.g. /news */
  publicPath: string;
  /** Next proxy write route prefix, e.g. /api/posts */
  /** Laravel resource segment, e.g. "posts". lib/api/client adds /api/v1. */
  apiPath: string;
  fields: ContentFieldDef[];
}

/**
 * Opportunities split into two shapes, and the field gates follow that
 * split rather than being listed type by type.
 *
 * A grant or an investment call is a FUNDING opportunity: it has a funder,
 * a money amount, a sector and value chain, a region and eligibility rules,
 * and it links out to an application page.
 *
 * A vacancy, tender or procurement notice is issued by an ORGANIZATION. It
 * carries none of that — the money, scope and requirements live in the
 * posting itself or in the attached document, and applications go to an
 * email address rather than a portal.
 */
export const FUNDER_TYPES = ["funding", "investment"];
export const ORGANIZATION_TYPES = ["job", "tender", "procurement"];

/** Vacancy-only fields (duties, education, experience, competences). */
export const JOB_TYPES = ["job"];

/**
 * Types that link out to an application page. A tender points at its
 * uploaded document and its application email instead.
 */
export const APPLICATION_LINK_TYPES = [...FUNDER_TYPES, "job"];

export const CONTENT_SCHEMAS: Record<ContentModule, ContentModuleDef> = {
  posts: {
    module: "posts",
    singular: "Post",
    plural: "Posts",
    adminPath: "/admin/posts",
    publicPath: "/news",
    apiPath: "posts",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Solar irrigation reaches 500 farmers in Dokolo" },
      {
        key: "category",
        label: "Category",
        type: "select",
        required: true,
        half: true,
        options: [
          { value: "news", label: "News" },
          { value: "story", label: "Impact story" },
          { value: "press_release", label: "Press release" },
          { value: "announcement", label: "Announcement" },
        ],
      },
      { key: "publishedAt", label: "Publication date", type: "date", half: true, help: "Leave blank to use today's date." },
      { key: "excerpt", label: "Excerpt", type: "textarea", required: true, rows: 2, placeholder: "One to two sentence summary shown in listings" },
      { key: "body", label: "Body", type: "textarea", rows: 14, placeholder: "Full article text…" },
      { key: "featuredImage", label: "Featured image", type: "upload-image" },
      { key: "gallery", label: "Gallery", type: "upload-gallery", help: "Additional images shown in the article gallery." },
    ],
  },

  events: {
    module: "events",
    singular: "Event",
    plural: "Events",
    adminPath: "/admin/events",
    publicPath: "/events",
    apiPath: "events",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Agri-Energy Financing Webinar" },
      { key: "type", label: "Type", type: "text", half: true, placeholder: "Webinar, workshop, conference…" },
      { key: "location", label: "Location / platform", type: "text", half: true, placeholder: "Kampala, or Zoom" },
      { key: "summary", label: "Summary", type: "textarea", required: true, rows: 2, placeholder: "One to two sentence event summary" },
      { key: "description", label: "Details", type: "textarea", rows: 8, placeholder: "Agenda, speakers, who should attend…" },
      { key: "startsAt", label: "Starts at", type: "datetime", half: true },
      { key: "endsAt", label: "Ends at", type: "datetime", half: true },
      { key: "isOnline", label: "Online event", type: "checkbox" },
      { key: "registrationUrl", label: "Registration link", type: "url", placeholder: "https://…" },
      { key: "featuredImage", label: "Event image", type: "upload-image" },
    ],
  },

  opportunities: {
    module: "opportunities",
    singular: "Opportunity",
    plural: "Opportunities",
    adminPath: "/admin/opportunities",
    publicPath: "/opportunities",
    apiPath: "opportunities",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Solar Irrigation Equipment Tender — Lira", labelWhen: { key: "opportunityType", labels: { job: "Job Title" } } },
      {
        key: "opportunityType",
        label: "Opportunity type",
        type: "select",
        required: true,
        half: true,
        options: [
          { value: "funding", label: "Funding / grant" },
          { value: "investment", label: "Investment" },
          { value: "tender", label: "Tender" },
          { value: "procurement", label: "Procurement" },
          // One merged option: a job and a vacancy are the same posting, and
          // offering both invited editors to guess which listing they land in.
          { value: "job", label: "Job / Vacancy" },
        ],
      },
      // ── Who issued it — one field or the other, never both ──
      { key: "organization", label: "Organization", type: "text", half: true, showWhen: { key: "opportunityType", equals: ORGANIZATION_TYPES }, placeholder: "e.g. Ministry of Energy and Mineral Development" },
      { key: "funder", label: "Funder", type: "text", half: true, showWhen: { key: "opportunityType", equals: FUNDER_TYPES } },
      // Funding calls keep a short plain teaser. Vacancies and tenders drop
      // it — listings and search fall back to an excerpt of the rich field
      // below (see htmlToText in lib/html/sanitize.ts and SearchController).
      { key: "summary", label: "Summary", type: "textarea", required: true, rows: 2, placeholder: "One to two sentence summary", showWhen: { key: "opportunityType", equals: FUNDER_TYPES }, help: "Plain text, shown on listing cards and search results." },
      { key: "description", label: "Details", type: "richtext", rows: 8, labelWhen: { key: "opportunityType", labels: { job: "Job Summary" } } },
      // ── Vacancy only ──
      { key: "dutiesResponsibilities", label: "Duties And Responsibilities", type: "richtext", showWhen: { key: "opportunityType", equals: JOB_TYPES } },
      { key: "minimumEducation", label: "Minimum Education", type: "richtext", showWhen: { key: "opportunityType", equals: JOB_TYPES } },
      { key: "experience", label: "Experience", type: "richtext", showWhen: { key: "opportunityType", equals: JOB_TYPES } },
      { key: "competences", label: "Competences", type: "richtext", showWhen: { key: "opportunityType", equals: JOB_TYPES } },
      // ── Funding calls only ──
      { key: "amount", label: "Amount", type: "text", half: true, placeholder: "e.g. 250,000", showWhen: { key: "opportunityType", equals: FUNDER_TYPES } },
      { key: "currency", label: "Currency", type: "text", half: true, placeholder: "USD, UGX, EUR", showWhen: { key: "opportunityType", equals: FUNDER_TYPES } },
      { key: "sector", label: "Sector", type: "text", half: true, showWhen: { key: "opportunityType", equals: FUNDER_TYPES } },
      { key: "valueChain", label: "Value chain", type: "text", half: true, placeholder: "e.g. Dairy, Rice", showWhen: { key: "opportunityType", equals: FUNDER_TYPES } },
      { key: "region", label: "Region", type: "text", half: true, showWhen: { key: "opportunityType", equals: FUNDER_TYPES } },
      { key: "eligibility", label: "Eligibility", type: "textarea", rows: 4, placeholder: "Who can apply…", showWhen: { key: "opportunityType", equals: FUNDER_TYPES } },
      // ── Shared ──
      { key: "deadline", label: "Deadline", type: "date", half: true, labelWhen: { key: "opportunityType", labels: { job: "Application deadline" } } },
      // Where to send an application when there is no portal to link to.
      { key: "applicationEmail", label: "Submit applications to", type: "text", half: true, showWhen: { key: "opportunityType", equals: ORGANIZATION_TYPES }, placeholder: "recruitment@example.go.ug", help: "Email address applications or bids are sent to." },
      { key: "externalUrl", label: "Application link", type: "url", placeholder: "https://…", showWhen: { key: "opportunityType", equals: APPLICATION_LINK_TYPES } },
      // The notice, call document or job description itself. Optional on
      // every type — a tender is the case that needs it, but a grant has
      // guidelines and a vacancy a full JD.
      { key: "documentUrl", label: "Upload File", type: "upload-document", help: "Upload the tender notice, call document or job description — or paste a link below.", labelWhen: { key: "opportunityType", labels: { tender: "Tender document", procurement: "Procurement notice", job: "Job description" } } },
    ],
  },

  policies: {
    module: "policies",
    singular: "Policy",
    plural: "Policies",
    adminPath: "/admin/policies",
    publicPath: "/policies",
    apiPath: "policies",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, placeholder: "e.g. National Renewable Energy Policy" },
      { key: "category", label: "Category", type: "text", half: true, placeholder: "Policy, Regulation, Strategy…" },
      { key: "publicationDate", label: "Publication date", type: "date", half: true },
      { key: "summary", label: "Summary", type: "textarea", required: true, rows: 2, placeholder: "One to two sentence summary" },
      { key: "description", label: "Description", type: "textarea", rows: 8 },
      { key: "documentUrl", label: "Policy document", type: "upload-document", help: "Upload the PDF, or paste a link below." },
    ],
  },

  themes: {
    module: "themes",
    singular: "Theme",
    plural: "Themes",
    adminPath: "/admin/themes",
    publicPath: "/themes",
    apiPath: "themes",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Productive Use of Energy" },
      { key: "icon", label: "Icon", type: "text", half: true, placeholder: "Emoji or icon key" },
      { key: "summary", label: "Summary", type: "textarea", required: true, rows: 2, placeholder: "One to two sentence description shown in listings" },
      { key: "description", label: "Description", type: "textarea", rows: 8 },
      { key: "whyItMatters", label: "Why it matters", type: "textarea", rows: 6, placeholder: "Why this theme matters for agri-energy in Uganda…" },
      { key: "featuredImage", label: "Featured image", type: "upload-image", help: "Cover photo shown on cards and the theme page." },
    ],
  },

  technologies: {
    module: "technologies",
    singular: "Technology",
    plural: "Technologies",
    adminPath: "/admin/technologies",
    publicPath: "/technologies",
    apiPath: "technologies",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Solar Water Pumping" },
      { key: "category", label: "Category", type: "text", half: true, placeholder: "e.g. Solar Energy" },
      { key: "subcategory", label: "Sub-category", type: "text", half: true, placeholder: "e.g. Solar water pumping" },
      { key: "summary", label: "Summary", type: "textarea", required: true, rows: 2, placeholder: "One to two sentence description" },
      { key: "description", label: "Description", type: "textarea", rows: 8 },
      { key: "applications", label: "Applications", type: "list", help: "One per line." },
      { key: "benefits", label: "Benefits", type: "list", help: "One per line." },
      { key: "limitations", label: "Limitations", type: "list", help: "One per line." },
      { key: "operationalNotes", label: "Operational notes", type: "list", help: "One per line." },
      { key: "maintenanceNotes", label: "Maintenance notes", type: "list", help: "One per line." },
      { key: "featuredImage", label: "Featured image", type: "upload-image", help: "Cover photo shown on cards and the technology page." },
    ],
  },

  resources: {
    module: "resources",
    singular: "Resource",
    plural: "Resources",
    adminPath: "/admin/resources",
    publicPath: "/resources",
    apiPath: "resources",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Solar Irrigation Field Guide" },
      { key: "type", label: "Type", type: "text", half: true, placeholder: "Report, Guide, Policy brief…" },
      { key: "publicationDate", label: "Publication date", type: "date", half: true },
      { key: "summary", label: "Summary", type: "textarea", required: true, rows: 2, placeholder: "One to two sentence summary shown in listings" },
      { key: "description", label: "Description", type: "textarea", rows: 8 },
      { key: "fileUrl", label: "File (PDF/document)", type: "upload-document", help: "Upload the file, or paste a link below." },
      { key: "externalUrl", label: "External link", type: "url", placeholder: "https://…" },
      { key: "fileDownloadable", label: "Allow download", type: "checkbox", help: "Uncheck to make this file view-only (no download button)." },
      { key: "featuredImage", label: "Featured image", type: "upload-image", help: "Cover photo shown on cards and the resource page." },
    ],
  },
};
