"use client";
import Link from "next/link";
import AdminTableSearch from "@/components/admin/AdminTableSearch";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
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
      <AdminPageHeader
        title={schema.plural}
        subtitle={`${rows.length} total · ${rows.filter((r) => r.published).length} published`}
        action={{ label: `New ${schema.singular}`, href: `${schema.adminPath}/edit` }}
      />

      <AdminTableSearch
        items={rows}
        searchFields={["title", "subtitle", "badge"]}
        placeholder={`Search ${schema.plural.toLowerCase()}…`}
      >
        {(filtered) => {
          const items = filtered as unknown as ContentRow[];
          return (
            <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
              <table className="responsive-table min-w-full divide-y divide-ink-100">
                <thead>
                  <tr className="bg-ink-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">{badgeLabel}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">{dateLabel}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Published</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Featured</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-ink-400 py-10 text-sm">
                        No {schema.plural.toLowerCase()} found.
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr key={r.id} className="hover:bg-ink-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink-900 text-sm max-w-xs truncate">{r.title}</div>
                          <div className="text-xs text-ink-400 mt-0.5">{r.subtitle || "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          {r.badge ? (
                            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full border bg-ink-50 text-ink-600 border-ink-200">
                              {r.badge}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-500">{r.date || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${r.published ? "text-primary-700 bg-primary-50" : "text-ink-500 bg-ink-100"}`}>
                            {r.published ? "Live" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-400">{r.featured ? "Yes" : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Link href={`${schema.adminPath}/edit?slug=${encodeURIComponent(r.slug)}`} className="text-xs text-primary-700 hover:text-primary-800 font-semibold">Edit</Link>
                            <Link href={`${schema.publicPath}/${r.slug}`} target="_blank" className="text-xs text-ink-400 hover:text-ink-600">View</Link>
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
