// Shared field definitions for partner content submission.
// Plain module (no "use client") so both the server page and the client
// form can import the actual objects.

export type FieldType =
  | "text"
  | "textarea"
  | "date"
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
}

export type OptionsFrom =
  | "partners-by-type"
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
    { key: "fundingPartner", label: "Funding partner", type: "select", optionsFrom: "partners-by-type", multiple: false },
    { key: "implementingPartnerIds", label: "Implementing partners", type: "multiselect", optionsFrom: "partners-by-type" },
    { key: "technologyIds", label: "Technologies", type: "multiselect", optionsFrom: "technologies" },
    { key: "themeIds", label: "Thematic areas", type: "multiselect", optionsFrom: "themes" },
    { key: "beneficiaryCount", label: "Beneficiary count", type: "text" },
    { key: "budget", label: "Budget amount", type: "text" },
    { key: "budgetCurrency", label: "Budget currency", type: "text" },
    { key: "startDate", label: "Start date (YYYY-MM)", type: "text" },
    { key: "endDate", label: "End date (YYYY-MM)", type: "text" },
    { key: "beneficiaries", label: "Beneficiary groups", type: "tags", help: "Press Enter after each group, e.g. Smallholder farmers, Women's cooperatives." },
    { key: "outcomes", label: "Outcomes & results", type: "textarea" },
    { key: "externalUrl", label: "External link", type: "text" },
    { key: "featuredImage", label: "Featured image", type: "upload-image" },
    { key: "gallery", label: "Photo gallery", type: "gallery", help: "Additional photographs shown on the project page." },
    { key: "attachments", label: "Attachments", type: "attachments", help: "Reports, factsheets or briefs visitors can download from the project page." },
    { key: "notifyPartnerIds", label: "Partners to notify on publish", type: "multiselect", optionsFrom: "partners-by-type", help: "Collaborative / funding partners to notify when this item is published." },
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
    { key: "publicationDate", label: "Publication date (YYYY-MM-DD)", type: "text" },
    { key: "featuredImage", label: "Cover image", type: "upload-image" },
    { key: "fileDownloadable", label: "Allow download", type: "checkbox", help: "Leave unchecked to make this file view-only: it can be read in full on the page, but not downloaded or shared as a file." },
  ],
  events: [
    { key: "title", label: "Event title", type: "text", required: true },
    { key: "type", label: "Type (webinar, workshop…)", type: "text" },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Details", type: "textarea" },
    { key: "startsAt", label: "Starts (YYYY-MM-DD)", type: "date" },
    { key: "endsAt", label: "Ends (YYYY-MM-DD)", type: "date" },
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
        { id: "job", label: "Job / vacancy" },
      ],
    },
    { key: "funder", label: "Funder / advertiser", type: "text" },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Details", type: "textarea" },
    { key: "amount", label: "Amount", type: "text" },
    { key: "currency", label: "Currency", type: "text" },
    { key: "sector", label: "Sector", type: "text" },
    { key: "valueChain", label: "Value chain", type: "select", optionsFrom: "taxonomy:valueChains" },
    { key: "region", label: "Region", type: "select", optionsFrom: "regions" },
    { key: "deadline", label: "Deadline (YYYY-MM-DD)", type: "date" },
    { key: "eligibility", label: "Eligibility", type: "textarea" },
    { key: "externalUrl", label: "Application link", type: "text" },
  ],
};
