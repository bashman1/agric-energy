"use client";
import { useState, useMemo, useCallback } from "react";
import type { Project } from "@/lib/types";
import type { RegionStat } from "@/lib/data/open-data";
import dynamic from "next/dynamic";
import { UGANDA_REGIONS } from "@/lib/geography/nominatim";

// ProjectMapLoader is already a "use client" dynamic import wrapper
const ProjectMapLoader = dynamic(() => import("@/components/public/ProjectMapLoader"), { ssr: false });

const ALL_STATUSES = ["Active", "Completed", "Pipeline", "Suspended"] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Active: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300", dot: "#16a34a" },
  Completed: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300", dot: "#2563eb" },
  Pipeline: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", dot: "#f59e0b" },
  Suspended: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-300", dot: "#9ca3af" },
};

/**
 * Compact money ("1.6M", "360K") for the regional aggregates table. Formatted
 * by hand rather than with `notation: "compact"` — this component is SSR-ed and
 * then hydrated, and Node's and the browser's ICU disagree on the compact
 * suffix casing ("1.6M" vs "1.6m"), which trips a hydration mismatch.
 */
function fmtBudget(value: number): string {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function fmtNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

interface Props {
  allProjects: Project[];
  /** Per-region aggregates from the public open-data endpoint. */
  regionStats?: RegionStat[];
}

export default function MapPageClient({ allProjects, regionStats = [] }: Props) {
  const [regionFilter, setRegionFilter] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

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
      if (statusFilters.length > 0 && !statusFilters.includes(p.status)) return false;
      return true;
    }),
    [allProjects, regionFilter, districtSearch, statusFilters]
  );

  const toggleStatus = useCallback((s: string) => {
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
                value={districtSearch}
                onChange={(e) => setDistrictSearch(e.target.value)}
                placeholder="Search district…"
                className="form-input"
              />
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
            {ALL_STATUSES.map((status) => {
              const isActive = statusFilters.includes(status);
              const s = STATUS_STYLES[status];
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
                    style={{ background: isActive ? s.dot : "#d1d5db" }}
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
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[s]?.bg} ${STATUS_STYLES[s]?.text} ${STATUS_STYLES[s]?.border} hover:opacity-80`}>
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
          {stats.total > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Status breakdown</span>
                <span className="text-[11px] text-gray-400">{stats.total} total</span>
              </div>
              {/* Segmented bar */}
              <div className="flex rounded-full overflow-hidden h-2.5 gap-0.5">
                {Object.entries(stats.byStatus).map(([status, count]) => {
                  const pct = stats.total ? (count / stats.total) * 100 : 0;
                  const colors: Record<string, string> = { Active: "bg-emerald-400", Completed: "bg-blue-400", Pipeline: "bg-amber-400", Suspended: "bg-gray-300" };
                  return pct > 0 ? (
                    <div key={status} className={`${colors[status]} transition-all`} style={{ width: `${pct}%` }} title={`${status}: ${count}`} />
                  ) : null;
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {Object.entries(stats.byStatus).map(([status, count]) => {
                  if (!count) return null;
                  const s = STATUS_STYLES[status];
                  return (
                    <button key={status} onClick={() => toggleStatus(status)}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-all ${statusFilters.includes(status) ? `${s.text} underline` : "text-gray-500 hover:text-gray-700"
                        }`}>
                      <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
                      {status} <span className="font-normal text-gray-400">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="rounded-2xl border border-gray-200 shadow-card" style={{ height: "520px" }}>
          <ProjectMapLoader
            projects={filteredProjects}
            regionFilter={regionFilter || undefined}
            districtFilter={districtSearch || undefined}
            regionStats={regionStats}
          />
        </div>

        {/* ── Regional aggregates ──
            Also the map's text alternative: the same figures the regional
            choropleth encodes, in a form screen readers can navigate. */}
        {regionStats.length > 0 && (
          <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">Regional aggregates</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Published projects per region — the figures shaded on the map&apos;s regional view.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Project count, total budget and beneficiaries reached for each region of Uganda.
                </caption>
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50">
                    <th scope="col" className="px-4 py-2 font-semibold">Region</th>
                    <th scope="col" className="px-4 py-2 font-semibold text-right">Projects</th>
                    <th scope="col" className="px-4 py-2 font-semibold text-right">Total budget</th>
                    <th scope="col" className="px-4 py-2 font-semibold text-right">Beneficiaries</th>
                  </tr>
                </thead>
                <tbody>
                  {regionStats.map((r) => (
                    <tr key={r.region} className="border-t border-gray-50">
                      <th scope="row" className="px-4 py-2 font-medium text-gray-800 text-left">{r.region}</th>
                      <td className="px-4 py-2 text-right text-gray-700">{fmtNumber(r.count)}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{fmtBudget(r.totalBudget)}</td>
                      <td className="px-4 py-2 text-right text-gray-700">
                        {r.beneficiaries ? fmtNumber(r.beneficiaries) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Project list */}
        {filteredProjects.length > 0 ? (
          <div className="mt-6">
            <h2 className="text-base font-bold text-gray-800 mb-3">
              Projects in view ({filteredProjects.length})
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProjects.map((p) => {
                const s = STATUS_STYLES[p.status];
                return (
                  <a
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    className="bg-white rounded-xl border border-gray-100 p-3 hover:border-primary-200 hover:shadow-md transition-all group"
                  >
                    <div className="font-semibold text-gray-800 text-sm group-hover:text-primary-700 transition-colors leading-snug">
                      {p.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">📍 {p.district} · {p.region}</div>
                    <div className="mt-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s?.bg} ${s?.text} ${s?.border}`}>
                        {p.status}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        ) : (
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
