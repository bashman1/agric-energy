import { getAllPartners } from "@/lib/data/partners";
import { getAuthToken } from "@/lib/auth/session";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Manage Partners" };

export default async function AdminPartnersPage() {
  const token = await getAuthToken();
  const items = await getAllPartners(token);
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} total · {items.filter(p => p.published).length} published</p>
        </div>
        <Link href="/admin/partners/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">
          + New Partner
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="responsive-table">
          <thead><tr><th>Name</th><th>Type</th><th>Regions</th><th>Published</th><th>Actions</th></tr></thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id}>
                <td><div className="font-medium text-gray-900 text-sm max-w-xs truncate">{p.name}</div></td>
                <td className="text-sm text-gray-600">{p.type}</td>
                <td className="text-xs text-gray-500">{p.regions?.join(", ") ?? "—"}</td>
                <td><span className={`text-xs font-semibold ${p.published ? "text-emerald-600" : "text-gray-400"}`}>{p.published ? "✓ Live" : "Draft"}</span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/partners/${p.slug}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</Link>
                    <Link href={`/partners/${p.slug}`} target="_blank" className="text-xs text-gray-400 hover:text-gray-600">View →</Link>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (<tr><td colSpan={5} className="text-center text-gray-400 py-10 text-sm">No partners yet.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
