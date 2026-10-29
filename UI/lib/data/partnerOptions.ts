// ============================================================
// Partner registration option lists.
//
// Static, UI-only vocabularies for the Organization registration
// wizard (`app/partner/register`). These lists come from the product
// spec and intentionally differ from the backend taxonomy groups
// (value_chains, partner_types, …), so they live here as `as const`
// arrays rather than being fetched. Regions/districts are NOT here —
// those reuse UGANDA_REGIONS (lib/geography/nominatim) and
// fetchDistrictMeta (lib/geo/ugandaGeo).
// ============================================================

/** Organization Category — required single-select. */
export const ORG_CATEGORIES = [
  "Government Ministry",
  "Government Department",
  "Government Agency",
  "Local Government (District/City/Municipality)",
  "Civil Society Organization (CSO)",
  "Community-Based Organization (CBO)",
  "Non-Governmental Organization (NGO)",
  "Farmer Organization / Cooperative",
  "Farmer Producer Organization (FPO)",
  "Private Company",
  "SME / Enterprise",
  "Financial Institution",
  "SACCO",
  "Academic Institution",
  "Research Institution",
  "Development Partner / Donor",
  "International Organization",
  "Business Membership Organization",
  "Renewable Energy Association",
  "Agricultural Association",
  "Incubator / Innovation Hub",
  "Consultancy Firm",
  "Media Organization",
  "Community of Practice",
  "Other",
] as const;

/** Sector of Operation — multiple selection. */
export const SECTORS = [
  "Renewable Energy",
  "Agriculture",
  "Livestock",
  "Fisheries",
  "Forestry",
  "Climate Change",
  "Water",
  "Environment",
  "Finance",
  "ICT",
  "Education",
  "Research",
  "Entrepreneurship",
  "Manufacturing",
  "Food Processing",
  "Gender & Social Inclusion",
  "Youth Development",
  "Policy & Governance",
  "Health",
  "Other",
] as const;

/** Value Chain Focus — multiple selection. */
export const VALUE_CHAINS = [
  "Coffee",
  "Dairy",
  "Poultry",
  "Horticulture",
  "Cereals",
  "Oil Seeds",
  "Aquaculture",
  "Piggery",
  "Beekeeping",
  "Fruits",
  "Vegetables",
  "Cassava",
  "Maize",
  "Beans",
  "Rice",
  "Cotton",
  "Sugar",
  "Other",
] as const;

/**
 * Most areas of expertise a profile may claim — enough to describe a
 * practice, not so many it reads as a catalogue. The API enforces the same
 * number (AuthController `expertise` `max:5`); change them together.
 */
export const MAX_EXPERTISE = 5;

/** Areas of Expertise — checkbox group. */
export const EXPERTISE_AREAS = [
  "Research",
  "Policy",
  "Capacity Building",
  "Financing",
  "Technology Development",
  "Technology Distribution",
  "Manufacturing",
  "Project Implementation",
  "Monitoring & Evaluation",
  "Knowledge Management",
  "Digital Solutions",
  "Gender Mainstreaming",
  "Advocacy",
  "Market Linkages",
  "Investment",
  "Extension Services",
] as const;

/** Geographic Coverage scope — single-select. */
export const COVERAGE_SCOPES = [
  "National",
  "International",
] as const;

/** Organization Profile — indicative size bands. */
export const EMPLOYEE_BANDS = [
  "1–10",
  "11–50",
  "51–100",
  "101–250",
  "251–500",
  "500+",
] as const;

export const BRANCH_BANDS = ["1", "2–5", "6–10", "11–25", "25+"] as const;

export const BENEFICIARY_BANDS = [
  "Under 100",
  "100–1,000",
  "1,000–10,000",
  "10,000–50,000",
  "50,000–100,000",
  "100,000+",
] as const;

/** Annual budget range (optional). */
export const ANNUAL_BUDGET_RANGES = [
  "Under $10,000",
  "$10,000 – $50,000",
  "$50,000 – $250,000",
  "$250,000 – $1M",
  "$1M – $5M",
  "Over $5M",
] as const;

/**
 * Country list for the International coverage case. Uganda first, then
 * the East African neighbours, then the rest alphabetically.
 */
export const COUNTRIES = [
  "Uganda",
  "Kenya",
  "Tanzania",
  "Rwanda",
  "Burundi",
  "South Sudan",
  "Democratic Republic of the Congo",
  "Ethiopia",
  "Somalia",
  "Nigeria",
  "Ghana",
  "South Africa",
  "Zambia",
  "Malawi",
  "Mozambique",
  "Zimbabwe",
  "Egypt",
  "Morocco",
  "Belgium",
  "Denmark",
  "France",
  "Germany",
  "Italy",
  "Netherlands",
  "Norway",
  "Sweden",
  "Switzerland",
  "United Kingdom",
  "United States",
  "Canada",
  "China",
  "India",
  "Japan",
  "Other",
] as const;

/** Helper: build ComboSelect options ({id,label}) from a string list. */
export function toOptions(values: readonly string[]): { id: string; label: string }[] {
  return values.map((v) => ({ id: v, label: v }));
}
