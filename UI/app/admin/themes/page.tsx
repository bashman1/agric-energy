"use client";

import AdminDataPage from "@/components/admin/AdminDataPage";
import { getAllThemes } from "@/lib/data/themes";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminListTable from "@/components/admin/AdminListTable";

export default function AdminThemesPage() {
  return (
    <AdminDataPage title="Manage Themes" load={() => getAllThemes()}>
      {(items, reload) => {
      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

      return (
        <div>
          <AdminPageHeader
            title="Themes"
            subtitle={`${items.length} total · ${items.filter((t) => t.published).length} published`}
            action={{ label: "New Theme", href: "/admin/themes/edit" }}
          />
          <AdminListTable
            rows={sorted}
            type="themes"
            getKey={(t) => t.id}
            getSlug={(t) => t.slug}
            getLabel={(t) => t.name}
            onChanged={reload}
            emptyMessage="No themes yet."
            columns={[
              { label: "Theme" },
              { label: "Published" },
              { label: "Featured" },
              { label: "Actions" },
            ]}
            renderRow={(t) => (
              <>
                <td>
                  <div className="font-medium text-ink-900 text-sm">{t.name}</div>
                </td>
                <td><span className={`text-xs font-semibold ${t.published ? "text-primary-700" : "text-ink-400"}`}>{t.published ? "Live" : "Draft"}</span></td>
                <td className="text-xs text-ink-400">{t.featured ? "Yes" : "—"}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/themes/edit?slug=${encodeURIComponent(t.slug)}`} className="text-xs text-primary-700 hover:text-primary-800 font-semibold">Edit</Link>
                    <Link href={`/themes/${t.slug}`} target="_blank" className="text-xs text-ink-400 hover:text-ink-600">View →</Link>
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
