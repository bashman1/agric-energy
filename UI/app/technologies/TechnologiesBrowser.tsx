// Client half of /technologies: filter form and result grid.
// The page prerenders the full published list, so this filters in memory.
"use client";

import { useMemo } from "react";
import TechCard from "@/components/public/TechCard";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import EmptyState from "@/components/shared/EmptyState";
import { useUrlFilters } from "@/lib/hooks/useUrlFilters";
import type { Taxonomy, Technology } from "@/lib/types";

const KEYS = ["search", "category"] as const;

export default function TechnologiesBrowser({
  technologies,
  taxonomy,
}: {
  technologies: Technology[];
  taxonomy: Taxonomy;
}) {
  const { filters, setFilters, clear } = useUrlFilters(KEYS);

  const results = useMemo(() => {
    let items = technologies;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.summary ?? "").toLowerCase().includes(q)
      );
    }
    if (filters.category) {
      items = items.filter(
        (t) => t.category?.toLowerCase() === filters.category!.toLowerCase()
      );
    }
    return items;
  }, [technologies, filters]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setFilters({
      search: String(data.get("search") ?? ""),
      category: String(data.get("category") ?? ""),
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-card">
        <form onSubmit={onSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label htmlFor="tech-search" className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
            <input id="tech-search" name="search" type="text" defaultValue={filters.search ?? ""} placeholder="Search technologies..." className="form-input" />
          </div>
          <div className="min-w-48">
            <label htmlFor="tech-category" className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
            <select id="tech-category" name="category" defaultValue={filters.category ?? ""} className="form-input">
              <option value="">All Categories</option>
              {taxonomy.technologyCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">Apply</button>
            {(filters.search || filters.category) && (
              <button type="button" onClick={clear} className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50">Clear</button>
            )}
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500"><span className="font-bold text-gray-800">{results.length}</span> technologies</p>
      </div>

      {results.length > 0 ? (
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {results.map((t) => <TechCard key={t.id} tech={t} />)}
        </StaggerGrid>
      ) : (
        <EmptyState title="No technologies found" message="Try adjusting your search or category filter." icon="⚡" action={{ label: "Clear Filters", onClick: clear }} />
      )}
    </>
  );
}
