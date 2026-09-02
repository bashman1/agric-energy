/**
 * Uganda Geographic Data Service
 *
 * Fetches Uganda ADM2 (district) boundaries from OpenStreetMap via Overpass API.
 * Multiple public Overpass endpoints are tried in sequence — if one fails or 504s,
 * the next one is attempted automatically.
 *
 * Results are cached in sessionStorage for 7 days so the slow Overpass call
 * only ever happens once per browser session.
 */

/** Public Overpass mirrors tried in order on failure */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

/** Uganda area ID = OSM relation 192796 + 3_600_000_000 */
const UGA_AREA_ID = 3600192796;

// ── Queries ───────────────────────────────────────────────────────────────────
/** Full geometry: inline way geometry via "out body geom" — slower, ~30–90 s */
const GEOJSON_QUERY = `[out:json][timeout:90];
area(${UGA_AREA_ID})->.a;
relation["admin_level"="4"]["boundary"="administrative"](area.a);
out body geom;`;

/** Lightweight: tags + centroid only — fast, for dropdowns */
const META_QUERY = `[out:json][timeout:45];
area(${UGA_AREA_ID})->.a;
relation["admin_level"="4"]["boundary"="administrative"](area.a);
out tags center;`;

// ── Cache ─────────────────────────────────────────────────────────────────────
const GEOJSON_CACHE_KEY = "uga_districts_geojson_v4"; // bump on format change
// Bumped to _v3 to discard any short list an earlier session cached: the
// accept-anything check below used to store whatever the first attempt
// produced, so one bad parse or a thin Overpass response could leave a
// browser stuck on a handful of districts until the tab was closed.
const META_CACHE_KEY    = "uga_districts_meta_v3";

/**
 * Uganda has ~135 districts and cities. Anything well below that is a
 * partial result, not a real answer — worth retrying the other source and
 * never worth caching.
 */
