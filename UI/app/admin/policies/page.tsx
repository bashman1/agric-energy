"use client";

import { getAllPolicies } from "@/lib/data/policies";
import AdminDataPage from "@/components/admin/AdminDataPage";
import AdminContentListClient, { type ContentRow } from "@/components/admin/AdminContentListClient";

export default function AdminPoliciesPage() {
  return (
    <AdminDataPage title="Manage Policies" load={() => getAllPolicies()}>
      {(policies) => {
      const rows: ContentRow[] = [...policies]
        .sort((a, b) => (b.publicationDate ?? "").localeCompare(a.publicationDate ?? ""))
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          subtitle: p.summary ?? "",
          badge: p.category ?? "",
          date: p.publicationDate?.slice(0, 10) ?? "",
          published: p.published,
          featured: p.featured,
        }));

      return (
        <AdminContentListClient module="policies" rows={rows} badgeLabel="Category" dateLabel="Published" />
      );
      }}
    </AdminDataPage>
  );
}
