import { getAllPartners } from "@/lib/data/partners";
import { getAuthToken } from "@/lib/auth/session";
import Link from "next/link";
import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const metadata: Metadata = { title: "Manage Partners" };

export default async function AdminPartnersPage() {
  const token = await getAuthToken();
  const items = await getAllPartners(token);
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <AdminPageHeader
        title="Partners"
        subtitle={`${items.length} total · ${items.filter(p => p.published).length} published`}
        action={{ label: "New Partner", href: "/admin/partners/new" }}
      />
      <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
        <table className="responsive-table">
          <thead><tr><th>Name</th><th>Type</th><th>Regions</th><th>Published</th><th>Actions</th></tr></thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id}>
                <td><div className="font-medium text-ink-900 text-sm max-w-xs truncate">{p.name}</div></td>
                <td className="text-sm text-ink-600">{p.type}</td>
                <td className="text-xs text-ink-500">{p.regions?.join(", ") ?? "—"}</td>
                <td><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.published ? "text-primary-700 bg-primary-50" : "text-ink-500 bg-ink-100"}`}>{p.published ? "Live" : "Draft"}</span></td>
                <td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/partners/${p.slug}`} className="text-xs text-primary-700 hover:text-primary-800 font-semibold">Edit</Link>
                    <Link href={`/partners/${p.slug}`} target="_blank" className="text-xs text-ink-400 hover:text-ink-600">View</Link>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (<tr><td colSpan={5} className="text-center text-ink-400 py-10 text-sm">No partners yet.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
