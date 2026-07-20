/**
 * Nominatim (OpenStreetMap) geocoding service
 * Free, no API key required, respects Uganda admin hierarchy
 * Rate limit: 1 req/sec — we debounce in the UI layer
 */

const BASE = "https://nominatim.openstreetmap.org";
const HEADERS = { "Accept-Language": "en", "User-Agent": "AgriEnergyDesk/1.0" };

export interface NominatimResult {
  place_id: number;
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
  address: {
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    state_district?: string;
    state?: string;
    region?: string;
    country?: string;
  };
  type: string;
  class: string;
}

export interface PlaceSuggestion {
  displayName: string;     // e.g. "Gulu District, Northern Uganda"
  shortName: string;       // e.g. "Gulu District"
  district: string;        // e.g. "Gulu District"
  region: string;          // e.g. "Northern Uganda"
  lat: number;
  lng: number;
  bbox: [number, number, number, number]; // [south, north, west, east]
}

export interface BoundingBox {
  south: number;
  north: number;
  west: number;
  east: number;
}

// Uganda's 4 regions as constants (used for filter dropdowns)
export const UGANDA_REGIONS = [
  "Northern Uganda",
  "Eastern Uganda",
  "Central Uganda",
  "Western Uganda",
] as const;

export type UgandaRegion = (typeof UGANDA_REGIONS)[number];

/**
 * Search places in Uganda — used by LocationPicker autocomplete
 */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: `${query}, Uganda`,
    format: "json",
    countrycodes: "ug",
    addressdetails: "1",
    limit: "8",
    dedupe: "1",
  });
  try {
    const res = await fetch(`${BASE}/search?${params}`, { headers: HEADERS });
    if (!res.ok) return [];
    const data: NominatimResult[] = await res.json();
    return data
      .filter((r) => r.address?.country === "Uganda")
      .map((r) => normalizeSuggestion(r))
      .filter((s) => s.district || s.region);
  } catch {
    return [];
  }
}

/**
 * Get the bounding box for a named place in Uganda — used by map fly-to
 * Returns null if not found
 */
export async function getPlaceBounds(query: string): Promise<BoundingBox | null> {
  const params = new URLSearchParams({
    q: `${query}, Uganda`,
    format: "json",
    countrycodes: "ug",
    limit: "1",
  });
  try {
    const res = await fetch(`${BASE}/search?${params}`, { headers: HEADERS });
    if (!res.ok) return null;
    const data: NominatimResult[] = await res.json();
    if (!data.length) return null;
    const [south, north, west, east] = data[0].boundingbox;
    return {
      south: parseFloat(south),
      north: parseFloat(north),
      west: parseFloat(west),
      east: parseFloat(east),
    };
  } catch {
    return null;
  }
}

/**
 * Reverse geocode lat/lng → region + district names
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{ region: string; district: string } | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    addressdetails: "1",
    zoom: "10",
  });
  try {
    const res = await fetch(`${BASE}/reverse?${params}`, { headers: HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address ?? {};
    return {
      district: extractDistrict(addr),
      region: extractRegion(addr),
    };
  } catch {
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractDistrict(addr: NominatimResult["address"]): string {
  const raw = addr.county ?? addr.state_district ?? addr.city ?? addr.town ?? "";
  if (!raw) return "";
  // Ensure it ends with "District"
  return raw.includes("District") ? raw : `${raw} District`;
}

function extractRegion(addr: NominatimResult["address"]): string {
  const raw = addr.region ?? addr.state ?? "";
  if (!raw) return "Uganda";
  // Normalise to "Northern Uganda" format
  const name = raw
    .replace(/\s+Region$/i, "")
    .replace(/\s+Uganda$/i, "")
    .trim();
  const match = UGANDA_REGIONS.find((r) =>
    r.toLowerCase().startsWith(name.toLowerCase())
  );
  return match ?? (raw.includes("Uganda") ? raw : `${name} Uganda`);
}

function normalizeSuggestion(r: NominatimResult): PlaceSuggestion {
  const lat = parseFloat(r.lat);
  const lng = parseFloat(r.lon);
  const [south, north, west, east] = r.boundingbox;

  const district = extractDistrict(r.address);
  const region = extractRegion(r.address);
  const shortName = district || region;

  // Human-readable display name
  const displayName = [district, region].filter(Boolean).join(", ") || r.display_name;

  return {
    displayName,
    shortName,
    district,
    region,
    lat,
    lng,
    bbox: [parseFloat(south), parseFloat(north), parseFloat(west), parseFloat(east)],
  };
}
