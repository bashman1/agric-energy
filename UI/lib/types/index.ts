// ============================================================
// Agri-Energy Desk — All TypeScript Type Definitions
// Geography Architecture v3: Nominatim-Powered (plain strings)
// ============================================================

// ─── Coordinates ─────────────────────────────────────────
export interface Coordinates {
  lat: number;
  lng: number;
}

// ─── Project ──────────────────────────────────────────────
/** A downloadable file attached to a project, from the /media upload endpoint. */
export interface ProjectAttachment {
  url: string;
  name: string;
  size?: number;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;

  // Geography — plain strings from Nominatim geocoding
  /** e.g. "Northern Uganda" | "National" */
  region: string;
  /** e.g. "Gulu District" | "Multiple Districts" */
  district: string;
  /** Multi-coverage: list of regions (ADM1) this project covers */
  regions?: string[];
  /** Multi-coverage: list of districts (ADM2) this project covers */
  districts?: string[];
  /** Optional: extra location detail for multi-district or sub-county projects */
  locationNote?: string;
  /** Center coordinate for map marker — auto-filled from Nominatim if not set */
  coordinates: Coordinates;

  implementingPartnerIds: string[];
  fundingPartner: string;
  budget?: number | null;
  budgetCurrency?: string;
  beneficiaryCount?: number | null;
  technologyIds: string[];
  themeIds: string[];
  valueChain: string;
  beneficiaries: string[];
  status: string;
  startDate: string;
  endDate: string;
  outcomes: string;
  featuredImage: string;
  gallery: string[];
  /** Downloadable files (PDFs, docs) shown on the project detail page. */
  attachments?: ProjectAttachment[];
  externalUrl: string;
  featured: boolean;
  published: boolean;
  updatedAt: string;
}

// ─── Technology ───────────────────────────────────────────
export interface Technology {
  id: string;
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  applications: string[];
  benefits: string[];
  limitations: string[];
  operationalNotes: string[];
  maintenanceNotes: string[];
  relatedProjectIds: string[];
  relatedResourceIds: string[];
  featured: boolean;
  published: boolean;
  updatedAt: string;
}

// ─── Theme ────────────────────────────────────────────────
export interface Theme {
  id: string;
  slug: string;
  name: string;
  icon: string;
  summary: string;
  description: string;
  whyItMatters: string;
  relatedTechnologyIds: string[];
  relatedProjectIds: string[];
  relatedResourceIds: string[];
  featured: boolean;
  published: boolean;
  updatedAt: string;
}

// ─── Partner ──────────────────────────────────────────────
export interface Partner {
  id: string;
  slug: string;
  name: string;
  type: string;
  summary: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  logo: string;
  regions: string[];
  districtCoverage: string[];
  technologyIds: string[];
  themeIds: string[];
  projectIds: string[];
  featured: boolean;
  published: boolean;
  updatedAt: string;
  // ── Organization profile (from partner self-registration) ──
  category?: string;
  acronym?: string;
  registrationNumber?: string;
  taxId?: string;
  yearEstablished?: string;
  physicalAddress?: string;
  postalAddress?: string;
  mission?: string;
  employeesBand?: string;
  branchesBand?: string;
  beneficiariesBand?: string;
  annualBudgetRange?: string;
  contactName?: string;
  contactPosition?: string;
  contactEmail?: string;
  contactPhone?: string;
  coverageScope?: string[];
  countries?: string[];
  sectors?: string[];
  valueChains?: string[];
  expertise?: string[];
}

// ─── Resource ─────────────────────────────────────────────
export interface Resource {
  id: string;
  slug: string;
  title: string;
  type: string;
  summary: string;
  description: string;
  fileUrl: string;
  externalUrl: string;
  themeIds: string[];
  technologyIds: string[];
  publicationDate: string;
  featured: boolean;
  published: boolean;
  updatedAt: string;
}

// ─── Event ────────────────────────────────────────────────
export interface Event {
  id: string;
  slug: string;
  title: string;
  type: string;
  summary: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  isOnline: boolean;
  location: string;
  registrationUrl: string;
  featuredImage: string;
  featured: boolean;
  published: boolean;
  updatedAt: string;
}

