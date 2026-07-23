// Client half of /themes: search box and result grid.
// The page prerenders the full published list, so this filters in memory.
"use client";

import { useMemo } from "react";
import ThemeCard from "@/components/public/ThemeCard";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import EmptyState from "@/components/shared/EmptyState";
import { useUrlFilters } from "@/lib/hooks/useUrlFilters";
import type { Theme } from "@/lib/types";

const KEYS = ["search"] as const;

export default function ThemesBrowser({ themes }: { themes: Theme[] }) {
  const { filters, setFilters, clear } = useUrlFilters(KEYS);

  const results = useMemo(() => {
    if (!filters.search) return themes;
    const q = filters.search.toLowerCase();
    return themes.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
    );
  }, [themes, filters]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setFilters({ search: String(data.get("search") ?? "") });
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-card">
        <form onSubmit={onSubmit} className="flex gap-3 items-end">
          <div className="flex-1 max-w-sm">
            <input name="search" type="text" aria-label="Search themes" defaultValue={filters.search ?? ""} placeholder="Search themes..." className="form-input" />
          </div>
          <button type="submit" className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">Search</button>
          {filters.search && <button type="button" onClick={clear} className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50">Clear</button>}
        </form>
      </div>

      <div className="mb-5">
        <p className="text-sm text-gray-500"><span className="font-bold text-gray-800">{results.length}</span> thematic areas</p>
      </div>

      {results.length > 0 ? (
        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {results.map((t) => <ThemeCard key={t.id} theme={t} />)}
        </StaggerGrid>
      ) : (
        <EmptyState title="No themes found" message="Try adjusting your search." icon="📚" action={{ label: "Clear Search", onClick: clear }} />
      )}
    </>
  );
}
