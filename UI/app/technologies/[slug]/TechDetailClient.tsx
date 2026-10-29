"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import Badge from "@/components/shared/Badge";
import DownloadDetail from "@/components/public/DownloadDetail";
import { getTechnologyBySlug } from "@/lib/data/technologies";
import { getProjectBySlug } from "@/lib/data/projects";
import Link from "next/link";
import { useAsync } from "@/lib/hooks/useAsync";
import { useRouteSlug } from "@/lib/routing/useRouteSlug";
import { DetailHero } from "@/components/public/CoverMedia";

export default function TechDetailClient({ slug: routeSlug }: { slug: string }) {
  // The exported HTML is one shell for the whole collection, so the
  // record to load comes from the address, not from the build.
  const slug = useRouteSlug(routeSlug);
  const { data: tech, loading, error, reload } = useAsync(async () => {
    const t = await getTechnologyBySlug(slug!);
    if (!t || !t.published) return null;
    const relatedProjects = await Promise.all(
      (t.relatedProjectIds ?? []).map((id) => getProjectBySlug(id))
    ).then((items) => items.filter(Boolean));
    return { tech: t, relatedProjects };
  }, [slug], { enabled: slug !== null });

  useEffect(() => {
    if (tech?.tech) {
      document.title = `${tech.tech.name} — Technologies | Agri-Energy Desk`;
    } else {
      document.title = "Technology Not Found | Agri-Energy Desk";
    }
  }, [tech]);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <div className="bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <p className="text-gray-500 text-sm">Loading…</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !tech?.tech) {
    return (
      <>
        <Header />
        <main>
          <div className="bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <p className="text-gray-500 text-sm">
                Technology not found.{" "}
                <button onClick={reload} className="underline">Retry</button>
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const { tech: t, relatedProjects } = tech;

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
              <span className="text-gray-800 font-medium">{t.name}</span>
            </nav>
          </div>
        </div>

        {/* Page header */}
        <DetailHero image={t.featuredImage}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={t.category} color="green" size="md" />
                  {t.subcategory && <Badge label={t.subcategory} color="gray" size="md" />}
                </div>
                <h1 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-3">{t.name}</h1>
                <p className="text-green-200 text-lg max-w-3xl">{t.summary}</p>
              </div>
              <DownloadDetail type="technologies" slug={t.slug} label="technology" className="shrink-0" />
            </div>
          </div>
        </DetailHero>

        <section className="py-10 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main */}
              <div className="lg:col-span-2 space-y-6">
                {t.description && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Overview</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">{t.description}</p>
                  </div>
                )}
                {t.applications?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Key Applications</h2>
                    <ul className="space-y-2">
                      {t.applications.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-primary-600 mt-0.5">✓</span>{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-5">
                  {t.benefits?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                      <h3 className="font-bold text-gray-900 text-sm mb-3">Benefits</h3>
                      <ul className="space-y-1.5">
                        {t.benefits.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="text-emerald-500 mt-0.5 shrink-0">+</span>{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {t.limitations?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                      <h3 className="font-bold text-gray-900 text-sm mb-3">Limitations</h3>
                      <ul className="space-y-1.5">
                        {t.limitations.map((l, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>{l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {t.maintenanceNotes?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Maintenance Notes</h2>
                    <ul className="space-y-2">
                      {t.maintenanceNotes.map((n, i) => (
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
                      {relatedProjects.map((proj) => proj && (
                        <Link key={proj.id} href={`/projects/${proj.slug}`}
                          className="block p-3 rounded-lg border border-gray-50 hover:border-primary-100 hover:bg-primary-50 transition-colors">
                          <div className="font-semibold text-gray-800 text-xs leading-snug">{proj.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">📍 {proj.district || proj.region || "Uganda"}</div>
                        </Link>
                      ))}
                    </div>
                    <Link href={`/projects?technologyId=${t.slug}`} className="block text-center mt-3 text-xs font-semibold text-primary-700 hover:text-primary-800">
                      All projects using this technology →
                    </Link>
                  </div>
                )}

                {/* Operational notes */}
                {t.operationalNotes?.length > 0 && (
                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
                    <h3 className="font-bold text-amber-800 text-sm mb-3">⚙️ Operational Notes</h3>
                    <ul className="space-y-1.5">
                      {t.operationalNotes.map((n, i) => (
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
