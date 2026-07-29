// ============================================================
// Unified search — backed by the Laravel ranked full-text endpoint.
// ============================================================
import { buildUrl } from "@/lib/api/client";

export interface SearchHit {
  type: string; // projects | technologies | themes | partners | resources | events | opportunities
  slug: string;
  title: string;
  summary: string;
  badge: string | null;
  href: string;
  rank: number;
}

export interface SearchResponse {
  data: SearchHit[];
  facets: Record<string, number>;
  total: number;
  query: string;
}

export async function searchAll(
  q: string,
  type?: string
): Promise<SearchResponse> {
  if (q.trim().length < 2) {
    return { data: [], facets: {}, total: 0, query: q };
  }
  // apiGet unwraps `data`; we need the whole envelope, so fetch raw — but
  // build the URL through the shared isomorphic base (relative /api/v1 in the
  // browser, absolute API_URL at build time) so a static export never bakes a
  // localhost URL into the client bundle.
  const url = buildUrl("search", { q, type });
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("search failed");
    return (await res.json()) as SearchResponse;
  } catch {
    // Fall back to an empty result set on any error.
    return { data: [], facets: {}, total: 0, query: q };
  }
}
