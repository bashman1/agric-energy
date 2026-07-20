// ============================================================
// Opportunities Data Service — backed by the Laravel REST API
// ============================================================
import { Opportunity } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

export async function getPublishedOpportunities(): Promise<Opportunity[]> {
  return apiGet<Opportunity[]>("opportunities", []);
}

export async function getAllOpportunities(
  token?: string
): Promise<Opportunity[]> {
  return apiGet<Opportunity[]>("opportunities", [], {
    params: { admin: token ? true : undefined },
    token,
  });
}

export async function getOpportunityBySlug(
  slug: string,
  token?: string
): Promise<Opportunity | null> {
  return apiGet<Opportunity | null>(`opportunities/${slug}`, null, {
    params: { admin: token ? true : undefined },
    token,
  });
}

/** Opportunities whose deadline has not passed, soonest first. */
export async function getOpenOpportunities(limit?: number): Promise<Opportunity[]> {
  const now = Date.now();
  const open = (await getPublishedOpportunities()).filter(
    (o) => !o.deadline || new Date(o.deadline).getTime() >= now
  );
  return typeof limit === "number" ? open.slice(0, limit) : open;
}

export async function createOpportunity(
  data: Partial<Opportunity>,
  token?: string
): Promise<Opportunity> {
  return (await apiSend<Opportunity>("POST", "opportunities", data, { token }))!;
}

export async function updateOpportunity(
  slug: string,
  data: Partial<Opportunity>,
  token?: string
): Promise<Opportunity | null> {
  return apiSend<Opportunity>("PUT", `opportunities/${slug}`, data, { token });
}

export async function deleteOpportunity(
  slug: string,
  token?: string
): Promise<boolean> {
  try {
    await apiSend("DELETE", `opportunities/${slug}`, undefined, { token });
    return true;
  } catch {
    return false;
  }
}
