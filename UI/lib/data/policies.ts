// ============================================================
// Policies & regulatory documents — backed by the API
// ============================================================
import { Policy } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

export async function getPublishedPolicies(): Promise<Policy[]> {
  return apiGet<Policy[]>("policies", []);
}

export async function getAllPolicies(token?: string): Promise<Policy[]> {
  return apiGet<Policy[]>("policies", [], {
    params: { admin: token ? true : undefined },
    token,
  });
}

export async function getPolicyBySlug(
  slug: string,
  token?: string
): Promise<Policy | null> {
  return apiGet<Policy | null>(`policies/${slug}`, null, {
    params: { admin: token ? true : undefined },
    token,
  });
}

export async function createPolicy(
  data: Partial<Policy>,
  token?: string
): Promise<Policy> {
  return (await apiSend<Policy>("POST", "policies", data, { token }))!;
}

export async function updatePolicy(
  slug: string,
  data: Partial<Policy>,
  token?: string
): Promise<Policy | null> {
  return apiSend<Policy>("PUT", `policies/${slug}`, data, { token });
}

export async function deletePolicy(
  slug: string,
  token?: string
): Promise<boolean> {
  try {
    await apiSend("DELETE", `policies/${slug}`, undefined, { token });
    return true;
  } catch {
    return false;
  }
}
