"use client";
import Link from "next/link";
import { Project } from "@/lib/types";
import AdminTableSearch from "@/components/admin/AdminTableSearch";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export default function AdminProjectsClient({ projects }: { projects: Project[] }) {
  return (
    <div>
      <AdminPageHeader
        title="Projects"
        subtitle={`${projects.length} total · ${projects.filter((p) => p.published).length} published`}
        action={{ label: "New Project", href: "/admin/projects/edit" }}
      />

      <AdminTableSearch
        items={projects as unknown as Record<string, unknown>[]}
        searchFields={["title", "geographicCoverageSummary", "valueChain", "status"]}
        placeholder="Search projects by title, location, value chain..."
      >
        {(filtered) => {
          const items = filtered as unknown as Project[];
          return (
            <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
              <table className="responsive-table min-w-full divide-y divide-ink-100">
                <thead>
                  <tr className="bg-ink-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Published</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Featured</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-ink-400 py-10 text-sm">No projects found.</td>
                    </tr>
                  ) : (
                    items.map((p) => (
                      <tr key={p.id} className="hover:bg-ink-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink-900 text-sm max-w-xs truncate">{p.title}</div>
                          <div className="text-xs text-ink-400 mt-0.5">{p.valueChain ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-ink-600 max-w-xs">
                          <span className="text-xs text-ink-500 line-clamp-2">{p.district || p.region || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            p.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.status === "Completed" ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.published ? "text-primary-700 bg-primary-50" : "text-ink-500 bg-ink-100"}`}>
                            {p.published ? "Live" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-400">{p.featured ? "Yes" : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Link href={`/admin/projects/edit?slug=${encodeURIComponent(p.slug)}`} className="text-xs text-primary-700 hover:text-primary-800 font-semibold">Edit</Link>
                            <Link href={`/projects/${p.slug}`} target="_blank" className="text-xs text-ink-400 hover:text-ink-600">View</Link>
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
