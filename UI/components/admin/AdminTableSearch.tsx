"use client";
import { useState, useMemo } from "react";
import React from "react";

interface AdminTableSearchProps {
  items: Record<string, unknown>[];
  searchFields: string[];
  placeholder?: string;
  children: (filtered: Record<string, unknown>[]) => React.ReactNode;
}

export default function AdminTableSearch({
  items,
  searchFields,
  placeholder = "Search...",
  children,
}: AdminTableSearchProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) => {
        const val = item[field];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [items, query, searchFields]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-8 py-2 bg-white border border-ink-200 rounded-lg text-sm text-ink-800 placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 text-xs">✕</button>
          )}
        </div>
        <span className="text-sm text-ink-400">{filtered.length} of {items.length}</span>
      </div>
      {children(filtered)}
    </div>
  );
}
