import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SubmitPageClient from "./SubmitPageClient";
import { FIELD_SCHEMAS, TYPE_LABELS } from "./schemas";

// The type list is UI source, not content, so it is safe to enumerate here.
// The dropdown options are content and load in the browser — see
// SubmitPageClient for why they must not be fetched in this file.
export function generateStaticParams() {
  return Object.keys(FIELD_SCHEMAS).map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  return { title: `Submit ${TYPE_LABELS[type] ?? "Content"}` };
}

export default async function PartnerSubmitPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!FIELD_SCHEMAS[type]) notFound();

  return <SubmitPageClient type={type} />;
}
