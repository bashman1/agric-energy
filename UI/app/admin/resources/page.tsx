"use client";

import AdminDataPage from "@/components/admin/AdminDataPage";
import { getAllResources } from "@/lib/data/resources";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export default function AdminResourcesPage() {
  return (
    <AdminDataPage title="Manage Resources" load={() => getAllResources()}>
      {(items) => {
      const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title));

      return (
        <div>
          <AdminPageHeader
            title="Resources"
            subtitle={`${items.length} total · ${items.filter(r => r.published).length} published`}
            action={{ label: "New Resource", href: "/admin/resources/edit" }}
          />
          <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
            <table className="responsive-table">
              <thead><tr><th>Title</th><th>Type</th><th>Date</th><th>Published</th><th>Featured</th><th>Actions</th></tr></thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id}>
                    <td><div className="font-medium text-ink-900 text-sm max-w-xs truncate">{r.title}</div></td>
                    <td className="text-sm text-ink-600">{r.type}</td>
                    <td className="text-xs text-ink-500">{r.publicationDate?.slice(0, 7) ?? "—"}</td>
                    <td><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.published ? "text-primary-700 bg-primary-50" : "text-ink-500 bg-ink-100"}`}>{r.published ? "Live" : "Draft"}</span></td>
                    <td className="text-xs text-ink-400">{r.featured ? "Yes" : "—"}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/resources/edit?slug=${encodeURIComponent(r.slug)}`} className="text-xs text-primary-700 hover:text-primary-800 font-semibold">Edit</Link>
                        <Link href={`/resources/${r.slug}`} target="_blank" className="text-xs text-ink-400 hover:text-ink-600">View</Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (<tr><td colSpan={6} className="text-center text-ink-400 py-10 text-sm">No resources yet.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      );
      }}
    </AdminDataPage>
  );
}
