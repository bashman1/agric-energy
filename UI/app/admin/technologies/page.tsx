import { getAllTechnologies } from "@/lib/data/technologies";
import { getAuthToken } from "@/lib/auth/session";
import Link from "next/link";
import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const metadata: Metadata = { title: "Manage Technologies" };

export default async function AdminTechsPage() {
  const token = await getAuthToken();
  const items = await getAllTechnologies(token);
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <AdminPageHeader
        title="Technologies"
        subtitle={`${items.length} total · ${items.filter(t => t.published).length} published`}
        action={{ label: "New Technology", href: "/admin/technologies/new" }}
      />
      <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Published</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.id}>
                <td><div className="font-medium text-ink-900 text-sm">{t.name}</div></td>
                <td className="text-sm text-ink-600">{t.category}</td>
                <td><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.published ? "text-primary-700 bg-primary-50" : "text-ink-500 bg-ink-100"}`}>{t.published ? "Live" : "Draft"}</span></td>
                <td className="text-xs text-ink-400">{t.featured ? "Yes" : "—"}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/technologies/${t.slug}`} className="text-xs text-primary-700 hover:text-primary-800 font-semibold">Edit</Link>
                    <Link href={`/technologies/${t.slug}`} target="_blank" className="text-xs text-ink-400 hover:text-ink-600">View</Link>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (<tr><td colSpan={5} className="text-center text-ink-400 py-10 text-sm">No technologies yet.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
