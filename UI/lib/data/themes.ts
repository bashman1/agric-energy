// ============================================================
// Themes Data Service — backed by the Laravel REST API
// ============================================================
import { Theme, ThemeFilters } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

export async function getAllThemes(token?: string): Promise<Theme[]> {
  const items = await apiGet<Theme[]>(
    "themes",
    [],
    { params: { admin: token ? true : undefined }, token }
  );
  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getPublishedThemes(): Promise<Theme[]> {
  return apiGet<Theme[]>("themes", []);
}

export async function getThemeBySlug(
  slug: string,
  token?: string
): Promise<Theme | null> {
  return apiGet<Theme | null>(
    `themes/${slug}`,
    null,
    { params: { admin: token ? true : undefined }, token }
  );
}

export async function filterThemes(
  filters: ThemeFilters,
  publishedOnly = true
): Promise<Theme[]> {
  let items = publishedOnly
    ? await getPublishedThemes()
    : await getAllThemes();

  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q)
    );
  }
  if (filters.featured !== undefined) {
    items = items.filter((t) => t.featured === filters.featured);
  }
  return items;
}

export async function createTheme(
  data: Omit<Theme, "id" | "slug" | "updatedAt">,
  token?: string
): Promise<Theme> {
  return (await apiSend<Theme>("POST", "themes", data, { token }))!;
}

export async function updateTheme(
  slug: string,
  data: Partial<Theme>,
  token?: string
): Promise<Theme | null> {
  return apiSend<Theme>("PUT", `themes/${slug}`, data, { token });
}

export async function deleteTheme(
  slug: string,
  token?: string
): Promise<boolean> {
  try {
    await apiSend("DELETE", `themes/${slug}`, undefined, { token });
    return true;
  } catch {
    return false;
  }
}

export async function getFeaturedThemes(limit = 4): Promise<Theme[]> {
  const items = await getPublishedThemes();
  return items.filter((t) => t.featured).slice(0, limit);
}
