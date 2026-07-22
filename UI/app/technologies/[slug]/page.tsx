import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import Badge from "@/components/shared/Badge";
import DownloadDetail from "@/components/public/DownloadDetail";
import { getTechnologyBySlug } from "@/lib/data/technologies";
import { getProjectBySlug } from "@/lib/data/projects";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tech = await getTechnologyBySlug(slug);
  if (!tech) return { title: "Technology Not Found" };
  return { title: tech.name, description: tech.summary };
}

export default async function TechDetailPage({ params }: Props) {
  const { slug } = await params;
  const tech = await getTechnologyBySlug(slug);
  if (!tech || !tech.published) notFound();

  const relatedProjects = await Promise.all(
    (tech.relatedProjectIds ?? []).map((id) => getProjectBySlug(id))
  ).then((items) => items.filter(Boolean));

  return (
    <>
      <Header />
      <main>
        {/* Breadcrumbs */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-primary-700">Home</Link>
              <span>/</span>
              <Link href="/technologies" className="hover:text-primary-700">Technologies</Link>
              <span>/</span>
              <span className="text-gray-800 font-medium">{tech.name}</span>
            </nav>
          </div>
        </div>

        {/* Page header */}
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <Badge label={tech.category} color="green" size="md" />
                <h1 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-3">{tech.name}</h1>
                <p className="text-green-200 text-lg max-w-3xl">{tech.summary}</p>
              </div>
              <DownloadDetail type="technologies" slug={tech.slug} label="technology" className="shrink-0" />
            </div>
          </div>
        </section>

        <section className="py-10 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main */}
              <div className="lg:col-span-2 space-y-6">
                {tech.description && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Overview</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">{tech.description}</p>
                  </div>
                )}
                {tech.applications?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Key Applications</h2>
                    <ul className="space-y-2">
                      {tech.applications.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-primary-600 mt-0.5">✓</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-5">
                  {tech.benefits?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                      <h3 className="font-bold text-gray-900 text-sm mb-3">Benefits</h3>
                      <ul className="space-y-1.5">
                        {tech.benefits.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="text-emerald-500 mt-0.5 shrink-0">+</span>{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tech.limitations?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                      <h3 className="font-bold text-gray-900 text-sm mb-3">Limitations</h3>
                      <ul className="space-y-1.5">
                        {tech.limitations.map((l, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>{l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {tech.maintenanceNotes?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Maintenance Notes</h2>
                    <ul className="space-y-2">
                      {tech.maintenanceNotes.map((n, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-accent-600 mt-0.5 shrink-0">🔧</span>{n}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {/* Featured projects */}
                {relatedProjects.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Related Projects</h3>
                    <div className="space-y-2">
                      {relatedProjects.map((p) => p && (
                        <Link key={p.id} href={`/projects/${p.slug}`}
                          className="block p-3 rounded-lg border border-gray-50 hover:border-primary-100 hover:bg-primary-50 transition-colors">
                          <div className="font-semibold text-gray-800 text-xs leading-snug">{p.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">📍 {p.district || p.region || "Uganda"}</div>
                        </Link>
                      ))}
                    </div>
                    <Link href={`/projects?technologyId=${tech.slug}`} className="block text-center mt-3 text-xs font-semibold text-primary-700 hover:text-primary-800">
                      All projects using this technology →
                    </Link>
                  </div>
                )}

                {/* Operational notes */}
                {tech.operationalNotes?.length > 0 && (
                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
                    <h3 className="font-bold text-amber-800 text-sm mb-3">⚙️ Operational Notes</h3>
                    <ul className="space-y-1.5">
                      {tech.operationalNotes.map((n, i) => (
                        <li key={i} className="text-xs text-amber-700 leading-relaxed">{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
