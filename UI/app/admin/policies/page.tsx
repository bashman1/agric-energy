import { getAllPolicies } from "@/lib/data/policies";
import { getAuthToken } from "@/lib/auth/session";
import type { Metadata } from "next";
import AdminContentListClient, { type ContentRow } from "@/components/admin/AdminContentListClient";

export const metadata: Metadata = { title: "Manage Policies" };

export default async function AdminPoliciesPage() {
  const token = await getAuthToken();
  const policies = await getAllPolicies(token);

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
}
