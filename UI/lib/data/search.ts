// ============================================================
// Unified search — backed by the Laravel ranked full-text endpoint.
// ============================================================

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
  // apiGet unwraps `data`; we need the whole envelope, so fetch raw.
  const base = process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";
  const url = new URL(`${base}/search`);
  url.searchParams.set("q", q);
  if (type) url.searchParams.set("type", type);
  try {
    const res = await fetch(url.toString(), {
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
