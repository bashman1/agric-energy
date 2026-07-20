// ============================================================
// Partners Data Service — backed by the Laravel REST API
// ============================================================
import { Partner, PartnerFilters } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

export async function getAllPartners(token?: string): Promise<Partner[]> {
  const items = await apiGet<Partner[]>(
    "partners",
    [],
    { params: { admin: token ? true : undefined }, token }
  );
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPublishedPartners(): Promise<Partner[]> {
  return apiGet<Partner[]>("partners", []);
}

export async function getPartnerBySlug(
  slug: string,
  token?: string
): Promise<Partner | null> {
  return apiGet<Partner | null>(
    `partners/${slug}`,
    null,
    { params: { admin: token ? true : undefined }, token }
  );
}

export async function filterPartners(
  filters: PartnerFilters,
  publishedOnly = true
): Promise<Partner[]> {
  let items = publishedOnly
    ? await getPublishedPartners()
    : await getAllPartners();

  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
    );
  }
  if (filters.type) {
    items = items.filter(
      (p) => p.type.toLowerCase() === filters.type!.toLowerCase()
    );
  }
  if (filters.region) {
    items = items.filter((p) =>
      p.regions.some((r) => r.toLowerCase() === filters.region!.toLowerCase())
    );
  }
  if (filters.featured !== undefined) {
    items = items.filter((p) => p.featured === filters.featured);
  }
  return items;
}

export async function createPartner(
  data: Omit<Partner, "id" | "slug" | "updatedAt">,
  token?: string
): Promise<Partner> {
  return (await apiSend<Partner>("POST", "partners", data, { token }))!;
}

export async function updatePartner(
  slug: string,
  data: Partial<Partner>,
  token?: string
): Promise<Partner | null> {
  return apiSend<Partner>("PUT", `partners/${slug}`, data, { token });
}

export async function deletePartner(
  slug: string,
  token?: string
): Promise<boolean> {
  try {
    await apiSend("DELETE", `partners/${slug}`, undefined, { token });
    return true;
  } catch {
    return false;
  }
}

export async function getFeaturedPartners(limit = 4): Promise<Partner[]> {
  const items = await getPublishedPartners();
  return items.filter((p) => p.featured).slice(0, limit);
}
