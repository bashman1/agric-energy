import { getResourceBySlug } from "@/lib/data/resources";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AdminContentForm from "@/components/admin/AdminContentForm";
import { getAuthToken } from "@/lib/auth/session";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "new") return { title: "New Resource" };
  const token = await getAuthToken();
  const resource = await getResourceBySlug(slug, token);
  return { title: resource ? `Edit: ${resource.title}` : "Resource Not Found" };
}

export default async function AdminResourceEditPage({ params }: Props) {
  const { slug } = await params;
  const token = await getAuthToken();

  if (slug === "new") {
    return (
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/resources" className="hover:text-primary-700">Resources</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">New Resource</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Resource</h1>
        <AdminContentForm module="resources" item={{}} mode="new" />
      </div>
    );
  }

  const resource = await getResourceBySlug(slug, token);
  if (!resource) notFound();

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/admin/resources" className="hover:text-primary-700">Resources</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{resource.title}</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Resource</h1>
      <AdminContentForm module="resources" item={{ ...resource }} mode="edit" />
    </div>
  );
}