const MIN_PLAUSIBLE_DISTRICTS = 100;
const TTL_MS            = 7 * 24 * 60 * 60 * 1000; // 7 days

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cacheGet(key: string): any | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > TTL_MS) { sessionStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cacheSet(key: string, data: any): void {
  try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch { /**/ }
}

// ── Multi-endpoint Overpass fetch with per-attempt timeout ────────────────────
/**
 * Tries each endpoint in OVERPASS_ENDPOINTS in order until one succeeds.
 * Per-attempt timeout lets us fail fast and move on to the next mirror.
 */
async function overpassPost(
  query: string,
  perAttemptTimeoutMs = 65_000,
): Promise<unknown> {
  const errors: string[] = [];

  for (const url of OVERPASS_ENDPOINTS) {
    try {
      console.log(`[geo] Overpass → ${url}`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(perAttemptTimeoutMs),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const msg = `${url} → HTTP ${res.status}: ${body.slice(0, 120)}`;
        console.warn(`[geo] ${msg}`);
        errors.push(msg);
        continue; // try next endpoint
      }

      const data = await res.json();
      console.log(`[geo] Overpass OK from ${url}`);
      return data;
    } catch (err) {
      const msg = `${url} → ${err instanceof Error ? err.message : String(err)}`;
      console.warn(`[geo] ${msg}`);
      errors.push(msg);
      // continue to next endpoint
    }
  }

  // All endpoints failed
  throw new Error(
    `All ${OVERPASS_ENDPOINTS.length} Overpass endpoints failed:\n${errors.join("\n")}`
  );
}

// ── Way-chaining polygon assembler ────────────────────────────────────────────
/**
 * Chains OSM way coordinate arrays into closed polygon rings using a greedy
 * algorithm. Prevents deformed / butterfly polygons from mis-ordered ways.
 */
function chainWays(ways: number[][][]): number[][][] {
  const rings: number[][][] = [];
  const remaining = ways.map((w) => [...w]);

  while (remaining.length > 0) {
    const ring: number[][] = [...remaining[0]];
    remaining.splice(0, 1);

    let progressed = true;
    while (progressed && remaining.length > 0) {
      progressed = false;
      const tail = ring[ring.length - 1];

      for (let i = 0; i < remaining.length; i++) {
        const w = remaining[i];
        const eps = 1e-5;
        const head = w[0];
        const back = w[w.length - 1];

        if (Math.abs(tail[0] - head[0]) < eps && Math.abs(tail[1] - head[1]) < eps) {
          ring.push(...w.slice(1));
          remaining.splice(i, 1);
          progressed = true;
          break;
        } else if (Math.abs(tail[0] - back[0]) < eps && Math.abs(tail[1] - back[1]) < eps) {
          ring.push(...[...w].reverse().slice(1));
          remaining.splice(i, 1);
          progressed = true;
          break;
        }
      }
    }

    // Close the ring
    const first = ring[0], last = ring[ring.length - 1];
    if (Math.abs(first[0] - last[0]) > 1e-8 || Math.abs(first[1] - last[1]) > 1e-8) {
      ring.push([...first]);
    }

    if (ring.length >= 4) rings.push(ring);
  }

  return rings;
}

/** Convert Overpass JSON → GeoJSON FeatureCollection */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function overpassToGeoJSON(overpassJson: any): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features: any[] = [];

  for (const el of overpassJson.elements ?? []) {
    if (el.type !== "relation") continue;

    const outerWays: number[][][] = [];
    const innerWays: number[][][] = [];

    for (const m of el.members ?? []) {
      if (m.type !== "way" || !m.geometry?.length) continue;
      const coords = m.geometry.map(
        (pt: { lat: number; lon: number }) => [pt.lon, pt.lat]
      );
      if (m.role === "outer") outerWays.push(coords);
      else if (m.role === "inner") innerWays.push(coords);
    }

    if (!outerWays.length) continue;

    const outerRings = chainWays(outerWays);
    const innerRings = chainWays(innerWays);

    if (!outerRings.length) continue;

    const geometry =
      outerRings.length === 1
        ? { type: "Polygon",      coordinates: [outerRings[0], ...innerRings] }
        : { type: "MultiPolygon", coordinates: outerRings.map((o, i) => (i === 0 ? [o, ...innerRings] : [o])) };

    features.push({
      type: "Feature",
      geometry,
      properties: { ...el.tags, osmId: el.id },
    });
  }

  return { type: "FeatureCollection", features };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch Uganda's current district boundaries as GeoJSON.
 * Tries multiple Overpass mirrors if one fails/times out.
 * Cached 7 days in sessionStorage.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchDistrictGeoJSON(): Promise<any> {
  const cached = cacheGet(GEOJSON_CACHE_KEY);
  if (cached) {
    console.log(`[geo] GeoJSON: ${cached.features?.length} features (cache)`);
    return cached;
  }

  // Primary: bundled boundary file — instant and reliable, no external call.
  // (Districts use `shapeName`; the map's getDistrictName handles that.)
  try {
    const res = await fetch("/geo/uga-adm2.geojson");
    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geojson = (await res.json()) as any;
      if (geojson?.features?.length) {
        console.log(`[geo] GeoJSON: ${geojson.features.length} districts (local)`);
        return geojson;
      }
    }
  } catch (e) {
    console.warn("[geo] local district GeoJSON unavailable — falling back to Overpass", e);
  }

  // Fallback: live Overpass mirrors (only if the bundled file is missing).
  console.log("[geo] GeoJSON: fetching from Overpass (trying multiple mirrors)…");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await overpassPost(GEOJSON_QUERY) as any;
  const geojson = overpassToGeoJSON(raw);
  console.log(`[geo] GeoJSON: assembled ${geojson.features.length} polygons — caching`);
  cacheSet(GEOJSON_CACHE_KEY, geojson);
  return geojson;
}

/** Region label used by the application */
export type UgandaRegion =
  | "Central Uganda"
  | "Eastern Uganda"
  | "Northern Uganda"
  | "Western Uganda";

/** Lightweight district metadata for dropdowns */
export interface DistrictMeta {
  name:   string;
  region: UgandaRegion | "";
}

const ADM1_SHAPE_TO_REGION: Record<string, UgandaRegion> = {
  "Central Region":  "Central Uganda",
  "Eastern Region":  "Eastern Uganda",
  "Northern Region": "Northern Uganda",
  "Western Region":  "Western Uganda",
};

