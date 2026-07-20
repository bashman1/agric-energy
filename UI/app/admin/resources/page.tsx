import { getAllResources } from "@/lib/data/resources";
import { getAuthToken } from "@/lib/auth/session";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Manage Resources" };

export default async function AdminResourcesPage() {
  const token = await getAuthToken();
  const items = await getAllResources(token);
  const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} total · {items.filter(r => r.published).length} published</p>
        </div>
        <Link href="/admin/resources/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">
          + New Resource
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="responsive-table">
          <thead><tr><th>Title</th><th>Type</th><th>Date</th><th>Published</th><th>Featured</th><th>Actions</th></tr></thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td><div className="font-medium text-gray-900 text-sm max-w-xs truncate">{r.title}</div></td>
                <td className="text-sm text-gray-600">{r.type}</td>
                <td className="text-xs text-gray-500">{r.publicationDate?.slice(0, 7) ?? "—"}</td>
                <td><span className={`text-xs font-semibold ${r.published ? "text-emerald-600" : "text-gray-400"}`}>{r.published ? "✓ Live" : "Draft"}</span></td>
                <td className="text-xs text-gray-400">{r.featured ? "★ Yes" : "—"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/resources/${r.slug}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</Link>
                    <Link href={`/resources/${r.slug}`} target="_blank" className="text-xs text-gray-400 hover:text-gray-600">View →</Link>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (<tr><td colSpan={6} className="text-center text-gray-400 py-10 text-sm">No resources yet.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
