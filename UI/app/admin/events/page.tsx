import { getAllEvents } from "@/lib/data/events";
import { getAuthToken } from "@/lib/auth/session";
import type { Metadata } from "next";
import AdminContentListClient, { type ContentRow } from "@/components/admin/AdminContentListClient";

export const metadata: Metadata = { title: "Manage Events" };

export default async function AdminEventsPage() {
  const token = await getAuthToken();
  const events = await getAllEvents(token);

  const rows: ContentRow[] = [...events]
    .sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? ""))
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      subtitle: e.isOnline ? "Online" : e.location ?? "",
      badge: e.type ?? "",
      date: e.startsAt?.slice(0, 10) ?? "",
      published: e.published,
      featured: e.featured,
    }));

  return (
    <AdminContentListClient module="events" rows={rows} badgeLabel="Type" dateLabel="Starts" />
  );
}
