import { getAllThemes } from "@/lib/data/themes";
import { getAuthToken } from "@/lib/auth/session";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Manage Themes" };

export default async function AdminThemesPage() {
  const token = await getAuthToken();
  const items = await getAllThemes(token);
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Themes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} total · {items.filter(t => t.published).length} published</p>
        </div>
        <Link href="/admin/themes/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">
          + New Theme
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="responsive-table">
          <thead><tr><th>Theme</th><th>Published</th><th>Featured</th><th>Actions</th></tr></thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                  </div>
                </td>
                <td><span className={`text-xs font-semibold ${t.published ? "text-emerald-600" : "text-gray-400"}`}>{t.published ? "✓ Live" : "Draft"}</span></td>
                <td className="text-xs text-gray-400">{t.featured ? "★ Yes" : "—"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/themes/${t.slug}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</Link>
                    <Link href={`/themes/${t.slug}`} target="_blank" className="text-xs text-gray-400 hover:text-gray-600">View →</Link>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (<tr><td colSpan={4} className="text-center text-gray-400 py-10 text-sm">No themes yet.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
