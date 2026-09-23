// Shared field definitions for partner content submission.
// Plain module (no "use client") so both the server page and the client
// form can import the actual objects.

// One definition of which opportunity types are a job advert, shared with
// the admin schema — two copies would drift and partners would end up
// filling in a different vacancy form from staff.
import {
  JOB_TYPES,
  NON_JOB_TYPES,
  ORGANIZATION_TYPES,
  FUNDER_TYPES,
} from "@/components/admin/contentSchemas";

export type FieldType =
  | "text"
  | "textarea"
  // CKEditor. Stores HTML rather than plain text; the API sanitises it on
  // write (App\Support\HtmlSanitizer) and the public page renders it
  // through <RichText>.
  | "richtext"
  | "date"
  // Month-precision dates (project start/end). A plain text box asking for
  // "YYYY-MM" is a free-text field that silently accepts anything; the
  // native month picker cannot produce a malformed value.
  | "month"
  | "checkbox"
  | "select"
  | "multiselect"
  | "upload-image"
  | "upload-document"
  // The three below exist so a partner-authored record can hold everything an
  // administrator's can. Without them a partner submission arrived without a
  // map pin, without supporting documents and without a photo gallery, and
  // someone at NREP had to open the record and add them by hand — which is
  // precisely the re-typing self-service is supposed to remove.
  | "location"
  | "gallery"
  | "attachments"
  | "tags";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: { id: string; label: string }[];
  optionsFrom?: OptionsFrom;
  dependsOn?: string;
  multiple?: boolean;
  group?: string;
  default?: string;
  /**
   * Render this field only while another field holds one of these values.
   * Added for the project partner email, which is meaningless until a
   * partner role has been chosen and whose label depends on that choice.
   */
  showWhen?: { key: string; equals: string[] };
  /**
   * Relabel this field based on another field's value — one shared column
   * reading as "Deadline" on a grant and "Application deadline" on a
   * vacancy. Independent of `showWhen`: a field can be relabelled without
   * being conditional, and vice versa.
   */
  labelWhen?: { key: string; labels: Record<string, string> };
}

export type OptionsFrom =
  // Every partner, searchable. Deliberately NOT filtered by partner type:
  // one shared type filter drove all three partner fields on the project
  // form, so changing it on one rewrote the options under the other two.
  | "partners"
  | "technologies"
  | "themes"
  | "taxonomy:partnerTypes"
  | "taxonomy:technologyCategories"
  | "taxonomy:projectStatuses"
  | "taxonomy:valueChains"
  | "regions"
  | "districts-by-region"
  | "technologyStatuses";

export const TYPE_LABELS: Record<string, string> = {
  projects: "Project",
  technologies: "Technology",
  resources: "Resource",
  events: "Event",
  opportunities: "Opportunity",
};

