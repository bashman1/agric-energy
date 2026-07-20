import { getProjectBySlug } from "@/lib/data/projects";
import { getAllPartners } from "@/lib/data/partners";
import { getAllTechnologies } from "@/lib/data/technologies";
import { getAllThemes } from "@/lib/data/themes";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AdminProjectForm from "@/components/admin/AdminProjectForm";
import { getAuthToken } from "@/lib/auth/session";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "new") return { title: "New Project" };
  const token = await getAuthToken();
  const project = await getProjectBySlug(slug, token);
  return { title: project ? `Edit: ${project.title}` : "Project Not Found" };
}

export default async function AdminProjectEditPage({ params }: Props) {
  const { slug } = await params;
  const token = await getAuthToken();

  // Fetch reference data for smart dropdowns in parallel
  const [partners, technologies, themes] = await Promise.all([
    getAllPartners(token),
    getAllTechnologies(token),
    getAllThemes(token),
  ]);

  if (slug === "new") {
    return (
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/projects" className="hover:text-primary-700">Projects</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">New Project</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Project</h1>
        <AdminProjectForm
          project={{}}
          mode="new"
          partners={partners}
          technologies={technologies}
          themes={themes}
        />
      </div>
    );
  }

  const project = await getProjectBySlug(slug, token);
  if (!project) notFound();

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/admin/projects" className="hover:text-primary-700">Projects</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{project.title}</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Project</h1>
      <AdminProjectForm
        project={project}
        mode="edit"
        partners={partners}
        technologies={technologies}
        themes={themes}
      />
    </div>
  );
}