// ─── Opportunity (funding / investment) ───────────────────
export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  /** funding | investment | tender | procurement */
  opportunityType: string;
  funder: string;
  summary: string;
  description: string;
  amount: string;
  currency: string;
  sector: string;
  valueChain: string;
  region: string;
  deadline: string | null;
  eligibility: string;
  externalUrl: string;
  featured: boolean;
  published: boolean;
  updatedAt: string;
}

// ─── Policy ───────────────────────────────────────────────
export interface Policy {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  documentUrl: string;
  publicationDate: string;
  featured: boolean;
  published: boolean;
  updatedAt: string;
}

// ─── Post (news / announcements) ──────────────────────────
export interface Post {
  id: string;
  slug: string;
  title: string;
  /** news | story | press_release | announcement */
  category: string;
  excerpt: string;
  body: string;
  featuredImage: string;
  gallery: string[];
  publishedAt: string | null;
  featured: boolean;
  published: boolean;
  updatedAt: string;
}

// ─── Taxonomy (non-geography lists) ───────────────────────
export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
}

export interface Taxonomy {
  valueChains: TaxonomyItem[];
  projectStatuses: TaxonomyItem[];
  resourceTypes: TaxonomyItem[];
  partnerTypes: TaxonomyItem[];
  technologyCategories: TaxonomyItem[];
  beneficiaryTags: TaxonomyItem[];
}

// ─── Site Config ──────────────────────────────────────────
export interface HeroConfig {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  backgroundImage: string;
}

export interface StatsConfig {
  projects: number;
  technologies: number;
  themes: number;
  partners: number;
  resources: number;
  districts: number;
}

export interface SiteConfig {
  hero: HeroConfig;
  stats: StatsConfig;
  featuredProjectIds: string[];
  featuredTechnologyIds: string[];
  featuredThemeIds: string[];
  featuredPartnerIds: string[];
  featuredResourceIds: string[];
  contactEmail: string;
  contactPhone: string;
  aboutSummary: string;
}

// ─── Filter Options ───────────────────────────────────────
export interface ProjectFilters {
  search?: string;
  region?: string;       // matches project.region (string)
  district?: string;     // matches project.district (string)
  technologyId?: string;
  themeId?: string;
  valueChain?: string;
  status?: string;
  partnerId?: string;
  featured?: boolean;
  published?: boolean;
}

export interface TechnologyFilters {
  search?: string;
  category?: string;
  themeId?: string;
  featured?: boolean;
  published?: boolean;
}

export interface PartnerFilters {
  search?: string;
  type?: string;
  region?: string;
  featured?: boolean;
  published?: boolean;
}

export interface ResourceFilters {
  search?: string;
  type?: string;
  themeId?: string;
  technologyId?: string;
  featured?: boolean;
  published?: boolean;
}

export interface ThemeFilters {
  search?: string;
  featured?: boolean;
  published?: boolean;
}

// ─── Session ──────────────────────────────────────────────
export interface SessionUser {
  /** Kept for backward compatibility; mirrors the user's email. */
  username: string;
  isLoggedIn: boolean;
  // Sanctum-backed fields
  token?: string;
  userId?: number;
  name?: string;
  email?: string;
  roles?: string[];
  status?: string;
}

// ─── Authenticated user (from /auth/me, /auth/login) ──────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  status: string;
  organisation: string;
  phone: string;
  roles: string[];
  partnerId?: string | null;
  emailVerified: boolean;
}

// ─── API Responses ────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Contact Form Submission ──────────────────────────────
export type SubmissionStatus = "new" | "read" | "responded" | "archived";
export type EmailDeliveryStatus = "not_sent" | "sent" | "failed";

export interface Submission {
  id: string;
  submissionType: string;
  name: string;
  organisation: string;
  email: string;
  subject: string;
  message: string;
  status: SubmissionStatus;
  emailStatus: EmailDeliveryStatus;
  adminNotes: string;
  submittedAt: string;
  updatedAt: string;
}
