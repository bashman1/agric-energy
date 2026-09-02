// Client half of /projects: the filter sidebar and result grid.
// The page prerenders the full published list, so filtering is in-memory
// and the active filters live in the query string (shareable URLs).
"use client";

import { useMemo } from "react";
import ProjectCard from "@/components/public/ProjectCard";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import EmptyState from "@/components/shared/EmptyState";
import { UGANDA_REGIONS } from "@/lib/geography/nominatim";
import { useUrlFilters } from "@/lib/hooks/useUrlFilters";
import { useDistrictNames } from "@/lib/geo/useDistricts";
import type { Project, Taxonomy } from "@/lib/types";

const KEYS = [
  "search",
  "region",
  "district",
  "technologyId",
  "themeId",
  "valueChain",
  "status",
] as const;

export default function ProjectsBrowser({
  projects,
  taxonomy,
}: {
  projects: Project[];
  taxonomy: Taxonomy;
}) {
  const { filters, setFilters, clear } = useUrlFilters(KEYS);
  const districtNames = useDistrictNames();
  const hasFilters = Object.values(filters).some(Boolean);

  const results = useMemo(() => {
    let items = projects;
    const has = (v: string | undefined) => !!v;
    if (has(filters.search)) {
      const q = filters.search!.toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.summary ?? "").toLowerCase().includes(q)
      );
    }
    if (has(filters.region)) items = items.filter((p) => p.region === filters.region);
    if (has(filters.district)) {
      const d = filters.district!.toLowerCase();
      items = items.filter((p) => (p.district ?? "").toLowerCase().includes(d));
    }
    if (has(filters.valueChain)) items = items.filter((p) => p.valueChain === filters.valueChain);
    if (has(filters.status)) items = items.filter((p) => p.status === filters.status);
    if (has(filters.technologyId)) items = items.filter((p) => p.technologyIds?.includes(filters.technologyId!));
    if (has(filters.themeId)) items = items.filter((p) => p.themeIds?.includes(filters.themeId!));
    return items;
  }, [projects, filters]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setFilters({
      search: String(data.get("search") ?? ""),
      region: String(data.get("region") ?? ""),
      district: String(data.get("district") ?? ""),
      valueChain: String(data.get("valueChain") ?? ""),
      status: String(data.get("status") ?? ""),
      technologyId: filters.technologyId,
      themeId: filters.themeId,
    });
  };

  return (
    <section className="py-8 bg-ink-50 min-h-screen">
          <div className="container-page">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Filter panel */}
              <aside className="w-full lg:w-72 shrink-0">
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card sticky top-20">
                  <h2 className="font-bold text-gray-900 mb-4 text-sm">Filter Projects</h2>
                  <form onSubmit={onSubmit} className="space-y-4">
                    {/* Search */}
                    <div>
                      <label htmlFor="filter-search" className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
                      <input
                        id="filter-search"
                        name="search"
                        type="text"
                        defaultValue={filters.search ?? ""}
                        placeholder="Keywords..."
                        className="form-input"
                      />
                    </div>

                    {/* Region — 4 Uganda regions from constant */}
                    <div>
                      <label htmlFor="filter-region" className="block text-xs font-semibold text-gray-600 mb-1">Region</label>
                      <select id="filter-region" name="region" defaultValue={filters.region ?? ""} className="form-input">
                        <option value="">All Regions</option>
                        {UGANDA_REGIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* District — type-ahead over every Uganda district.
                        Still a text input, so partial names keep working;
                        the datalist just means you no longer have to guess
                        which districts the platform knows about. */}
                    <div>
                      <label htmlFor="filter-district" className="block text-xs font-semibold text-gray-600 mb-1">District</label>
                      <input
                        id="filter-district"
                        name="district"
                        type="text"
                        list="uganda-districts"
                        autoComplete="off"
                        defaultValue={filters.district ?? ""}
                        placeholder={districtNames.length ? "All districts" : "e.g. Gulu…"}
                        className="form-input"
                      />
                      <datalist id="uganda-districts">
                        {districtNames.map((d) => (
                          <option key={d} value={d} />
                        ))}
                      </datalist>
                    </div>

                    {/* Value Chain */}
                    <div>
                      <label htmlFor="filter-value-chain" className="block text-xs font-semibold text-gray-600 mb-1">Value Chain</label>
                      <select id="filter-value-chain" name="valueChain" defaultValue={filters.valueChain ?? ""} className="form-input">
                        <option value="">All Value Chains</option>
                        {taxonomy.valueChains.map((v) => (
                          <option key={v.id} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label htmlFor="filter-status" className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                      <select id="filter-status" name="status" defaultValue={filters.status ?? ""} className="form-input">
                        <option value="">All Statuses</option>
                        {taxonomy.projectStatuses.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="flex-1 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">
                        Apply
                      </button>
                      {hasFilters && (
                        <button type="button" onClick={clear} className="px-3 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50">
                          Clear
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </aside>

              {/* Results */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm text-gray-500">
                    <span className="font-bold text-gray-800">{results.length}</span>{" "}
                    project{results.length !== 1 ? "s" : ""} found
                    {filters.search && <> for &quot;<span className="italic">{filters.search}</span>&quot;</>}
                    {filters.region && (
                      <> in <span className="font-semibold text-primary-700">{filters.region}</span></>
                    )}
                    {filters.district && (
                      <> · <span className="font-semibold text-primary-700">{filters.district}</span></>
                    )}
                  </p>
                </div>
                {results.length > 0 ? (
                  <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {results.map((p) => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                  </StaggerGrid>
                ) : (
                  <EmptyState
                    title="No projects found"
                    message="Try changing your search terms or clearing the filters."
                    icon="🏗️"
                    action={{ label: "Clear All Filters", onClick: clear }}
                  />
                )}
              </div>
            </div>
          </div>
    </section>
  );
}
