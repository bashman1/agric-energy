"use client";

import AdminDataPage from "@/components/admin/AdminDataPage";
import { getToken } from "@/lib/auth/token";
import { getAllTechnologies } from "@/lib/data/technologies";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminListTable from "@/components/admin/AdminListTable";

export default function AdminTechsPage() {
  return (
    <AdminDataPage title="Manage Technologies" load={() => getAllTechnologies(getToken())}>
      {(items, reload) => {
      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

      return (
        <div>
          <AdminPageHeader
            title="Technologies"
            subtitle={`${items.length} total · ${items.filter(t => t.published).length} published`}
            action={{ label: "New Technology", href: "/admin/technologies/edit" }}
          />
          <AdminListTable
            rows={sorted}
            type="technologies"
            getKey={(t) => t.id}
            getSlug={(t) => t.slug}
            getLabel={(t) => t.name}
            onChanged={reload}
            emptyMessage="No technologies yet."
            columns={[
              { label: "Name" },
              { label: "Category" },
              { label: "Created by" },
              { label: "Published" },
              { label: "Featured" },
              { label: "Actions" },
            ]}
            renderRow={(t) => (
              <>
                <td><div className="font-medium text-ink-900 text-sm">{t.name}</div></td>
                <td className="text-sm text-ink-600">
                  {t.category}
                  {t.subcategory && <div className="text-xs text-ink-400">{t.subcategory}</div>}
                </td>
                <td className="text-xs text-ink-500">{t.createdBy || "—"}</td>
                <td><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.published ? "text-primary-700 bg-primary-50" : "text-ink-500 bg-ink-100"}`}>{t.published ? "Live" : "Draft"}</span></td>
                <td className="text-xs text-ink-400">{t.featured ? "Yes" : "—"}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/technologies/edit?slug=${encodeURIComponent(t.slug)}`} className="text-xs text-primary-700 hover:text-primary-800 font-semibold">Edit</Link>
                    <Link href={`/technologies/${t.slug}`} target="_blank" className="text-xs text-ink-400 hover:text-ink-600">View</Link>
                  </div>
                </td>
              </>
            )}
          />
        </div>
      );
      }}
    </AdminDataPage>
  );
}
