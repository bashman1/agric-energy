import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SubmitForm from "./SubmitForm";
import { FIELD_SCHEMAS, TYPE_LABELS } from "./schemas";

interface Props {
  params: Promise<{ type: string }>;
}

/**
 * The submittable types are a fixed set in ./schemas, not database rows,
 * so this route still prerenders — one page per type, all known at build
 * time. Unlisted types are not exported at all, which is what makes the
 * notFound() below unreachable in practice but correct to keep.
 */
export function generateStaticParams() {
  return Object.keys(FIELD_SCHEMAS).map((type) => ({ type }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  return { title: `Submit ${TYPE_LABELS[type] ?? "Content"}` };
}

export default async function PartnerSubmitPage({ params }: Props) {
  const { type } = await params;
  if (!FIELD_SCHEMAS[type]) notFound();
  return <SubmitForm type={type} />;
}
