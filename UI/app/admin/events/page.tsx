"use client";

import { getAllEvents } from "@/lib/data/events";
import AdminDataPage from "@/components/admin/AdminDataPage";
import AdminContentListClient, { type ContentRow } from "@/components/admin/AdminContentListClient";

export default function AdminEventsPage() {
  return (
    <AdminDataPage title="Manage Events" load={() => getAllEvents()}>
      {(events) => {
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
      }}
    </AdminDataPage>
  );
}
