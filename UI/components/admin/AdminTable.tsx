"use client";
import { useState, useMemo } from "react";

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
  searchable?: boolean;
}

interface AdminTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  getSearchText?: (item: T) => string;
  rowActions?: (item: T) => React.ReactNode;
}

export default function AdminTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = "Search...",
  getSearchText,
  rowActions,
}: AdminTableProps<T>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((item) => {
      const text = getSearchText ? getSearchText(item) : Object.values(item as Record<string, unknown>).join(" ");
      return String(text).toLowerCase().includes(q);
    });
  }, [data, query, getSearchText]);

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              ✕
            </button>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {filtered.length} of {data.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="responsive-table w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="text-left px-4 py-3 bg-gray-800 text-gray-400 text-xs uppercase tracking-wide font-semibold border-b border-gray-700">
                  {col.label}
                </th>
              ))}
              {rowActions && (
                <th className="text-right px-4 py-3 bg-gray-800 text-gray-400 text-xs uppercase tracking-wide font-semibold border-b border-gray-700">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-4 py-10 text-center text-gray-500 text-sm">
                  {query ? `No results for "${query}"` : "No items yet."}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm">
                      {col.render(item)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3 text-right text-sm">
                      {rowActions(item)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
