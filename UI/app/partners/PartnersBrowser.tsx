// Client half of /partners: filter form and result grid.
// The page prerenders the full published list; this filters in memory and
// mirrors the active filters into the query string for shareable URLs.
"use client";

import { useMemo } from "react";
import PartnerCard from "@/components/public/PartnerCard";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import EmptyState from "@/components/shared/EmptyState";
import { useUrlFilters } from "@/lib/hooks/useUrlFilters";
import type { Partner, Taxonomy } from "@/lib/types";

const KEYS = ["search", "kind", "type", "region"] as const;

/**
 * The directory covers two different kinds of actor and visitors arrive
 * looking for one or the other — an organisation to work with, or a named
 * specialist to consult. Listing both in one undifferentiated grid made the
 * second search impossible.
 */
const KIND_TABS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "organization", label: "Organisations" },
  { value: "individual", label: "Individuals" },
];

export default function PartnersBrowser({
  partners,
  taxonomy,
}: {
  partners: Partner[];
  taxonomy: Taxonomy;
}) {
  const { filters, setFilters, clear } = useUrlFilters(KEYS);

  const results = useMemo(() => {
    let items = partners;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filters.kind) {
      // Records predating the individual profiles carry no entityKind; they
      // are all organisations.
      items = items.filter(
        (p) => (p.entityKind ?? "organization") === filters.kind
      );
    }
    if (filters.type) {
      items = items.filter(
        (p) => p.type?.toLowerCase() === filters.type!.toLowerCase()
      );
    }
    if (filters.region) {
      items = items.filter((p) => p.regions?.includes(filters.region!));
    }
    return items;
  }, [partners, filters]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setFilters({
      search: String(data.get("search") ?? ""),
      kind: filters.kind ?? "",
      type: String(data.get("type") ?? ""),
      region: String(data.get("region") ?? ""),
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-card">
        <div role="tablist" aria-label="Kind of partner" className="flex gap-1 mb-4">
          {KIND_TABS.map((tab) => {
            const active = (filters.kind ?? "") === tab.value;
            return (
              <button
                key={tab.value || "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilters({ ...filters, kind: tab.value })}
                className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
                  active
                    ? "bg-primary-700 text-white border-primary-700"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <form onSubmit={onSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label htmlFor="partner-search" className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
            <input id="partner-search" name="search" type="text" defaultValue={filters.search ?? ""} placeholder="Name…" className="form-input" />
          </div>
          <div className="min-w-40">
            <label htmlFor="partner-type" className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
            <select id="partner-type" name="type" defaultValue={filters.type ?? ""} className="form-input">
              <option value="">All Types</option>
              {taxonomy.partnerTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div className="min-w-40">
            <label htmlFor="partner-region" className="block text-xs font-semibold text-gray-600 mb-1">Region</label>
            <select id="partner-region" name="region" defaultValue={filters.region ?? ""} className="form-input">
              <option value="">All Regions</option>
              {["Northern", "Eastern", "Central", "Western"].map((r) => <option key={r} value={r}>{r} Uganda</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">Apply</button>
            {(filters.search || filters.kind || filters.type || filters.region) && (
              <button type="button" onClick={clear} className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50">Clear</button>
            )}
          </div>
        </form>
      </div>

      <div className="mb-5">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-800">{results.length}</span>{" "}
          {filters.kind === "individual"
            ? "individuals"
            : filters.kind === "organization"
              ? "organisations"
              : "partners"}{" "}
          found
        </p>
      </div>

      {results.length > 0 ? (
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {results.map((p) => <PartnerCard key={p.id} partner={p} />)}
        </StaggerGrid>
      ) : (
        <EmptyState title="No partners found" message="Try adjusting your filters." icon="🤝" action={{ label: "Clear Filters", onClick: clear }} />
      )}
    </>
  );
}
