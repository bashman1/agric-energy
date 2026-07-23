"use client";

import { getAllPosts } from "@/lib/data/posts";
import AdminDataPage from "@/components/admin/AdminDataPage";
import AdminContentListClient, { type ContentRow } from "@/components/admin/AdminContentListClient";

const CATEGORY_LABELS: Record<string, string> = {
  news: "News",
  story: "Impact story",
  press_release: "Press release",
  announcement: "Announcement",
};

export default function AdminPostsPage() {
  return (
    <AdminDataPage title="Manage Posts" load={() => getAllPosts()}>
      {(posts) => {
      const rows: ContentRow[] = [...posts]
        .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
        .map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          subtitle: p.excerpt ?? "",
          badge: CATEGORY_LABELS[p.category] ?? p.category ?? "",
          date: p.publishedAt?.slice(0, 10) ?? "",
          published: p.published,
          featured: p.featured,
        }));

      return (
        <AdminContentListClient module="posts" rows={rows} badgeLabel="Category" dateLabel="Published" />
      );
      }}
    </AdminDataPage>
  );
}
