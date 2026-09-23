"use client";

// ============================================================
// Loads the submit form's dropdown options in the BROWSER.
//
// These used to be fetched in the server component (page.tsx). Under the
// static export that code runs once, at build time, and build-static.sh
// deliberately sets no API_URL — so every fetch failed, apiGet fell back
// to [], and empty Technologies / Thematic areas / Partners lists were
// baked into the HTML served on UAT. `next dev` fetches per request, which
// is why localhost looked fine. Reference data is content, and content
// never belongs in the build (see lib/routing/shell.ts).
// ============================================================

import { apiGet } from "@/lib/api/client";
import { useAsync } from "@/lib/hooks/useAsync";
import type { UgandaRegion } from "@/lib/geo/ugandaGeo";
import SubmitForm, { type ReferenceData } from "./SubmitForm";

const REGIONS: UgandaRegion[] = [
  "Central Uganda",
  "Eastern Uganda",
  "Northern Uganda",
  "Western Uganda",
];

async function getReferenceData(): Promise<ReferenceData> {
  const [taxonomy, partners, technologies, themes] = await Promise.all([
    apiGet<Record<string, { id: string; name: string; slug: string }[]>>("taxonomy", {
      partnerTypes: [],
      technologyCategories: [],
      projectStatuses: [],
      valueChains: [],
    }),
    apiGet<{ id: string; name: string; type: string }[]>("partners", []),
    apiGet<{ id: string; name: string }[]>("technologies", []),
    apiGet<{ id: string; name: string }[]>("themes", []),
  ]);

  const normalize = (items: { id: string; name: string; slug?: string }[]) =>
    items.map((i) => ({ id: i.slug ?? i.id, label: i.name }));

  return {
    taxonomy: {
      partnerTypes: normalize(taxonomy.partnerTypes ?? []),
      technologyCategories: normalize(taxonomy.technologyCategories ?? []),
      projectStatuses: normalize(taxonomy.projectStatuses ?? []),
      valueChains: normalize(taxonomy.valueChains ?? []),
    },
    partners: partners.map((p) => ({ id: p.id, label: p.name, type: p.type ?? "" })),
    technologies: normalize(technologies),
    themes: normalize(themes),
    regions: REGIONS,
  };
}

export default function SubmitPageClient({ type }: { type: string }) {
  const { data, loading, error, reload } = useAsync(getReferenceData, []);

  if (loading) {
    return <p className="text-sm text-ink-500 py-10" role="status">Loading form…</p>;
  }

  if (error || !data) {
    return (
      <div className="py-10">
        <p className="text-sm text-red-700 mb-3">Could not load the form options.</p>
        <button type="button" onClick={reload} className="text-xs font-semibold text-primary-700 hover:text-primary-800">
          Retry
        </button>
      </div>
    );
  }

  return <SubmitForm type={type} referenceData={data} />;
}
