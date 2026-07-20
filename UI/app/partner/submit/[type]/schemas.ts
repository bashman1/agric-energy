// Shared field definitions for partner content submission.
// Plain module (no "use client") so both the server page and the client
// form can import the actual objects.

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "checkbox"
  | "upload-image"
  | "upload-document";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
}

export const TYPE_LABELS: Record<string, string> = {
  projects: "Project",
  technologies: "Technology",
  resources: "Resource",
  events: "Event",
  opportunities: "Opportunity",
};

// Core fields partners fill in; admins can enrich (relations, media) on review.
export const FIELD_SCHEMAS: Record<string, FieldDef[]> = {
  projects: [
    { key: "title", label: "Project title", type: "text", required: true },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Full description", type: "textarea" },
    { key: "region", label: "Region", type: "text" },
    { key: "district", label: "District", type: "text" },
    { key: "valueChain", label: "Value chain", type: "text" },
    { key: "fundingPartner", label: "Funding partner", type: "text" },
    { key: "startDate", label: "Start (YYYY-MM)", type: "text" },
    { key: "endDate", label: "End (YYYY-MM)", type: "text" },
    { key: "externalUrl", label: "External link", type: "text" },
    { key: "featuredImage", label: "Featured image", type: "upload-image" },
  ],
  technologies: [
    { key: "name", label: "Technology name", type: "text", required: true },
    { key: "category", label: "Category", type: "text" },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Full description", type: "textarea" },
  ],
  resources: [
    { key: "title", label: "Resource title", type: "text", required: true },
    { key: "type", label: "Type (e.g. Report, Guide)", type: "text" },
    { key: "summary", label: "Summary", type: "textarea", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "externalUrl", label: "Link to document (or upload below)", type: "text" },
    { key: "fileUrl", label: "Upload document", type: "upload-document" },
    { key: "publicationDate", label: "Publication date (YYYY-MM-DD)", type: "text" },
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
    { key: "deadline", label: "Deadline (YYYY-MM-DD)", type: "date" },
    { key: "eligibility", label: "Eligibility", type: "textarea" },
    { key: "externalUrl", label: "Application link", type: "text" },
  ],
};
