"use client";
import { useState, useMemo, useCallback } from "react";
import type { Project } from "@/lib/types";
import type { RegionStat } from "@/lib/data/open-data";
import dynamic from "next/dynamic";
import { UGANDA_REGIONS } from "@/lib/geography/nominatim";
import { STATUS_CHIP, STATUS_COLOR, STATUS_ORDER, type ProjectStatus } from "@/lib/viz/status";
import StatusBreakdown from "@/components/public/charts/StatusBreakdown";
import RegionAggregates from "@/components/public/charts/RegionAggregates";
import { useDistrictNames } from "@/lib/geo/useDistricts";

// ProjectMapLoader is already a "use client" dynamic import wrapper
const ProjectMapLoader = dynamic(() => import("@/components/public/ProjectMapLoader"), { ssr: false });

interface Props {
  allProjects: Project[];
  /** Per-region aggregates from the public open-data endpoint. */
  regionStats?: RegionStat[];
}

export default function MapPageClient({ allProjects, regionStats = [] }: Props) {
  const [regionFilter, setRegionFilter] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const districtNames = useDistrictNames();
  const [statusFilters, setStatusFilters] = useState<ProjectStatus[]>([]);

  // Instant client-side filter — no page reload
  const filteredProjects = useMemo(() =>
    allProjects.filter((p) => {
      if (!p.coordinates?.lat) return false;
      if (regionFilter && !p.region.toLowerCase().includes(regionFilter.toLowerCase()) && p.region !== "National") return false;
      if (districtSearch) {
        const q = districtSearch.toLowerCase();
        // Match district name or any of the project's districts[] array
        const dists = (p.districts?.length ? p.districts : [p.district]).map(d => d.toLowerCase());
        if (!dists.some(d => d.includes(q))) return false;
      }
      if (statusFilters.length > 0 && !(statusFilters as readonly string[]).includes(p.status)) return false;
      return true;
    }),
    [allProjects, regionFilter, districtSearch, statusFilters]
  );

  const toggleStatus = useCallback((s: ProjectStatus) => {
    setStatusFilters((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }, []);

  const clearAll = () => { setRegionFilter(""); setDistrictSearch(""); setStatusFilters([]); };
  const hasFilters = regionFilter || districtSearch || statusFilters.length > 0;

  // ── Accurate stats derived from filteredProjects ────────────────────────────
  const stats = useMemo(() => {
    const regionSet = new Set<string>();
    const districtSet = new Set<string>();
    const SKIP = new Set(["National Coverage", "Multiple Districts", ""]);

    for (const p of filteredProjects) {
      // Regions: prefer regions[] array, fall back to scalar region (skip "National")
      const regs = p.regions?.length ? p.regions
        : (!p.region || ["National", "National Coverage"].includes(p.region)) ? []
          : [p.region];
      regs.forEach((r) => regionSet.add(r));

      // Districts: prefer districts[] array, fall back to scalar district
      const dists = p.districts?.length ? p.districts
        : p.district ? [p.district] : [];
      dists.filter((d) => !SKIP.has(d)).forEach((d) => districtSet.add(d));
    }

    const byStatus: Record<string, number> = { Active: 0, Completed: 0, Pipeline: 0, Suspended: 0 };
    filteredProjects.forEach((p) => { if (p.status in byStatus) byStatus[p.status]++; });

    const nationalCount = filteredProjects.filter(
      (p) => (!p.regions?.length) && (!p.districts?.length)
    ).length;

    return {
      total: filteredProjects.length,
      regions: regionSet.size,
      districts: districtSet.size,
      nationalCount,
      byStatus,
      regionNames: [...regionSet].join(", ") || (nationalCount ? "All Uganda" : "—"),
    };
  }, [filteredProjects]);

  return (
    <section className="bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Filter bar ── */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 shadow-card space-y-4">

          {/* Region + District row */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-44">
              <label htmlFor="map-region" className="block text-xs font-semibold text-gray-600 mb-1">Region</label>
              <select
                id="map-region"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="form-input"
              >
                <option value="">All Uganda</option>
                {UGANDA_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-44">
              <label htmlFor="map-district" className="block text-xs font-semibold text-gray-600 mb-1">District</label>
              <input
                id="map-district"
                type="text"
                list="uganda-districts-map"
                autoComplete="off"
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                placeholder={districtNames.length ? "All districts" : "Search district…"}
                className="form-input"
              />
              {/* Every Uganda district, so the box suggests rather than
                  requiring the exact spelling to be known up front. */}
              <datalist id="uganda-districts-map">
                {districtNames.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 mr-1">Status:</span>
            {STATUS_ORDER.map((status) => {
              const isActive = statusFilters.includes(status);
              const s = STATUS_CHIP[status];
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${isActive
                      ? `${s.bg} ${s.text} ${s.border} shadow-sm ring-2 ring-offset-1 ring-current`
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: isActive ? STATUS_COLOR[status] : "#d1d5db" }}
                  />
                  {status}
                  {isActive && <span className="ml-0.5 opacity-60">✓</span>}
                </button>
              );
            })}
            {statusFilters.length > 0 && (
              <button
                onClick={() => setStatusFilters([])}
                className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
              >
                Clear status
              </button>
            )}
          </div>

          {/* Active filter summary pills */}
          {hasFilters && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-50">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5 mr-1">Active:</span>
              {regionFilter && (
                <button onClick={() => setRegionFilter("")} className="inline-flex items-center gap-1 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200 hover:bg-primary-200">
                  🗺 {regionFilter} ×
                </button>
              )}
              {districtSearch && (
                <button onClick={() => setDistrictSearch("")} className="inline-flex items-center gap-1 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200 hover:bg-primary-200">
                  📍 {districtSearch} ×
                </button>
              )}
              {statusFilters.map((s) => (
                <button key={s} onClick={() => toggleStatus(s)}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_CHIP[s]?.bg} ${STATUS_CHIP[s]?.text} ${STATUS_CHIP[s]?.border} hover:opacity-80`}>
                  ● {s} ×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Stats strip ── */}
        <div className="mb-5 space-y-3">
          {/* 4 key metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total projects */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-card flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-lg shrink-0">📋</div>
              <div>
                <div className="text-2xl font-extrabold text-primary-700 leading-none">{stats.total}</div>
                <div className="text-xs font-semibold text-gray-500 mt-0.5">Projects</div>
                {stats.nationalCount > 0 && (
                  <div className="text-[10px] text-gray-400 mt-0.5">{stats.nationalCount} national</div>
                )}
              </div>
            </div>

            {/* Regions covered */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-card flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg shrink-0">🌍</div>
              <div className="min-w-0">
                <div className="text-2xl font-extrabold text-blue-700 leading-none">
                  {stats.nationalCount > 0 && stats.regions === 0 ? "All" : stats.regions || "—"}
                </div>
                <div className="text-xs font-semibold text-gray-500 mt-0.5">Regions</div>
                {stats.regionNames && (
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate" title={stats.regionNames}>{stats.regionNames}</div>
                )}
              </div>
            </div>

            {/* Districts covered */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-card flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-lg shrink-0">📍</div>
              <div>
                <div className="text-2xl font-extrabold text-emerald-700 leading-none">{stats.districts || "—"}</div>
                <div className="text-xs font-semibold text-gray-500 mt-0.5">Districts Covered</div>
                {stats.nationalCount > 0 && (
                  <div className="text-[10px] text-gray-400 mt-0.5">+ national coverage</div>
                )}
              </div>
            </div>

            {/* Active projects */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-card flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-lg shrink-0">✅</div>
              <div>
                <div className="text-2xl font-extrabold text-emerald-600 leading-none">{stats.byStatus.Active}</div>
                <div className="text-xs font-semibold text-gray-500 mt-0.5">Active</div>
                {stats.byStatus.Pipeline > 0 && (
                  <div className="text-[10px] text-amber-500 mt-0.5">{stats.byStatus.Pipeline} in pipeline</div>
                )}
              </div>
            </div>
          </div>

          {/* Status breakdown bar */}
          <StatusBreakdown
            byStatus={stats.byStatus}
            total={stats.total}
            activeFilters={statusFilters}
            onToggle={toggleStatus}
          />
        </div>

        {/* Map */}
        {/* Sized off the viewport so the country fills the space it is
            given; the floor keeps it usable on short screens and the
            ceiling stops it dwarfing the page on very tall ones. */}
        <div className="rounded-2xl border border-gray-200 shadow-card h-[78vh] min-h-[480px] max-h-[1000px]">
          <ProjectMapLoader
            projects={filteredProjects}
            regionFilter={regionFilter || undefined}
            districtFilter={districtSearch || undefined}
            regionStats={regionStats}
          />
        </div>

        {/* Regional aggregates — small multiples plus a table view.
            Also the map's text alternative: the same figures the regional
            choropleth encodes, in forms a screen reader can navigate. */}
        <RegionAggregates stats={regionStats} />

        {/* The per-project grid that used to sit here has been removed:
            the map already carries district-level project detail on click,
            so the list duplicated it and pushed the map off-screen. The
            empty state stays — it is the only feedback a user gets when a
            filter combination matches nothing. */}
        {filteredProjects.length === 0 && (
          <div className="mt-6 text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-3xl mb-2">🗺️</div>
            <p className="text-gray-600 font-semibold">No projects match these filters</p>
            <button onClick={clearAll} className="mt-3 inline-block text-sm text-primary-600 hover:underline">
              Clear all filters
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
