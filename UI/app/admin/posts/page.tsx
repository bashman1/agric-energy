import { getAllPosts } from "@/lib/data/posts";
import { getAuthToken } from "@/lib/auth/session";
import type { Metadata } from "next";
import AdminContentListClient, { type ContentRow } from "@/components/admin/AdminContentListClient";

export const metadata: Metadata = { title: "Manage Posts" };

const CATEGORY_LABELS: Record<string, string> = {
  news: "News",
  story: "Impact story",
  press_release: "Press release",
  announcement: "Announcement",
};

export default async function AdminPostsPage() {
  const token = await getAuthToken();
  const posts = await getAllPosts(token);

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
}