function pip([px, py]: [number, number], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Rough centroid (mean of the outer ring) of a Polygon/MultiPolygon geometry. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ringCentroid(geom: any): [number, number] | null {
  try {
    const ring: number[][] =
      geom.type === "MultiPolygon" ? geom.coordinates[0][0] : geom.coordinates[0];
    if (!ring?.length) return null;
    let x = 0, y = 0;
    for (const c of ring) { x += c[0]; y += c[1]; }
    return [x / ring.length, y / ring.length];
  } catch {
    return null;
  }
}

/**
 * Fetch lightweight district metadata (name + region) for dropdowns.
 * Much faster than the full GeoJSON query.
 * Cached 7 days in sessionStorage.
 */
export async function fetchDistrictMeta(): Promise<DistrictMeta[]> {
  const cached = cacheGet(META_CACHE_KEY);
  if (cached) {
    console.log(`[geo] meta: ${cached.length} items (cache)`);
    return cached;
  }

  // Primary: the bundled DISTRICT layer, which already carries its region.
  //
  // This exists because /geo/uga-adm2.geojson — the file the fallback below
  // reads — is geoBoundaries' UGA ADM2, and for Uganda that layer is
  // *counties* (2006): Dodoth, Aringa, Aswa… It contains no Gulu, Mbale,
  // Jinja, Masaka or Wakiso, so every district control on the platform was
  // offering a vocabulary that matched almost nothing in the content.
  // uga-districts.geojson is geoBoundaries UGA ADM3 (2020), canonically
  // "District" — 136 of them, each pre-tagged with its region.
  try {
    const res = await fetch("/geo/uga-districts.geojson");
    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fc = (await res.json()) as any;
      const out: DistrictMeta[] = [];
      const seen = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const f of (fc.features ?? []) as any[]) {
        const name: string = f.properties?.shapeName;
        if (!name || seen.has(name)) continue;
        seen.add(name);
        out.push({ name, region: (f.properties?.region ?? "") as UgandaRegion | "" });
      }
      if (out.length >= MIN_PLAUSIBLE_DISTRICTS) {
        out.sort((a, b) =>
          (a.region || "zzz").localeCompare(b.region || "zzz") || a.name.localeCompare(b.name)
        );
        console.log(`[geo] meta: ${out.length} districts (bundled) — caching`);
        cacheSet(META_CACHE_KEY, out);
        return out;
      }
    }
  } catch (e) {
    console.warn("[geo] district layer unavailable — falling back", e);
  }

  // Fallback: derive names + regions from the county layer by
  // point-in-polygon of each centroid against the region polygons.
  try {
    const [adm2Res, adm1Res] = await Promise.all([
      fetch("/geo/uga-adm2.geojson"),
      fetch("/geo/uga-adm1.geojson"),
    ]);
    if (adm2Res.ok && adm1Res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adm2 = (await adm2Res.json()) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adm1 = (await adm1Res.json()) as any;
      const out: DistrictMeta[] = [];
      const seen = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const f of (adm2.features ?? []) as any[]) {
        const name: string = f.properties?.shapeName || f.properties?.name;
        if (!name || seen.has(name)) continue;
        seen.add(name);
        const center = ringCentroid(f.geometry);
        let region: UgandaRegion | "" = "";
        if (center) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const r of adm1.features as any[]) {
            const rings: number[][][] =
              r.geometry.type === "MultiPolygon"
                ? r.geometry.coordinates.map((p: number[][][]) => p[0])
                : [r.geometry.coordinates[0]];
            if (rings.some((ring) => pip(center, ring))) {
              region = ADM1_SHAPE_TO_REGION[r.properties?.shapeName as string] ?? "";
              break;
            }
          }
        }
        out.push({ name, region });
      }
      if (out.length >= MIN_PLAUSIBLE_DISTRICTS) {
        out.sort((a, b) =>
          (a.region || "zzz").localeCompare(b.region || "zzz") || a.name.localeCompare(b.name)
        );
        console.log(`[geo] meta: ${out.length} items (local) — caching`);
        cacheSet(META_CACHE_KEY, out);
        return out;
      }
      if (out.length) {
        console.warn(
          `[geo] meta: only ${out.length} districts parsed locally — trying Overpass`
        );
      }
    }
  } catch (e) {
    console.warn("[geo] local meta unavailable — falling back to Overpass", e);
  }

  console.log("[geo] meta: fetching from Overpass (multiple mirrors)…");
  const [rawTags, adm1Res] = await Promise.all([
    overpassPost(META_QUERY, 50_000), // 50 s per attempt
    fetch("/geo/uga-adm1.geojson"),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adm1 = await adm1Res.json() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: any[] = (rawTags as any).elements ?? [];

  const result: DistrictMeta[] = [];

  for (const el of elements) {
    if (el.type !== "relation" || !el.tags?.name) continue;
    const name: string = el.tags.name;
    const center: [number, number] | null = el.center
      ? [el.center.lon as number, el.center.lat as number]
      : null;

    let region: UgandaRegion | "" = "";
    if (center) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of adm1.features as any[]) {
        const rings: number[][][] =
          r.geometry.type === "MultiPolygon"
            ? r.geometry.coordinates.map((p: number[][][]) => p[0])
            : [r.geometry.coordinates[0]];
        if (rings.some((ring) => pip(center!, ring))) {
          region = ADM1_SHAPE_TO_REGION[r.properties?.shapeName as string] ?? "";
          break;
        }
      }
    }
    result.push({ name, region });
  }

  result.sort((a, b) =>
    (a.region || "zzz").localeCompare(b.region || "zzz") || a.name.localeCompare(b.name)
  );
  if (result.length >= MIN_PLAUSIBLE_DISTRICTS) {
    console.log(`[geo] meta: ${result.length} items (live) — caching`);
    cacheSet(META_CACHE_KEY, result);
  } else {
    // Return what we have so the control is usable, but do not freeze a
    // partial list into the cache for the rest of the session.
    console.warn(`[geo] meta: only ${result.length} districts — not caching`);
  }
  return result;
}
