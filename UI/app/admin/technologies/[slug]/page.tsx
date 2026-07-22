import { getTechnologyBySlug } from "@/lib/data/technologies";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AdminContentForm from "@/components/admin/AdminContentForm";
import { getAuthToken } from "@/lib/auth/session";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "new") return { title: "New Technology" };
  const token = await getAuthToken();
  const tech = await getTechnologyBySlug(slug, token);
  return { title: tech ? `Edit: ${tech.name}` : "Technology Not Found" };
}

export default async function AdminTechnologyEditPage({ params }: Props) {
  const { slug } = await params;
  const token = await getAuthToken();

  if (slug === "new") {
    return (
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/technologies" className="hover:text-primary-700">Technologies</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">New Technology</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Technology</h1>
        <AdminContentForm module="technologies" item={{}} mode="new" />
      </div>
    );
  }

  const tech = await getTechnologyBySlug(slug, token);
  if (!tech) notFound();

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/admin/technologies" className="hover:text-primary-700">Technologies</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{tech.name}</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Technology</h1>
      <AdminContentForm module="technologies" item={{ ...tech }} mode="edit" />
    </div>
  );
}
