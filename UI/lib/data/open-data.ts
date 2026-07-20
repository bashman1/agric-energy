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
  const rows = await apiGet<RegionStat[]>("open-data/regions", EMPTY, {
    revalidate: 300,
  });
  return [...rows].sort((a, b) => b.count - a.count);
}

/**
 * Public API base used for direct browser downloads. Unlike `API_URL`
 * (server-only, used by lib/api/client.ts), this must be reachable from
 * the user's browser, so it comes from the NEXT_PUBLIC_ variable.
 */
export const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

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
