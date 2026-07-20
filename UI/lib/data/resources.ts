// ============================================================
// Resources Data Service — backed by the Laravel REST API
// ============================================================
import { Resource, ResourceFilters } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

export async function getAllResources(token?: string): Promise<Resource[]> {
  const items = await apiGet<Resource[]>(
    "resources",
    [],
    { params: { admin: token ? true : undefined }, token }
  );
  return items.sort(
    (a, b) =>
      new Date(b.publicationDate).getTime() -
      new Date(a.publicationDate).getTime()
  );
}

export async function getPublishedResources(): Promise<Resource[]> {
  return apiGet<Resource[]>("resources", []);
}

export async function getResourceBySlug(
  slug: string,
  token?: string
): Promise<Resource | null> {
  return apiGet<Resource | null>(
    `resources/${slug}`,
    null,
    { params: { admin: token ? true : undefined }, token }
  );
}

export async function filterResources(
  filters: ResourceFilters,
  publishedOnly = true
): Promise<Resource[]> {
  let items = publishedOnly
    ? await getPublishedResources()
    : await getAllResources();

  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q)
    );
  }
  if (filters.type) {
    items = items.filter(
      (r) => r.type.toLowerCase() === filters.type!.toLowerCase()
    );
  }
  if (filters.themeId) {
    items = items.filter((r) => r.themeIds.includes(filters.themeId!));
  }
  if (filters.technologyId) {
    items = items.filter((r) => r.technologyIds.includes(filters.technologyId!));
  }
  if (filters.featured !== undefined) {
    items = items.filter((r) => r.featured === filters.featured);
  }
  return items;
}

export async function createResource(
  data: Omit<Resource, "id" | "slug" | "updatedAt">,
  token?: string
): Promise<Resource> {
  return (await apiSend<Resource>("POST", "resources", data, { token }))!;
}

export async function updateResource(
  slug: string,
  data: Partial<Resource>,
  token?: string
): Promise<Resource | null> {
  return apiSend<Resource>("PUT", `resources/${slug}`, data, { token });
}

export async function deleteResource(
  slug: string,
  token?: string
): Promise<boolean> {
  try {
    await apiSend("DELETE", `resources/${slug}`, undefined, { token });
    return true;
  } catch {
    return false;
  }
}

export async function getLatestResources(limit = 4): Promise<Resource[]> {
  const items = await getPublishedResources();
  return items.slice(0, limit);
}

export async function getFeaturedResources(limit = 4): Promise<Resource[]> {
  const items = await getPublishedResources();
  return items.filter((r) => r.featured).slice(0, limit);
}
