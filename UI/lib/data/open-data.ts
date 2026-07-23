// ============================================================
// Open data service — public regional aggregates + dataset
// download URLs exposed by the Laravel API.
// ============================================================
import { apiGet } from "@/lib/api/client";

export interface RegionStat {
  region: string;
  count: number;
  totalBudget: number;
  beneficiaries: number;
}

const EMPTY: RegionStat[] = [];

/** Per-region project aggregates (published projects only). */
export async function getRegionStats(): Promise<RegionStat[]> {
  // No revalidate window: these aggregates are baked into the export at
  // build time and refresh on the next build like everything else.
  const rows = await apiGet<RegionStat[]>("open-data/regions", EMPTY);
  return [...rows].sort((a, b) => b.count - a.count);
}

/**
 * The exported frontend is served by Laravel, so the API is same-origin
 * and a relative base works everywhere — in <a href> download links as
 * well as in fetch(). No NEXT_PUBLIC_API_URL to keep in sync, and no
 * host baked into the bundle at build time.
 */
export const PUBLIC_API_URL = "/api/v1";

export const PROJECTS_CSV_URL = `${PUBLIC_API_URL}/open-data/projects.csv`;
export const PROJECTS_GEOJSON_URL = `${PUBLIC_API_URL}/open-data/projects.geojson`;

export const OPEN_DATA_DOWNLOADS = [
  {
    id: "projects-csv",
    label: "Projects dataset (CSV)",
    format: "CSV",
    href: PROJECTS_CSV_URL,
    description:
      "Every published agri-energy project with region, district, value chain, status, funding partner, budget, beneficiary count and coordinates.",
    icon: "📊",
  },
  {
    id: "projects-geojson",
    label: "Projects dataset (GeoJSON)",
    format: "GeoJSON",
    href: PROJECTS_GEOJSON_URL,
    description:
      "The same published projects as a GeoJSON FeatureCollection of point features — ready to drop into QGIS, Leaflet, Mapbox or kepler.gl.",
    icon: "🗺️",
  },
] as const;
