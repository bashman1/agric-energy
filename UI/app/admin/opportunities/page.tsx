import { getAllOpportunities } from "@/lib/data/opportunities";
import { getAuthToken } from "@/lib/auth/session";
import type { Metadata } from "next";
import AdminContentListClient, { type ContentRow } from "@/components/admin/AdminContentListClient";

export const metadata: Metadata = { title: "Manage Opportunities" };

const TYPE_LABELS: Record<string, string> = {
  funding: "Funding",
  investment: "Investment",
  tender: "Tender",
  procurement: "Procurement",
};

export default async function AdminOpportunitiesPage() {
  const token = await getAuthToken();
  const opportunities = await getAllOpportunities(token);

  const rows: ContentRow[] = [...opportunities]
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"))
    .map((o) => ({
      id: o.id,
      slug: o.slug,
      title: o.title,
      subtitle: [o.funder, o.sector].filter(Boolean).join(" · "),
      badge: TYPE_LABELS[o.opportunityType] ?? o.opportunityType ?? "",
      date: o.deadline?.slice(0, 10) ?? "",
      published: o.published,
      featured: o.featured,
    }));

  return (
    <AdminContentListClient module="opportunities" rows={rows} badgeLabel="Type" dateLabel="Deadline" />
  );
}
