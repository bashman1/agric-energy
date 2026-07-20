// ============================================================
// Newsroom category vocabulary — shared by the listing and
// the article detail page. Mirrors the API's `posts.category`.
// ============================================================

/** Tabs on /news — an empty slug means "All". */
export const CATEGORIES = [
  { slug: "", label: "All" },
  { slug: "news", label: "News" },
  { slug: "story", label: "Stories" },
  { slug: "press_release", label: "Press releases" },
  { slug: "announcement", label: "Announcements" },
] as const;

/** Singular display label for a stored category value. */
export const CATEGORY_LABELS: Record<string, string> = {
  news: "News",
  story: "Story",
  press_release: "Press release",
  announcement: "Announcement",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/** Format an ISO publication date for display. */
export function formatPublished(date: string | null): string {
  if (!date) return "Unpublished";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
