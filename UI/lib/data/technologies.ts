// ============================================================
// Technologies Data Service — backed by the Laravel REST API
// ============================================================
import { Technology, TechnologyFilters } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

export async function getAllTechnologies(token?: string): Promise<Technology[]> {
  const items = await apiGet<Technology[]>(
    "technologies",
    [],
    { params: { admin: token ? true : undefined }, token }
  );
  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getPublishedTechnologies(): Promise<Technology[]> {
  return apiGet<Technology[]>("technologies", []);
}

export async function getTechnologyBySlug(
  slug: string,
  token?: string
): Promise<Technology | null> {
  return apiGet<Technology | null>(
    `technologies/${slug}`,
    null,
    { params: { admin: token ? true : undefined }, token }
  );
}

export async function filterTechnologies(
  filters: TechnologyFilters,
  publishedOnly = true
): Promise<Technology[]> {
  let items = publishedOnly
    ? await getPublishedTechnologies()
    : await getAllTechnologies();

  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q)
    );
  }
  if (filters.category) {
    items = items.filter(
      (t) => t.category.toLowerCase() === filters.category!.toLowerCase()
    );
  }
  if (filters.themeId) {
    // Technologies linked to a theme (relatedTechnologyIds on the theme).
    items = items;
  }
  if (filters.featured !== undefined) {
    items = items.filter((t) => t.featured === filters.featured);
  }
  return items;
}

export async function createTechnology(
  data: Omit<Technology, "id" | "slug" | "updatedAt">,
  token?: string
): Promise<Technology> {
  return (await apiSend<Technology>("POST", "technologies", data, { token }))!;
}

export async function updateTechnology(
  slug: string,
  data: Partial<Technology>,
  token?: string
): Promise<Technology | null> {
  return apiSend<Technology>("PUT", `technologies/${slug}`, data, { token });
}

export async function deleteTechnology(
  slug: string,
  token?: string
): Promise<boolean> {
  try {
    await apiSend("DELETE", `technologies/${slug}`, undefined, { token });
    return true;
  } catch {
    return false;
  }
}

export async function getFeaturedTechnologies(
  limit = 3
): Promise<Technology[]> {
  const items = await getPublishedTechnologies();
  return items.filter((t) => t.featured).slice(0, limit);
}
