"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import type { Project } from "@/lib/types";
import type { RegionStat } from "@/lib/data/open-data";
import { fetchDistrictGeoJSON, fetchDistrictMeta, type DistrictMeta } from "@/lib/geo/ugandaGeo";

const REGIONS = ["Central Uganda","Eastern Uganda","Northern Uganda","Western Uganda"];

// maplibre-gl CSS loaded globally in app/globals.css

const STATUS_COLORS: Record<string, string> = {
  Active:    "#16a34a",
  Completed: "#2563eb",
  Pipeline:  "#f59e0b",
  Suspended: "#9ca3af",
};

const UGANDA_CENTER: [number, number] = [32.35, 1.35];
const UGANDA_BOUNDS: [[number, number], [number, number]] = [[29.57, -1.55], [35.0, 4.23]];

const REGION_FILTER_MAP: Record<string, string> = {
  "northern uganda": "Northern Region",
  "eastern uganda":  "Eastern Region",
  "central uganda":  "Central Region",
  "western uganda":  "Western Region",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDistrictName(props: any): string {
  return props?.name || props?.shapeName || "Unknown";
}

// ── Spatial helpers ──────────────────────────────────────────────────────────
function pip([px, py]: [number, number], ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function centroid(geom: any): [number, number] {
  const ring: number[][] =
    geom.type === "MultiPolygon" ? geom.coordinates[0][0] : geom.coordinates[0];
  return [
    ring.reduce((s: number, c: number[]) => s + c[0], 0) / ring.length,
    ring.reduce((s: number, c: number[]) => s + c[1], 0) / ring.length,
  ];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assignRegions(adm2Feats: any[], adm1Feats: any[]): any[] {
  return adm2Feats.map((f) => {
    try {
      const c = centroid(f.geometry);
      let region = "";
      for (const r of adm1Feats) {
        const rings: number[][][] =
          r.geometry.type === "MultiPolygon"
            ? r.geometry.coordinates.map((p: number[][][]) => p[0])
            : [r.geometry.coordinates[0]];
        if (rings.some((rng) => pip(c, rng))) { region = r.properties?.shapeName ?? ""; break; }
      }
      return { ...f, properties: { ...f.properties, adm1Region: region } };
    } catch {
      return { ...f, properties: { ...f.properties, adm1Region: "" } };
    }
  });
}

/** App region label → OSM ADM1 shapeName (used in adm1Region property) */
const PROJECT_TO_ADM1: Record<string, string> = {
  "Northern Uganda": "Northern Region",
  "Eastern Uganda":  "Eastern Region",
  "Central Uganda":  "Central Region",
  "Western Uganda":  "Western Region",
};

/** ADM1 shapeName → app region label (inverse of PROJECT_TO_ADM1). */
const ADM1_TO_PROJECT: Record<string, string> = Object.fromEntries(
  Object.entries(PROJECT_TO_ADM1).map(([app, adm1]) => [adm1, app])
);

// ── Choropleth ramps ────────────────────────────────────────────────────────
// Districts stay green (unchanged); regions get a blue ramp so the two views
// are never mistaken for one another.
const DISTRICT_RAMP = ["#f0fdf4", "#86efac", "#4ade80", "#16a34a", "#14532d"];
const DISTRICT_STOPS = [0, 1, 2, 4, 6];
const REGION_RAMP = ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"];
const REGION_STOPS = [0, 1, 3, 6, 10];

/** Interleave stop/colour pairs into a MapLibre `interpolate` expression tail. */
function rampStops(stops: number[], ramp: string[]): (number | string)[] {
  return stops.flatMap((s, i) => [s, ramp[i]]);
}

type ChoroplethMode = "districts" | "regions";

/** Compact money for tooltips — hand-rolled to match MapPageClient exactly. */
function fmtCompact(value: number): string {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function fmtCount(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

/**
 * Attach the open-data regional aggregates onto the ADM1 boundary features so
 * the choropleth and its tooltips read straight from feature properties.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enrichRegions(adm1Features: any[], stats: RegionStat[]): any[] {
  const byRegion = new Map(stats.map((s) => [s.region, s]));
  return adm1Features.map((f, idx) => {
    const appRegion = ADM1_TO_PROJECT[f.properties?.shapeName ?? ""] ?? "";
    const stat = byRegion.get(appRegion);
    return {
      ...f,
      id: idx,
      properties: {
        ...f.properties,
        appRegion: appRegion || (f.properties?.shapeName ?? "Region"),
        projectCount: stat?.count ?? 0,
        totalBudget: stat?.totalBudget ?? 0,
        beneficiaries: stat?.beneficiaries ?? 0,
      },
    };
  });
}

interface DistrictInfo { key: string; adm1Region: string; }

/**
 * Coverage rules:
 *  1. districts[] non-empty  → count only those specific districts
 *  2. districts[] empty, regions[] non-empty → count all districts in those regions
 *  3. both empty              → national project → count ALL districts
 */
function resolveTargetKeys(p: Project, all: DistrictInfo[]): string[] {
  if (p.districts && p.districts.length > 0) {
    return p.districts.map((d) => d.toLowerCase().replace(/\s*district\s*$/i, "").trim());
  }
  if (p.regions && p.regions.length > 0) {
    const adm1Names = p.regions.map((r) => PROJECT_TO_ADM1[r] ?? r);
    return all.filter((d) => adm1Names.includes(d.adm1Region)).map((d) => d.key);
  }
  // National — every district
  return all.map((d) => d.key);
}

function buildCountMap(projects: Project[], all: DistrictInfo[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const p of projects) {
    for (const k of resolveTargetKeys(p, all)) { m[k] = (m[k] ?? 0) + 1; }
  }
  return m;
}

function buildDistrictProjectMap(projects: Project[], all: DistrictInfo[]): Record<string, Project[]> {
  const m: Record<string, Project[]> = {};
  for (const p of projects) {
    for (const k of resolveTargetKeys(p, all)) {
      if (!m[k]) m[k] = [];
      m[k].push(p);
    }
  }
  return m;
}

/**
 * Isolate map layers to show only the matching region/district.
 * - No filter → all features visible, full Uganda shown
 * - Region filter → only districts in that region + region border
 * - District filter → only that single district, no region borders
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyIsolation(map: any, regionFilter: string | undefined, districtFilter: string | undefined) {
  if (!map?.getLayer("districts-fill")) return;

  const adm1Name = regionFilter ? REGION_FILTER_MAP[regionFilter.toLowerCase()] : undefined;
  const distQ    = districtFilter?.toLowerCase().replace(/\s*district\s*$/i, "").trim();

  // Build district layer filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let districtLayerFilter: any = null; // null = show all
  if (distQ) {
    // Show only the matching district
    districtLayerFilter = ["any",
      ["==", ["downcase", ["get", "name"]], distQ],
      ["==", ["downcase", ["get", "name"]], distQ + " district"],
      ["==", ["downcase", ["get", "shapeName"]], distQ],
      ["==", ["downcase", ["get", "shapeName"]], distQ + " district"],
    ];
  } else if (adm1Name) {
    // Show only districts in the selected region
    districtLayerFilter = ["==", ["get", "adm1Region"], adm1Name];
  }

  // Apply filter to all district-based layers
  const districtLayers = ["districts-fill", "districts-hover", "districts-line"];
  for (const layer of districtLayers) {
    if (map.getLayer(layer)) {
      map.setFilter(layer, districtLayerFilter);
    }
  }

  // Full-opacity when filtered (isolated shape is the focus) — unless the
  // regional choropleth is the active view, which draws over the districts.
  const regionsVisible = !!map.getLayer("regions-fill")
    && map.getLayoutProperty("regions-fill", "visibility") === "visible";
  map.setPaintProperty("districts-fill", "fill-opacity", regionsVisible ? 0 : 0.85);

  // Uganda base fill: hide when any filter is active
  if (map.getLayer("uganda-fill")) {
    map.setLayoutProperty("uganda-fill", "visibility", (adm1Name || distQ) ? "none" : "visible");
  }

  // Regional choropleth follows the same isolation (visibility is owned by the
  // choropleth-mode effect, so only the filter is touched here).
  if (map.getLayer("regions-fill")) {
    map.setFilter("regions-fill", adm1Name ? ["==", ["get", "shapeName"], adm1Name] : null);
  }

  // Region borders: show only the selected region, or all if no filter
  if (map.getLayer("regions-line")) {
    if (distQ) {
      // District-level drill-down: hide region borders
      map.setLayoutProperty("regions-line", "visibility", "none");
    } else if (adm1Name) {
      map.setLayoutProperty("regions-line", "visibility", "visible");
      map.setFilter("regions-line", ["==", ["get", "shapeName"], adm1Name]);
    } else {
      map.setLayoutProperty("regions-line", "visibility", "visible");
      map.setFilter("regions-line", null);
    }
  }
}

interface Props {
  projects: Project[];
  regionFilter?: string;
  districtFilter?: string;
  /** Per-region aggregates (count / budget / beneficiaries) from open-data. */
  regionStats?: RegionStat[];
}

export default function ProjectMap({ projects, regionFilter, districtFilter, regionStats = [] }: Props) {
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef          = useRef<any>(null);
  const regionRef       = useRef(regionFilter);
  const districtRef     = useRef(districtFilter);
  const statusFilterRef = useRef<string[]>([]);  // live ref for click handler closure
  // Stored at map-init time for choropleth rebuilds (avoids relying on private _data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adm2BaseRef     = useRef<any[]>([]);     // enriched features (no projectCount)
  const allDistrictsRef = useRef<DistrictInfo[]>([]); // allDistricts for resolveTargetKeys
  const districtProjectMapRef = useRef<Record<string, Project[]>>({}); // for click popup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adm1BaseRef      = useRef<any[]>([]);      // raw ADM1 features (no aggregates)
  const regionStatsRef   = useRef<RegionStat[]>(regionStats); // latest stats for map init
  const [choropleth, setChoropleth] = useState<ChoroplethMode>("districts");
  const choroplethRef = useRef<ChoroplethMode>(choropleth); // live ref for map handlers
  const applyFilterRef = useRef<(region: string, district: string) => void>(() => {});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingMsg,  setLoadingMsg]  = useState<string | null>("Initialising…");
  const [error, setError] = useState<string | null>(null);

  // ── Fullscreen-local filter state ─────────────────────────────────────────
  const [fsRegion,       setFsRegion]       = useState("");
  const [fsDistrict,     setFsDistrict]     = useState("");
  const [fsStatusFilters, setFsStatusFilters] = useState<string[]>([]);
  const [fsMeta,         setFsMeta]         = useState<DistrictMeta[]>([]);
  const [fsMetaLoading,  setFsMetaLoading]  = useState(false);
  const [fsFilterCollapsed, setFsFilterCollapsed] = useState(false);
  const [fsLegendCollapsed, setFsLegendCollapsed] = useState(false);

  // Projects filtered by fullscreen status selection (empty = all)
  const fsActiveProjects = fsStatusFilters.length > 0
    ? projects.filter((p) => fsStatusFilters.includes(p.status))
    : projects;

  // Keep statusFilterRef in sync so the click handler closure always sees latest
  useEffect(() => { statusFilterRef.current = fsStatusFilters; }, [fsStatusFilters]);
  // Keep fsActiveProjects unused-warning-free (used in choropleth rebuild effect)
  void fsActiveProjects;

  // Effective filter: fullscreen uses internal state; normal uses URL props
  const effRegion   = isFullscreen ? fsRegion   : (regionFilter   ?? "");
  const effDistrict = isFullscreen ? fsDistrict : (districtFilter ?? "");

  useEffect(() => { regionRef.current = regionFilter; }, [regionFilter]);
  useEffect(() => { districtRef.current = districtFilter; }, [districtFilter]);
  useEffect(() => { regionStatsRef.current = regionStats; }, [regionStats]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) await wrapperRef.current?.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const h = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      setTimeout(() => mapRef.current?.resize(), 50);
      // Load district meta when entering fullscreen (cached after first load)
      if (isFull && fsMeta.length === 0) {
        setFsMetaLoading(true);
        fetchDistrictMeta()
          .then((d) => { setFsMeta(d); setFsMetaLoading(false); })
          .catch(() => setFsMetaLoading(false));
      }
      if (isFull) {
        // Sync fullscreen filters from current URL props so dropdowns match
        setFsRegion(regionRef.current ?? "");
        setFsDistrict(districtRef.current ?? "");
      } else {
        // Reset fullscreen filters and panel states when exiting
        setFsRegion(""); setFsDistrict(""); setFsStatusFilters([]);
        setFsFilterCollapsed(false); setFsLegendCollapsed(false);
        // Re-apply URL prop filters so the map snaps back to the parent page state
        setTimeout(() => applyFilterRef.current(regionRef.current ?? "", districtRef.current ?? ""), 100);
      }
    };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
   
  }, [fsMeta.length]);

  // ── Map init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;
    setError(null);

    async function init() {
      if (!containerRef.current) return;
      setLoadingMsg("Loading map engine…");

      const maplibregl = (await import("maplibre-gl")).default;
      if (destroyed || !containerRef.current) return;

      setLoadingMsg("Loading Uganda boundaries…");
      const [adm0Res, adm1Res] = await Promise.all([
        fetch("/geo/uga-adm0.geojson"),
        fetch("/geo/uga-adm1.geojson"),
      ]);
      if (!adm0Res.ok || !adm1Res.ok) { setError("Failed to load boundary files."); setLoadingMsg(null); return; }

      setLoadingMsg("Fetching current districts from OpenStreetMap…");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let adm2Raw: any;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [adm0, adm1]: [any, any] = await Promise.all([adm0Res.json(), adm1Res.json()]);
        adm2Raw = await fetchDistrictGeoJSON(); // [out:geojson] — properly assembled polygons
        if (destroyed) return;

        setLoadingMsg("Building map layers…");
        adm1BaseRef.current = adm1.features; // kept raw for aggregate refreshes
        // assignRegions first — enriched features have adm1Region needed for national/regional coverage
         
        const enrichedWithRegions = assignRegions(adm2Raw.features, adm1.features);

        // Build allDistricts lookup for resolveTargetKeys()
        const allDistricts: DistrictInfo[] = enrichedWithRegions.map((f) => ({
          key: getDistrictName(f.properties).toLowerCase().replace(/\s*district\s*$/i, "").trim(),
          adm1Region: f.properties?.adm1Region ?? "",
        }));

        const countMap           = buildCountMap(projects, allDistricts);
        const districtProjectMap  = buildDistrictProjectMap(projects, allDistricts);

        // Store for choropleth rebuilds (status filter changes in fullscreen)
        allDistrictsRef.current = allDistricts;
        districtProjectMapRef.current = districtProjectMap;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enriched = enrichedWithRegions.map((f: any, idx: number) => ({
          ...f, id: idx,
          properties: {
            ...f.properties,
            projectCount: countMap[getDistrictName(f.properties).toLowerCase().replace(/\s*district\s*$/i, "").trim()] ?? 0,
          },
        }));
        const adm2 = { ...adm2Raw, features: enriched };

        // Store base (without projectCount) for runtime choropleth updates
        adm2BaseRef.current = enrichedWithRegions;

        const map = new maplibregl.Map({
          container: containerRef.current!,
          style: {
            version: 8 as const,
            glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
            sources: {},
            layers: [{ id: "background", type: "background", paint: { "background-color": "#0d1b2a" } }],
          },
          center: UGANDA_CENTER, zoom: 6.5, minZoom: 5, maxZoom: 14,
          maxBounds: [[26, -5], [37, 7]] as [[number, number], [number, number]],
          attributionControl: false,
        });
        mapRef.current = map;

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

        map.on("load", () => {
          if (destroyed) return;

          map.addSource("adm0",     { type: "geojson", data: adm0 });
          map.addSource("adm1",     { type: "geojson",
            data: { ...adm1, features: enrichRegions(adm1.features, regionStatsRef.current) },
            generateId: false });
          map.addSource("adm2",     { type: "geojson", data: adm2, generateId: false });
          // Note: no separate "projects" source — project data is embedded in adm2 properties

          // Layers: back → front
          map.addLayer({ id: "uganda-fill", type: "fill", source: "adm0",
            paint: { "fill-color": "#c8bfa0", "fill-opacity": 1 } });

          map.addLayer({ id: "districts-fill", type: "fill", source: "adm2",
            paint: { "fill-color": ["interpolate",["linear"],["get","projectCount"],
              ...rampStops(DISTRICT_STOPS, DISTRICT_RAMP)],
              "fill-opacity": 0.75 } });

          // (districts-dim removed — isolation approach hides non-matching features instead)

          map.addLayer({ id: "districts-hover", type: "fill", source: "adm2",
            paint: { "fill-color": "#fbbf24",
              "fill-opacity": ["case",["boolean",["feature-state","hover"],false],0.45,0] } });

          map.addLayer({ id: "districts-line", type: "line", source: "adm2",
            paint: { "line-color": "#6b7280", "line-width": 0.6, "line-opacity": 0.8 } });

          // Regional choropleth (open-data aggregates) — hidden until selected.
          map.addLayer({ id: "regions-fill", type: "fill", source: "adm1",
            layout: { visibility: "none" },
            paint: { "fill-color": ["interpolate",["linear"],["get","projectCount"],
              ...rampStops(REGION_STOPS, REGION_RAMP)],
              "fill-opacity": ["case",["boolean",["feature-state","hover"],false],0.95,0.8] } });

          map.addLayer({ id: "regions-line", type: "line", source: "adm1",
            paint: { "line-color": "#1f2937", "line-width": 2 } });


          // ── Apply initial filter (read from refs to avoid stale closure) ──
          const initRegion    = regionRef.current;
          const initDistrict  = districtRef.current;
          applyIsolation(map, initRegion, initDistrict);

          if (initRegion && !initDistrict) {
            const adm1Name = REGION_FILTER_MAP[initRegion.toLowerCase()];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const feat = adm1.features.find((f: any) => f.properties?.shapeName === adm1Name);
            if (feat) {
              let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              function wk(c: any[]): void { if (typeof c[0]==="number"){w=Math.min(w,c[0]);s=Math.min(s,c[1]);e=Math.max(e,c[0]);n=Math.max(n,c[1]);}else c.forEach(wk); }
              wk(feat.geometry.coordinates);
              if (w < Infinity) { map.fitBounds([[w,s],[e,n]], { padding: 40, duration: 0 }); }
            } else {
              map.fitBounds(UGANDA_BOUNDS, { padding: 20, duration: 0 });
            }
          } else {
            map.fitBounds(UGANDA_BOUNDS, { padding: 20, duration: 0 });
          }

          // ── District hover tooltip ─────────────────────────────────────────
          let hoveredId: number | null = null;
          const tooltip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: [0,-8] });

          map.on("mousemove", "districts-fill", (e) => {
            // In regions mode the district fill is transparent but still
            // hit-tested — yield so the regional tooltip is the one shown.
            if (choroplethRef.current === "regions") return;
            if (!e.features?.length) return;
            const f = e.features[0];
            map.getCanvas().style.cursor = "pointer";
            if (hoveredId !== null) map.setFeatureState({ source:"adm2", id: hoveredId }, { hover: false });
            hoveredId = f.id as number;
            map.setFeatureState({ source:"adm2", id: hoveredId }, { hover: true });
            const name = getDistrictName(f.properties), count = f.properties?.projectCount ?? 0;
            tooltip.setLngLat(e.lngLat).setHTML(
              `<div style="font-family:system-ui,sans-serif;padding:6px 8px;min-width:120px">
                <div style="font-weight:700;font-size:13px;color:#111">${name}</div>
                <div style="font-size:11px;color:#16a34a;margin-top:2px;font-weight:600">${count} project${count!==1?"s":""}</div>
              </div>`
            ).addTo(map);
          });
          map.on("mouseleave", "districts-fill", () => {
            if (hoveredId !== null) map.setFeatureState({ source:"adm2", id: hoveredId }, { hover: false });
            hoveredId = null; map.getCanvas().style.cursor = ""; tooltip.remove();
          });

          // ── Region hover tooltip (open-data aggregates) ────────────────────
          let hoveredRegionId: number | null = null;
          const regionTooltip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: [0,-8] });

          map.on("mousemove", "regions-fill", (e) => {
            if (!e.features?.length) return;
            const f = e.features[0];
            map.getCanvas().style.cursor = "pointer";
            if (hoveredRegionId !== null) map.setFeatureState({ source:"adm1", id: hoveredRegionId }, { hover: false });
            hoveredRegionId = f.id as number;
            map.setFeatureState({ source:"adm1", id: hoveredRegionId }, { hover: true });

            const name    = f.properties?.appRegion ?? "Region";
            const count   = Number(f.properties?.projectCount ?? 0);
            const budget  = Number(f.properties?.totalBudget ?? 0);
            const people  = Number(f.properties?.beneficiaries ?? 0);

            regionTooltip.setLngLat(e.lngLat).setHTML(
              `<div style="font-family:system-ui,sans-serif;padding:8px 10px;min-width:170px">
                <div style="font-weight:700;font-size:13px;color:#111">${name}</div>
                <div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;margin-top:5px;color:#374151">
                  <span>Projects</span><b style="color:#1d4ed8">${fmtCount(count)}</b>
                </div>
                <div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;margin-top:2px;color:#374151">
                  <span>Total budget</span><b>${fmtCompact(budget)}</b>
                </div>
                <div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;margin-top:2px;color:#374151">
                  <span>Beneficiaries</span><b>${people ? fmtCount(people) : "—"}</b>
                </div>
              </div>`
            ).addTo(map);
          });
          map.on("mouseleave", "regions-fill", () => {
            if (hoveredRegionId !== null) map.setFeatureState({ source:"adm1", id: hoveredRegionId }, { hover: false });
            hoveredRegionId = null; map.getCanvas().style.cursor = ""; regionTooltip.remove();
          });

          // ── District click: show project list popup ───────────────────────
          map.on("click", "districts-fill", (e) => {
            if (choroplethRef.current === "regions") return;
            if (!e.features?.length) return;
            const f = e.features[0];
            const name = getDistrictName(f.properties);
            const key = name.toLowerCase().replace(/\s*district\s*$/i, "").trim();

            // Filter by active status if any selected
            const activeStatus = statusFilterRef.current;
            const allInDistrict = districtProjectMapRef.current[key] ?? [];
            const distProjects = activeStatus.length > 0
              ? allInDistrict.filter((p) => activeStatus.includes(p.status))
              : allInDistrict;
            const count = distProjects.length;

            // Build project rows HTML
            const projectRows = distProjects.length > 0
              ? distProjects.map((p) => {
                  const color = STATUS_COLORS[p.status] ?? "#6b7280";
                  return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #f3f4f6">
                    <span style="color:${color};font-size:16px;line-height:1;margin-top:1px">●</span>
                    <div style="flex:1;min-width:0">
                      <div style="font-size:12px;font-weight:600;color:#111;line-height:1.3;margin-bottom:2px">${p.title}</div>
                      <div style="display:flex;align-items:center;gap:6px">
                        <span style="font-size:10px;font-weight:600;color:${color}">${p.status}</span>
                        <a href="/projects/${p.slug}" target="_blank" rel="noopener noreferrer"
                           style="font-size:10px;color:#16a34a;font-weight:600;text-decoration:none">View →</a>
                      </div>
                    </div>
                  </div>`;
                }).join("")
              : `<div style="padding:10px 0;color:#9ca3af;font-size:12px;font-style:italic;text-align:center">${
                  activeStatus.length > 0
                    ? `No <b>${activeStatus.join(" / ")}</b> projects here`
                    : "No projects in this district yet"
                }</div>`;

            new maplibregl.Popup({ maxWidth: "300px", offset: [0, -4] })
              .setLngLat(e.lngLat)
              .setHTML(
                `<div style="font-family:system-ui,sans-serif;padding:12px 14px">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                    <div>
                      <div style="font-size:14px;font-weight:700;color:#111;line-height:1.2">${name}</div>
                      <div style="font-size:11px;margin-top:2px;font-weight:600;color:${count>0?"#16a34a":"#9ca3af"}">
                        ${count} project${count !== 1 ? "s" : ""}${activeStatus.length ? ` (${activeStatus.join(", ")})` : ""}
                      </div>
                    </div>
                    <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:white;background:${count===0?"#d1d5db":count<=2?"#86efac":count<=4?"#16a34a":"#14532d"}">${count}</div>
                  </div>
                  <div style="max-height:200px;overflow-y:auto">${projectRows}</div>
                </div>`
              )
              .addTo(map);
          });

          setLoadingMsg(null); // hide loader — map ready
        });
      } catch (err) {
        console.error("[map] init error:", err);
        setError("Could not load district boundaries from OpenStreetMap. Please check your connection and refresh.");
        setLoadingMsg(null);
      }
    }

    void init();
    return () => { destroyed = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Shared filter application (uses effective region/district) ───────────
  const applyFilter = useCallback((region: string, district: string) => {
    const map = mapRef.current;
    if (!map?.loaded()) return;

    // Apply isolation (hide non-matching features)
    applyIsolation(map, region || undefined, district || undefined);

    // ── Fit bounds ──
    if (!region && !district) {
      map.fitBounds(UGANDA_BOUNDS, { padding: 20, duration: 800 }); return;
    }

    if (district) {
      // Zoom to the matching district(s)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const src: any = map.getSource("adm2");
      const data = src?._data;
      if (!data?.features) return;
      const q = district.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matches = data.features.filter((f: any) => {
        const nm = getDistrictName(f.properties).toLowerCase();
        return nm.includes(q) || q.includes(nm.replace(/\s*district\s*$/i,"").trim());
      });
      if (!matches.length) return;
      let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function pC(c: any[]): void {if(typeof c[0]==="number"){w=Math.min(w,c[0]);s=Math.min(s,c[1]);e=Math.max(e,c[0]);n=Math.max(n,c[1]);}else c.forEach(pC);}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matches.forEach((f: any) => pC(f.geometry.coordinates));
      if (w < Infinity) map.fitBounds([[w,s],[e,n]], { padding: 60, duration: 900, maxZoom: 11 });
      return;
    }

    if (region) {
      // Zoom to the matching region
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const src: any = map.getSource("adm1");
      const data = src?._data;
      const adm1Name = REGION_FILTER_MAP[region.toLowerCase()];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const feat = data?.features?.find((f: any) => f.properties?.shapeName === adm1Name);
      if (feat) {
        let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function wk(c: any[]): void {if(typeof c[0]==="number"){w=Math.min(w,c[0]);s=Math.min(s,c[1]);e=Math.max(e,c[0]);n=Math.max(n,c[1]);}else c.forEach(wk);}
        wk(feat.geometry.coordinates);
        if (w < Infinity) { map.fitBounds([[w,s],[e,n]], { padding: 40, duration: 900 }); return; }
      }
    }
  }, []);

  // Keep applyFilterRef in sync so the fullscreen handler always has the latest
  useEffect(() => { applyFilterRef.current = applyFilter; }, [applyFilter]);

  // ── React to URL-based prop filter changes (non-fullscreen) ──────────────
  const onFilterChange = useCallback(() => {
    if (isFullscreen) return; // fullscreen uses internal state
    applyFilter(regionFilter ?? "", districtFilter ?? "");
  }, [regionFilter, districtFilter, isFullscreen, applyFilter]);

  useEffect(() => { const t = setTimeout(onFilterChange, 500); return () => clearTimeout(t); }, [onFilterChange]);

  // ── Fullscreen region change ──────────────────────────────────────────────
  const onFsRegionChange = useCallback((r: string) => {
    setFsRegion(r); setFsDistrict("");
    setTimeout(() => applyFilter(r, ""), 100);
  }, [applyFilter]);

  const onFsDistrictChange = useCallback((d: string) => {
    setFsDistrict(d);
    setTimeout(() => applyFilter(fsRegion, d), 100);
  }, [applyFilter, fsRegion]);

  const fsClear = useCallback(() => {
    setFsRegion(""); setFsDistrict("");
    setTimeout(() => applyFilter("", ""), 100);
  }, [applyFilter]);

  // Filtered district list for fullscreen panel
  const fsFilteredDistricts = fsRegion ? fsMeta.filter(d => d.region === fsRegion) : fsMeta;

  // Fullscreen status toggle
  const toggleFsStatus = useCallback((status: string) => {
    setFsStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }, []);

  // ── Unified choropleth rebuild: fires when projects prop OR fsStatusFilters changes ─
  useEffect(() => {
    const map = mapRef.current;
    const baseFeatures = adm2BaseRef.current;
    const allDist      = allDistrictsRef.current;
    if (!map?.getSource("adm2") || !baseFeatures.length || !allDist.length) return;

    const filtered = fsStatusFilters.length > 0
      ? projects.filter((p) => fsStatusFilters.includes(p.status))
      : projects;

    const counts = buildCountMap(filtered, allDist);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedFeatures = baseFeatures.map((f: any, idx: number) => ({
      ...f, id: idx,
      properties: {
        ...f.properties,
        projectCount: counts[getDistrictName(f.properties).toLowerCase().replace(/\s*district\s*$/i, "").trim()] ?? 0,
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map.getSource("adm2") as any).setData({ type: "FeatureCollection", features: updatedFeatures });

    // Also update the popup lookup
    districtProjectMapRef.current = buildDistrictProjectMap(filtered, allDist);
   
  }, [projects, fsStatusFilters]);

  // ── Refresh the regional choropleth when new aggregates arrive ────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getSource("adm1") || !adm1BaseRef.current.length) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map.getSource("adm1") as any).setData({
      type: "FeatureCollection",
      features: enrichRegions(adm1BaseRef.current, regionStats),
    });
  }, [regionStats]);

  // ── Choropleth mode: districts (default) ⇄ regions ────────────────────────
  // District layers stay mounted in both modes so their hover/click popups keep
  // working; in regions mode they are simply drawn transparent.
  useEffect(() => {
    choroplethRef.current = choropleth;
    const map = mapRef.current;
    if (!map?.getLayer("regions-fill")) return;
    const showRegions = choropleth === "regions";

    map.setLayoutProperty("regions-fill", "visibility", showRegions ? "visible" : "none");
    // Matches applyIsolation: filtered views draw the isolated shape at 0.85.
    const districtOpacity = (effRegion || effDistrict) ? 0.85 : 0.75;
    map.setPaintProperty("districts-fill", "fill-opacity", showRegions ? 0 : districtOpacity);
    if (map.getLayer("districts-line")) {
      map.setPaintProperty("districts-line", "line-opacity", showRegions ? 0.2 : 0.8);
    }
   
  }, [choropleth, effRegion, effDistrict]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full bg-[#0d1b2a] rounded-xl overflow-hidden"
      style={isFullscreen ? { width:"100vw", height:"100vh", borderRadius:0 } : {}}
    >
      <div ref={containerRef} style={{ width:"100%", height:"100%", minHeight:"460px" }} />

      {/* Loading overlay */}
      {loadingMsg && (
        <div className="absolute inset-0 bg-[#0d1b2a]/95 flex flex-col items-center justify-center z-20">
          <div className="relative mb-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#1e3a52] border-t-primary-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-primary-400 rounded-full" />
            </div>
          </div>
          <p className="text-sm text-primary-300 font-medium">{loadingMsg}</p>
          <p className="text-xs text-gray-500 mt-1">Sourcing live data from OpenStreetMap</p>
        </div>
      )}

      {/* Error state */}
      {error && !loadingMsg && (
        <div className="absolute inset-0 bg-[#0d1b2a] flex flex-col items-center justify-center z-20 p-6 text-center">
          <div className="text-3xl mb-3">🗺️</div>
          <p className="text-sm text-red-400 font-semibold mb-1">Map unavailable</p>
          <p className="text-xs text-gray-400 max-w-xs">{error}</p>
          <button onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-600">
            Retry
          </button>
        </div>
      )}

      {/* Fullscreen button */}
      <button onClick={toggleFullscreen} title={isFullscreen?"Exit fullscreen":"Fullscreen"}
        className="absolute top-3 right-14 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-md p-1.5 transition-all"
        style={{ zIndex: 10 }}>
        {isFullscreen
          ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
          : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
        }
      </button>

      {/* Legend */}
      <div
        className="absolute bottom-8 right-3 rounded-xl shadow-lg text-xs transition-all duration-300"
        style={{ zIndex: 10 }}
      >
        {isFullscreen && fsLegendCollapsed ? (
          /* Collapsed legend pill */
          <button
            onClick={() => setFsLegendCollapsed(false)}
            className="flex items-center gap-1.5 bg-white/90 hover:bg-white backdrop-blur-sm rounded-lg shadow-md px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 transition-all pointer-events-auto"
            title="Show legend"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Legend
          </button>
        ) : (
          /* Expanded legend */
          <div
            className="bg-white/95 backdrop-blur-sm rounded-xl p-3 space-y-1.5 pointer-events-none"
            role="group"
            aria-label="Map legend"
          >
            {isFullscreen && (
              <button
                onClick={() => setFsLegendCollapsed(true)}
                className="pointer-events-auto absolute -top-1.5 -left-1.5 w-5 h-5 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow transition-colors"
                title="Minimize legend"
              >−</button>
            )}
            <div className="font-bold text-gray-700 mb-2 text-[11px] uppercase tracking-wide">Project Status</div>
            {Object.entries(STATUS_COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow" style={{ background: color }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
            {/* Choropleth basis — district counts vs. regional open-data aggregates */}
            <div className="border-t border-gray-100 pt-2 mt-1">
              <div className="font-bold text-gray-700 mb-1.5 text-[11px] uppercase tracking-wide" id="choropleth-label">
                Shade By
              </div>
              <div className="pointer-events-auto flex gap-1 mb-2" role="radiogroup" aria-labelledby="choropleth-label">
                {([
                  { mode: "districts", label: "Districts" },
                  { mode: "regions", label: "Regions" },
                ] as const).map(({ mode, label }) => {
                  const isOn = choropleth === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={isOn}
                      onClick={() => setChoropleth(mode)}
                      className={`flex-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                        isOn
                          ? "bg-primary-700 text-white border-primary-700"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {choropleth === "regions" ? (
                <>
                  <div className="font-bold text-gray-700 mb-1.5 text-[11px] uppercase tracking-wide">
                    Projects Per Region
                  </div>
                  <div className="flex items-center gap-1" role="img"
                    aria-label={`Colour scale for projects per region, from ${REGION_STOPS[0]} at the lightest to ${REGION_STOPS[REGION_STOPS.length - 1]} or more at the darkest`}>
                    {REGION_RAMP.map((c, i) => (
                      <span key={c} className="w-5 h-3 rounded-sm border border-black/5" style={{ background: c }}
                        title={`${REGION_STOPS[i]}${i === REGION_RAMP.length - 1 ? "+" : ""} projects`} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>{REGION_STOPS[0]}</span>
                    <span>{REGION_STOPS[REGION_STOPS.length - 1]}+</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-gray-700 mb-1.5 text-[11px] uppercase tracking-wide">
                    District Density
                  </div>
                  <div className="flex items-center gap-1" role="img"
                    aria-label={`Colour scale for projects per district, from ${DISTRICT_STOPS[0]} at the lightest to ${DISTRICT_STOPS[DISTRICT_STOPS.length - 1]} or more at the darkest`}>
                    {DISTRICT_RAMP.map((c, i) => (
                      <span key={c} className="w-5 h-3 rounded-sm border border-black/5" style={{ background: c }}
                        title={`${DISTRICT_STOPS[i]}${i === DISTRICT_RAMP.length - 1 ? "+" : ""} projects`} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>{DISTRICT_STOPS[0]}</span>
                    <span>{DISTRICT_STOPS[DISTRICT_STOPS.length - 1]}+</span>
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-gray-100 pt-1.5 text-[10px] text-gray-400">
              {choropleth === "regions"
                ? "Hover a region for budget & beneficiaries"
                : "Click district to view projects"}
            </div>
          </div>
        )}
      </div>

      {/* Filter badge — shown in normal mode when filter is active */}
      {!isFullscreen && (regionFilter || districtFilter) && (
        <div className="absolute top-3 left-3 bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow" style={{ zIndex: 10 }}>
          📍 {districtFilter || regionFilter}
        </div>
      )}

      {/* ── Fullscreen filter panel (top-left) ───────────────────────────── */}
      {isFullscreen && (
        fsFilterCollapsed ? (
          /* Collapsed filter pill */
          <button
            onClick={() => setFsFilterCollapsed(false)}
            className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 rounded-lg shadow-lg px-3 py-2 text-[11px] font-semibold text-white/80 transition-all"
            style={{ zIndex: 15 }}
            title="Show filters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters
            {(fsRegion || fsDistrict || fsStatusFilters.length > 0) && (
              <span className="ml-1 bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                {[fsRegion, fsDistrict, ...fsStatusFilters].filter(Boolean).length}
              </span>
            )}
          </button>
        ) : (
          /* Expanded filter panel */
          <div
            className="absolute top-3 left-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-3"
            style={{ zIndex: 15, minWidth: 220 }}
          >
            <div className="flex items-center justify-between mb-2 px-0.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Filter Map</div>
              <button
                onClick={() => setFsFilterCollapsed(true)}
                className="w-5 h-5 bg-white/10 hover:bg-white/25 text-white/60 hover:text-white rounded-md flex items-center justify-center text-[11px] font-bold transition-colors"
                title="Minimize filters"
              >−</button>
            </div>

            {/* Region */}
            <div className="mb-2">
              <label htmlFor="fs-region" className="block text-[10px] font-semibold text-white/70 mb-1">Region</label>
              <select
                id="fs-region"
                value={fsRegion}
                onChange={(e) => onFsRegionChange(e.target.value)}
                className="w-full text-xs bg-white/15 backdrop-blur text-white border border-white/20 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400 appearance-none"
              >
                <option value="" className="text-gray-800">All Uganda</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r} className="text-gray-800">{r}</option>
                ))}
              </select>
            </div>

            {/* District */}
            <div className="mb-2">
              <label className="block text-[10px] font-semibold text-white/70 mb-1">
                District
                {fsMetaLoading && <span className="ml-1 text-white/40 animate-pulse">loading…</span>}
              </label>
              <select
                value={fsDistrict}
                onChange={(e) => onFsDistrictChange(e.target.value)}
                disabled={fsMetaLoading}
                className="w-full text-xs bg-white/15 backdrop-blur text-white border border-white/20 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400 appearance-none disabled:opacity-50"
              >
                <option value="" className="text-gray-800">All districts</option>
                {fsFilteredDistricts.map((d) => (
                  <option key={d.name} value={d.name} className="text-gray-800">{d.name}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="mb-2">
              <div className="text-[10px] font-semibold text-white/70 mb-1.5">Status</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(STATUS_COLORS).map(([status, color]) => {
                  const isOn = fsStatusFilters.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleFsStatus(status)}
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                        isOn
                          ? "bg-white/20 text-white border-white/50 ring-1 ring-white/40"
                          : "bg-white/5 text-white/50 border-white/15 hover:bg-white/15"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: isOn ? color : "#6b7280" }} />
                      {status}
                    </button>
                  );
                })}
              </div>
              {fsStatusFilters.length > 0 && (
                <button onClick={() => setFsStatusFilters([])} className="text-[9px] text-white/40 hover:text-white/70 mt-1 underline">
                  clear status
                </button>
              )}
            </div>

            {/* Active filter badge + clear */}
            {(fsRegion || fsDistrict || fsStatusFilters.length > 0) && (
              <div className="flex items-center justify-between bg-primary-600/40 rounded-lg px-2 py-1 text-[10px] text-white">
                <span>📍 {[fsDistrict || fsRegion, fsStatusFilters.length ? `${fsStatusFilters.length} status` : ""].filter(Boolean).join(" · ") || "Filtered"}</span>
                <button onClick={() => { fsClear(); setFsStatusFilters([]); }} className="ml-2 text-white/60 hover:text-white font-bold">✕</button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
