import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SubmitForm from "./SubmitForm";
import { FIELD_SCHEMAS, TYPE_LABELS } from "./schemas";
import { apiGet } from "@/lib/api/client";
import { UgandaRegion } from "@/lib/geo/ugandaGeo";

interface ReferenceData {
  taxonomy: {
    partnerTypes: { id: string; label: string }[];
    technologyCategories: { id: string; label: string }[];
    projectStatuses: { id: string; label: string }[];
    valueChains: { id: string; label: string }[];
  };
  partners: { id: string; label: string; type: string }[];
  technologies: { id: string; label: string }[];
  themes: { id: string; label: string }[];
  regions: string[];
}

const REGIONS: UgandaRegion[] = [
  "Central Uganda",
  "Eastern Uganda",
  "Northern Uganda",
  "Western Uganda",
];

export function generateStaticParams() {
  return Object.keys(FIELD_SCHEMAS).map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  return { title: `Submit ${TYPE_LABELS[type] ?? "Content"}` };
}

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

export default async function PartnerSubmitPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!FIELD_SCHEMAS[type]) notFound();

  const referenceData = await getReferenceData();

  return <SubmitForm type={type} referenceData={referenceData} />;
}
