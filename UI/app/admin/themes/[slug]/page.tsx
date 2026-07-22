import { getThemeBySlug } from "@/lib/data/themes";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AdminContentForm from "@/components/admin/AdminContentForm";
import { getAuthToken } from "@/lib/auth/session";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "new") return { title: "New Theme" };
  const token = await getAuthToken();
  const theme = await getThemeBySlug(slug, token);
  return { title: theme ? `Edit: ${theme.name}` : "Theme Not Found" };
}

export default async function AdminThemeEditPage({ params }: Props) {
  const { slug } = await params;
  const token = await getAuthToken();

  if (slug === "new") {
    return (
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/themes" className="hover:text-primary-700">Themes</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">New Theme</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Theme</h1>
        <AdminContentForm module="themes" item={{}} mode="new" />
      </div>
    );
  }

  const theme = await getThemeBySlug(slug, token);
  if (!theme) notFound();

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/admin/themes" className="hover:text-primary-700">Themes</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{theme.name}</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Theme</h1>
      <AdminContentForm module="themes" item={{ ...theme }} mode="edit" />
    </div>
  );
}
