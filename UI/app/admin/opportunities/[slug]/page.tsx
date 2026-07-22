import { getOpportunityBySlug } from "@/lib/data/opportunities";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AdminContentForm from "@/components/admin/AdminContentForm";
import { getAuthToken } from "@/lib/auth/session";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "new") return { title: "New Opportunity" };
  const token = await getAuthToken();
  const opportunity = await getOpportunityBySlug(slug, token);
  return { title: opportunity ? `Edit: ${opportunity.title}` : "Opportunity Not Found" };
}

export default async function AdminOpportunityEditPage({ params }: Props) {
  const { slug } = await params;
  const token = await getAuthToken();

  if (slug === "new") {
    return (
      <div>
        <nav className="flex items-center gap-2 text-sm text-ink-500 mb-6">
          <Link href="/admin/opportunities" className="hover:text-primary-700">Opportunities</Link>
          <span>/</span>
          <span className="text-ink-800 font-medium">New Opportunity</span>
        </nav>
        <h1 className="text-2xl font-display font-semibold text-ink-900 mb-6">New Opportunity</h1>
        <AdminContentForm module="opportunities" item={{ opportunityType: "funding" }} mode="new" />
      </div>
    );
  }

  const opportunity = await getOpportunityBySlug(slug, token);
  if (!opportunity) notFound();

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-ink-500 mb-6">
        <Link href="/admin/opportunities" className="hover:text-primary-700">Opportunities</Link>
        <span>/</span>
        <span className="text-ink-800 font-medium truncate max-w-xs">{opportunity.title}</span>
      </nav>
      <h1 className="text-2xl font-display font-semibold text-ink-900 mb-6">Edit Opportunity</h1>
      <AdminContentForm module="opportunities" item={{ ...opportunity }} mode="edit" />
    </div>
  );
}
