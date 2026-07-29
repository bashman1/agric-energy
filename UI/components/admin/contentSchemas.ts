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
      { key: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Solar Irrigation Equipment Tender — Lira" },
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
        ],
      },
      { key: "funder", label: "Funder / issuing body", type: "text", half: true },
      { key: "summary", label: "Summary", type: "textarea", required: true, rows: 2, placeholder: "One to two sentence summary" },
      { key: "description", label: "Details", type: "textarea", rows: 8 },
      { key: "amount", label: "Amount", type: "text", half: true, placeholder: "e.g. 250,000" },
      { key: "currency", label: "Currency", type: "text", half: true, placeholder: "USD, UGX, EUR" },
      { key: "sector", label: "Sector", type: "text", half: true },
      { key: "valueChain", label: "Value chain", type: "text", half: true, placeholder: "e.g. Dairy, Rice" },
      { key: "region", label: "Region", type: "text", half: true },
      { key: "deadline", label: "Deadline", type: "date", half: true },
      { key: "eligibility", label: "Eligibility", type: "textarea", rows: 4, placeholder: "Who can apply…" },
      { key: "externalUrl", label: "Application link", type: "url", placeholder: "https://…" },
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
      { key: "featuredImage", label: "Featured image", type: "upload-image", help: "Cover photo shown on cards and the resource page." },
    ],
  },
};