export const FIELD_SCHEMAS: Record<string, FieldDef[]> = {
  projects: [
    { key: "title", label: "Project title", type: "text", required: true },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Full description", type: "textarea" },
    // One control covering region, district, multi-district coverage, the map
    // pin and the location note — the same LocationPicker the admin form uses,
    // so a partner-entered project appears on the map like any other.
    { key: "location", label: "Location & coverage", type: "location", required: true },
    { key: "valueChain", label: "Value chain", type: "select", optionsFrom: "taxonomy:valueChains" },
    { key: "status", label: "Status", type: "select", optionsFrom: "taxonomy:projectStatuses", default: "Active" },
    // One partner, named by role and email address. The API resolves the
    // address to a registered partner and writes through to the funding /
    // implementing fields the public project page renders, and the address
    // is notified when the project is published.
    {
      key: "partnerRole",
      label: "Partner role",
      type: "select",
      options: [
        { id: "funding", label: "Funding partner" },
        { id: "implementing", label: "Implementing partner" },
      ],
    },
    {
      key: "partnerEmail",
      label: "Partner email",
      type: "text",
      showWhen: { key: "partnerRole", equals: ["funding", "implementing"] },
      labelWhen: {
        key: "partnerRole",
        labels: {
          funding: "Funding partner email",
          implementing: "Implementing partner email",
        },
      },
      help: "They are notified by email — and in the portal, if the address has an account — once this project is published.",
    },
    { key: "technologyIds", label: "Technologies", type: "multiselect", optionsFrom: "technologies" },
    { key: "themeIds", label: "Thematic areas", type: "multiselect", optionsFrom: "themes" },
    { key: "beneficiaryCount", label: "Beneficiary count", type: "text" },
    { key: "budget", label: "Budget amount", type: "text" },
    { key: "budgetCurrency", label: "Budget currency", type: "text" },
    { key: "startDate", label: "Start date", type: "month" },
    { key: "endDate", label: "End date", type: "month" },
    { key: "beneficiaries", label: "Beneficiary groups", type: "tags", help: "Press Enter after each group, e.g. Smallholder farmers, Women's cooperatives." },
    { key: "outcomes", label: "Outcomes & results", type: "textarea" },
    { key: "externalUrl", label: "External link", type: "text" },
    { key: "featuredImage", label: "Featured image", type: "upload-image" },
    { key: "gallery", label: "Photo gallery", type: "gallery", help: "Additional photographs shown on the project page." },
    { key: "attachments", label: "Attachments", type: "attachments", help: "Reports, factsheets or briefs visitors can download from the project page." },
    { key: "notifyPartnerIds", label: "Partners to notify on publish", type: "multiselect", optionsFrom: "partners", help: "Collaborative / funding partners to notify when this item is published." },
  ],
  technologies: [
    { key: "name", label: "Technology name", type: "text", required: true },
    { key: "category", label: "Category", type: "select", optionsFrom: "taxonomy:technologyCategories" },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Full description", type: "textarea" },
    { key: "applications", label: "Applications", type: "textarea" },
    { key: "benefits", label: "Benefits", type: "textarea" },
    { key: "limitations", label: "Limitations", type: "textarea" },
    { key: "amountUsed", label: "Amount used", type: "text", group: "operationalNotes" },
    { key: "technologyStatus", label: "Technology status", type: "select", optionsFrom: "technologyStatuses", options: [
      { id: "new", label: "New" },
      { id: "existing", label: "Existing" },
      { id: "bought", label: "Bought" },
    ], group: "operationalNotes" },
    { key: "notes", label: "Operational notes", type: "textarea", group: "operationalNotes" },
    { key: "maintenanceNotes", label: "Maintenance notes", type: "textarea", help: "Servicing intervals, spare parts, common faults." },
    { key: "featuredImage", label: "Technology image", type: "upload-image" },
  ],
  resources: [
    { key: "title", label: "Resource title", type: "text", required: true },
    { key: "type", label: "Type (e.g. Report, Guide)", type: "text" },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "externalUrl", label: "Link to document (or upload below)", type: "text" },
    { key: "fileUrl", label: "Upload document", type: "upload-document" },
    { key: "publicationDate", label: "Publication date", type: "date" },
    { key: "featuredImage", label: "Cover image", type: "upload-image" },
    { key: "fileDownloadable", label: "Allow download", type: "checkbox", help: "Leave unchecked to make this file view-only: it can be read in full on the page, but not downloaded or shared as a file." },
  ],
  events: [
    { key: "title", label: "Event title", type: "text", required: true },
    { key: "type", label: "Type (webinar, workshop…)", type: "text" },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Details", type: "textarea" },
    { key: "startsAt", label: "Starts", type: "date" },
    { key: "endsAt", label: "Ends", type: "date" },
    { key: "isOnline", label: "Online event", type: "checkbox" },
    { key: "location", label: "Location / platform", type: "text" },
    { key: "registrationUrl", label: "Registration link", type: "text" },
    { key: "featuredImage", label: "Event image", type: "upload-image" },
  ],
  opportunities: [
    { key: "title", label: "Opportunity title", type: "text", required: true },
    // Without this a partner could only ever post a generic "funding"
    // opportunity — tenders, procurement notices and vacancies were listed as
    // supported but reachable only from the admin form.
    {
      key: "opportunityType",
      label: "Opportunity type",
      type: "select",
      required: true,
      default: "Select a type…",
      options: [
        { id: "funding", label: "Funding / grant" },
        { id: "investment", label: "Investment" },
        { id: "tender", label: "Tender" },
        { id: "procurement", label: "Procurement" },
        // One merged option — a job and a vacancy are the same posting.
        { id: "job", label: "Job / Vacancy" },
      ],
    },
    // ── Mirrors components/admin/contentSchemas.ts; change the two together
    //    or partners and staff capture different things about the same
    //    record. ──
    { key: "organization", label: "Organization", type: "text", showWhen: { key: "opportunityType", equals: ORGANIZATION_TYPES } },
    { key: "funder", label: "Funder", type: "text", showWhen: { key: "opportunityType", equals: FUNDER_TYPES } },
    { key: "summary", label: "Summary", type: "textarea", required: true, help: "Plain text, shown on listing cards.", labelWhen: { key: "opportunityType", labels: { job: "Listing teaser" } } },
    { key: "description", label: "Details", type: "richtext", labelWhen: { key: "opportunityType", labels: { job: "Job Summary" } } },
    { key: "dutiesResponsibilities", label: "Duties And Responsibilities", type: "richtext", showWhen: { key: "opportunityType", equals: JOB_TYPES } },
    { key: "minimumEducation", label: "Minimum Education", type: "text", showWhen: { key: "opportunityType", equals: JOB_TYPES } },
    { key: "experience", label: "Experience", type: "text", showWhen: { key: "opportunityType", equals: JOB_TYPES } },
    { key: "competences", label: "Competences", type: "richtext", showWhen: { key: "opportunityType", equals: JOB_TYPES } },
    { key: "amount", label: "Amount", type: "text", labelWhen: { key: "opportunityType", labels: { job: "Salary / remuneration" } } },
    { key: "currency", label: "Currency", type: "text" },
    { key: "sector", label: "Sector", type: "text" },
    { key: "valueChain", label: "Value chain", type: "select", optionsFrom: "taxonomy:valueChains" },
    { key: "region", label: "Region", type: "select", optionsFrom: "regions", labelWhen: { key: "opportunityType", labels: { job: "Duty station" } } },
    { key: "deadline", label: "Deadline", type: "date", labelWhen: { key: "opportunityType", labels: { job: "Application deadline" } } },
    { key: "eligibility", label: "Eligibility", type: "textarea", showWhen: { key: "opportunityType", equals: NON_JOB_TYPES } },
    { key: "externalUrl", label: "Application link", type: "text" },
    { key: "documentUrl", label: "Upload File", type: "upload-document", help: "The tender notice, call document or job description.", labelWhen: { key: "opportunityType", labels: { tender: "Tender document", procurement: "Procurement notice", job: "Job description" } } },
  ],
};
