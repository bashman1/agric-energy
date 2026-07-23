// Client half of /resources: the filter form and result grid.
// The page prerenders the full published list, so this filters in memory
// and keeps the current filters in the query string (shareable URLs).
"use client";

import ResourceCard from "@/components/public/ResourceCard";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import EmptyState from "@/components/shared/EmptyState";
import { useUrlFilters } from "@/lib/hooks/useUrlFilters";
import type { Resource, Taxonomy } from "@/lib/types";
import { useMemo } from "react";

const KEYS = ["search", "type", "themeId"] as const;

export default function ResourcesBrowser({
  resources,
  taxonomy,
}: {
  resources: Resource[];
  taxonomy: Taxonomy;
}) {
  const { filters, setFilters, clear } = useUrlFilters(KEYS);

  const results = useMemo(() => {
    let items = resources;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q)
      );
    }
    if (filters.type) {
      items = items.filter(
        (r) => r.type.toLowerCase() === filters.type!.toLowerCase()
      );
    }
    if (filters.themeId) {
      items = items.filter((r) => r.themeIds.includes(filters.themeId!));
    }
    return items;
  }, [resources, filters]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setFilters({
      search: String(data.get("search") ?? ""),
      type: String(data.get("type") ?? ""),
      themeId: filters.themeId,
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-card">
        <form onSubmit={onSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label htmlFor="resource-search" className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
            <input id="resource-search" name="search" type="text" defaultValue={filters.search ?? ""} placeholder="Search resources..." className="form-input" />
          </div>
          <div className="min-w-40">
            <label htmlFor="resource-type" className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
            <select id="resource-type" name="type" defaultValue={filters.type ?? ""} className="form-input">
              <option value="">All Types</option>
              {taxonomy.resourceTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">Apply</button>
            {(filters.search || filters.type) && (
              <button type="button" onClick={clear} className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50">Clear</button>
            )}
          </div>
        </form>
      </div>

      <div className="mb-5">
        <p className="text-sm text-gray-500"><span className="font-bold text-gray-800">{results.length}</span> resources found</p>
      </div>

      {results.length > 0 ? (
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {results.map((r) => <ResourceCard key={r.id} resource={r} />)}
        </StaggerGrid>
      ) : (
        <EmptyState title="No resources found" message="Try adjusting your filters." icon="📄" action={{ label: "Clear Filters", onClick: clear }} />
      )}
    </>
  );
}
