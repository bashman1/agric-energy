// ============================================================
// Taxonomy Data Service — backed by the Laravel REST API.
// Geography data (regions, districts, etc.) is handled by the
// dedicated geography service: lib/data/geography.ts
// ============================================================
import { Taxonomy } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

const DEFAULT_TAXONOMY: Taxonomy = {
  valueChains: [],
  projectStatuses: [],
  resourceTypes: [],
  partnerTypes: [],
  technologyCategories: [],
  beneficiaryTags: [],
};

export async function getTaxonomy(): Promise<Taxonomy> {
  const data = await apiGet<Taxonomy | null>("taxonomy", null);
  return { ...DEFAULT_TAXONOMY, ...(data ?? {}) };
}

export async function updateTaxonomy(
  data: Partial<Taxonomy>,
  token?: string
): Promise<Taxonomy> {
  const updated = await apiSend<Taxonomy>("PUT", "taxonomy", data, { token });
  return { ...DEFAULT_TAXONOMY, ...(updated ?? {}) };
}
