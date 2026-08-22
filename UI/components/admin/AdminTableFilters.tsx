"use client";

// ============================================================
// AdminTableFilters — the filter row above every admin list.
//
// Was AdminTableSearch, which only did free text. Admin work is mostly
// "find the things needing an action" — the pending registrations, the
// drafts, this month's submissions — and a text box cannot express that.
//
// Filtering stays in the browser over the already-loaded list: these are
// admin tables of tens to low hundreds of rows, so a round trip per
// keystroke would be slower and would lose the instant result count.
// ============================================================

import { useMemo, useState } from "react";
import React from "react";

export interface SelectFilter<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** True when `item` belongs in the results for the chosen `value`. */
  match: (item: T, value: string) => boolean;
}

interface Props<T> {
  items: T[];
  /** Fields compared against the search box, stringified. */
  searchFields: string[];
  placeholder?: string;
  filters?: SelectFilter<T>[];
  /**
   * Enables a from/to range. The named field must hold a YYYY-MM-DD
   * string, which compares correctly as text — every admin list already
   * stores its date that way.
   */
  dateField?: { key: string; label: string };
  children: (filtered: T[]) => React.ReactNode;
}

const CONTROL =
  "py-2 px-3 bg-white border border-ink-200 rounded-lg text-sm text-ink-800 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100";

export default function AdminTableFilters<T extends Record<string, unknown>>({
  items,
  searchFields,
  placeholder = "Search...",
  filters = [],
  dateField,
  children,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      if (q && !searchFields.some((field) => {
        const val = item[field];
        return val != null && String(val).toLowerCase().includes(q);
      })) return false;

      for (const filter of filters) {
        const value = selected[filter.key];
        if (value && !filter.match(item, value)) return false;
      }

      if (dateField && (from || to)) {
        const raw = item[dateField.key];
        const date = raw == null ? "" : String(raw).slice(0, 10);
        // A row with no date cannot satisfy a range, so it drops out
        // rather than silently passing through.
        if (!date) return false;
        if (from && date < from) return false;
        if (to && date > to) return false;
      }

      return true;
    });
  }, [items, query, searchFields, filters, selected, dateField, from, to]);

  const active =
    query.trim() !== "" ||
    from !== "" ||
    to !== "" ||
    Object.values(selected).some(Boolean);

  const clearAll = () => {
    setQuery("");
    setSelected({});
    setFrom("");
    setTo("");
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="admin-search" className="block text-[11px] font-semibold text-ink-500 mb-1">
            Search
          </label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="admin-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className={`${CONTROL} w-64 pl-9`}
            />
          </div>
        </div>

        {filters.map((filter) => (
          <div key={filter.key}>
            <label htmlFor={`admin-filter-${filter.key}`} className="block text-[11px] font-semibold text-ink-500 mb-1">
              {filter.label}
            </label>
            <select
              id={`admin-filter-${filter.key}`}
              value={selected[filter.key] ?? ""}
              onChange={(e) =>
                setSelected((s) => ({ ...s, [filter.key]: e.target.value }))
              }
              className={CONTROL}
            >
              <option value="">All</option>
              {filter.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ))}

        {dateField && (
          <div>
            <span className="block text-[11px] font-semibold text-ink-500 mb-1">{dateField.label}</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                aria-label={`${dateField.label} from`}
                className={CONTROL}
              />
              <span className="text-ink-400 text-xs">to</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                aria-label={`${dateField.label} to`}
                className={CONTROL}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pb-2 ml-auto">
          <span className="text-sm text-ink-400 tabular-nums" role="status">
            {filtered.length} of {items.length}
          </span>
          {active && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-primary-700 hover:text-primary-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {children(filtered)}
    </div>
  );
}
