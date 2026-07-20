"use client";
import Link from "next/link";
import AdminTableSearch from "@/components/admin/AdminTableSearch";
import { CONTENT_SCHEMAS, type ContentModule } from "@/components/admin/contentSchemas";

/**
 * Flattened row shape every content module maps into, so one table can
 * serve posts, events, opportunities and policies. The server page owns
 * the mapping (which field is the badge, which is the date).
 */
export interface ContentRow extends Record<string, unknown> {
  id: string;
  slug: string;
  title: string;
  /** Secondary line under the title (value chain, funder, location…). */
  subtitle: string;
  /** Pill column (category / type). */
  badge: string;
  /** Date column, already formatted for display. */
  date: string;
  published: boolean;
  featured: boolean;
}

interface Props {
  module: ContentModule;
  rows: ContentRow[];
  /** Header for the pill column, e.g. "Category". */
  badgeLabel: string;
  /** Header for the date column, e.g. "Published". */
  dateLabel: string;
}

export default function AdminContentListClient({ module, rows, badgeLabel, dateLabel }: Props) {
  const schema = CONTENT_SCHEMAS[module];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{schema.plural}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {rows.length} total · {rows.filter((r) => r.published).length} published
          </p>
        </div>
        <Link
          href={`${schema.adminPath}/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors"
        >
          + New {schema.singular}
        </Link>
      </div>

      <AdminTableSearch
        items={rows}
        searchFields={["title", "subtitle", "badge"]}
        placeholder={`Search ${schema.plural.toLowerCase()}…`}
      >
        {(filtered) => {
          const items = filtered as unknown as ContentRow[];
          return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="responsive-table min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{badgeLabel}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{dateLabel}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Published</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Featured</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-400 py-10 text-sm">
                        No {schema.plural.toLowerCase()} found.
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm max-w-xs truncate">{r.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{r.subtitle || "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          {r.badge ? (
                            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
                              {r.badge}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{r.date || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${r.published ? "text-emerald-600" : "text-gray-400"}`}>
                            {r.published ? "✓ Live" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{r.featured ? "★ Yes" : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={`${schema.adminPath}/${r.slug}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</Link>
                            <Link href={`${schema.publicPath}/${r.slug}`} target="_blank" className="text-xs text-gray-400 hover:text-gray-600">View →</Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          );
        }}
      </AdminTableSearch>
    </div>
  );
}
