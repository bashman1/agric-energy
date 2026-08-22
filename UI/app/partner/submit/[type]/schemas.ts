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
  | "upload-document";

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
    { key: "region", label: "Region", type: "select", optionsFrom: "regions", required: true },
    { key: "district", label: "District", type: "select", optionsFrom: "districts-by-region", dependsOn: "region", required: true },
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
    { key: "outcomes", label: "Outcomes & results", type: "textarea" },
    { key: "externalUrl", label: "External link", type: "text" },
    { key: "featuredImage", label: "Featured image", type: "upload-image" },
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
  ],
  resources: [
    { key: "title", label: "Resource title", type: "text", required: true },
    { key: "type", label: "Type (e.g. Report, Guide)", type: "text" },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "externalUrl", label: "Link to document (or upload below)", type: "text" },
    { key: "fileUrl", label: "Upload document", type: "upload-document" },
    { key: "publicationDate", label: "Publication date (YYYY-MM-DD)", type: "text" },
    { key: "fileDownloadable", label: "Allow download", type: "checkbox", help: "Uncheck to make this file view-only (no download button)." },
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
    { key: "funder", label: "Funder", type: "text" },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Details", type: "textarea" },
    { key: "amount", label: "Amount", type: "text" },
    { key: "currency", label: "Currency", type: "text" },
    { key: "sector", label: "Sector", type: "text" },
    { key: "region", label: "Region", type: "select", optionsFrom: "regions" },
    { key: "deadline", label: "Deadline (YYYY-MM-DD)", type: "date" },
    { key: "eligibility", label: "Eligibility", type: "textarea" },
    { key: "externalUrl", label: "Application link", type: "text" },
  ],
};
