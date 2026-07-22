import { getPolicyBySlug } from "@/lib/data/policies";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AdminContentForm from "@/components/admin/AdminContentForm";
import { getAuthToken } from "@/lib/auth/session";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "new") return { title: "New Policy" };
  const token = await getAuthToken();
  const policy = await getPolicyBySlug(slug, token);
  return { title: policy ? `Edit: ${policy.title}` : "Policy Not Found" };
}

export default async function AdminPolicyEditPage({ params }: Props) {
  const { slug } = await params;
  const token = await getAuthToken();

  if (slug === "new") {
    return (
      <div>
        <nav className="flex items-center gap-2 text-sm text-ink-500 mb-6">
          <Link href="/admin/policies" className="hover:text-primary-700">Policies</Link>
          <span>/</span>
          <span className="text-ink-800 font-medium">New Policy</span>
        </nav>
        <h1 className="text-2xl font-display font-semibold text-ink-900 mb-6">New Policy</h1>
        <AdminContentForm module="policies" item={{}} mode="new" />
      </div>
    );
  }

  const policy = await getPolicyBySlug(slug, token);
  if (!policy) notFound();

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-ink-500 mb-6">
        <Link href="/admin/policies" className="hover:text-primary-700">Policies</Link>
        <span>/</span>
        <span className="text-ink-800 font-medium truncate max-w-xs">{policy.title}</span>
      </nav>
      <h1 className="text-2xl font-display font-semibold text-ink-900 mb-6">Edit Policy</h1>
      <AdminContentForm module="policies" item={{ ...policy }} mode="edit" />
    </div>
  );
}
