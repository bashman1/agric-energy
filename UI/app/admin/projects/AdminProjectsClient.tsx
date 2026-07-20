"use client";
import Link from "next/link";
import { Project } from "@/lib/types";
import AdminTableSearch from "@/components/admin/AdminTableSearch";

export default function AdminProjectsClient({ projects }: { projects: Project[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {projects.length} total · {projects.filter((p) => p.published).length} published
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors"
        >
          + New Project
        </Link>
      </div>

      <AdminTableSearch
        items={projects as unknown as Record<string, unknown>[]}
        searchFields={["title", "geographicCoverageSummary", "valueChain", "status"]}
        placeholder="Search projects by title, location, value chain..."
      >
        {(filtered) => {
          const items = filtered as unknown as Project[];
          return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="responsive-table min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Published</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Featured</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-400 py-10 text-sm">No projects found.</td>
                    </tr>
                  ) : (
                    items.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm max-w-xs truncate">{p.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{p.valueChain ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                          <span className="text-xs text-gray-500 line-clamp-2">{p.district || p.region || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            p.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.status === "Completed" ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${p.published ? "text-emerald-600" : "text-gray-400"}`}>
                            {p.published ? "✓ Live" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{p.featured ? "★ Yes" : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/projects/${p.slug}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</Link>
                            <Link href={`/projects/${p.slug}`} target="_blank" className="text-xs text-gray-400 hover:text-gray-600">View →</Link>
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
