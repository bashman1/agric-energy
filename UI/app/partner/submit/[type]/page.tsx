import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SubmitForm from "./SubmitForm";
import { FIELD_SCHEMAS, TYPE_LABELS } from "./schemas";

interface Props {
  params: Promise<{ type: string }>;
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
