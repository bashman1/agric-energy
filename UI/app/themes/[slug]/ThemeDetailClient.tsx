"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import ResourceCard from "@/components/public/ResourceCard";
import ProjectCard from "@/components/public/ProjectCard";
import TechCard from "@/components/public/TechCard";
import DownloadDetail from "@/components/public/DownloadDetail";
import { getThemeBySlug } from "@/lib/data/themes";
import { getProjectBySlug } from "@/lib/data/projects";
import { getTechnologyBySlug } from "@/lib/data/technologies";
import { getResourceBySlug } from "@/lib/data/resources";
import Link from "next/link";
import { useAsync } from "@/lib/hooks/useAsync";
import { useRouteSlug } from "@/lib/routing/useRouteSlug";
import { DetailHero } from "@/components/public/CoverMedia";

export default function ThemeDetailClient({ slug: routeSlug }: { slug: string }) {
  // The exported HTML is one shell for the whole collection, so the
  // record to load comes from the address, not from the build.
  const slug = useRouteSlug(routeSlug);
  const { data: theme, loading, error, reload } = useAsync(async () => {
    const t = await getThemeBySlug(slug!);
    if (!t || !t.published) return null;
    const [relatedProjects, relatedTechs, relatedResources] = await Promise.all([
      Promise.all((t.relatedProjectIds ?? []).map((id) => getProjectBySlug(id))).then((i) => i.filter(Boolean)),
      Promise.all((t.relatedTechnologyIds ?? []).map((id) => getTechnologyBySlug(id))).then((i) => i.filter(Boolean)),
      Promise.all((t.relatedResourceIds ?? []).map((id) => getResourceBySlug(id))).then((i) => i.filter(Boolean)),
    ]);
    return { theme: t, relatedProjects, relatedTechs, relatedResources };
  }, [slug], { enabled: slug !== null });

  useEffect(() => {
    if (theme?.theme) {
      document.title = `${theme.theme.name} — Themes | Agri-Energy Desk`;
    } else {
      document.title = "Theme Not Found | Agri-Energy Desk";
    }
  }, [theme]);

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

  if (error || !theme?.theme) {
    return (
      <>
        <Header />
        <main>
          <div className="bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <p className="text-gray-500 text-sm">
                Theme not found.{" "}
                <button onClick={reload} className="underline">Retry</button>
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const { theme: t, relatedProjects, relatedTechs, relatedResources } = theme;

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
              <Link href="/themes" className="hover:text-primary-700">Themes</Link>
              <span>/</span>
              <span className="text-gray-800 font-medium">{t.name}</span>
            </nav>
          </div>
        </div>

        {/* Header */}
        <DetailHero image={t.featuredImage}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-5xl mb-4">{t.icon}</div>
                <h1 className="text-3xl lg:text-4xl font-extrabold mb-3">{t.name}</h1>
                <p className="text-green-200 text-lg max-w-2xl leading-relaxed">{t.summary}</p>
              </div>
              <DownloadDetail type="themes" slug={t.slug} label="theme" className="shrink-0" />
            </div>
          </div>
        </DetailHero>

        <section className="py-10 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Description */}
            {t.description && (
              <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                <h2 className="font-bold text-gray-900 text-lg mb-4">About this Theme</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{t.description}</p>
                {t.whyItMatters && (
                  <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-100">
                    <h3 className="font-bold text-primary-800 text-sm mb-2">Why It Matters</h3>
                    <p className="text-primary-700 text-sm leading-relaxed">{t.whyItMatters}</p>
                  </div>
                )}
              </div>
            )}

            {/* Related projects */}
            {relatedProjects.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-900 text-xl mb-4">Related Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {relatedProjects.map((p) => p && <ProjectCard key={p.id} project={p} />)}
                </div>
                <div className="mt-4 text-center">
                  <Link href={`/projects?themeId=${t.slug}`} className="text-sm font-semibold text-primary-700 hover:text-primary-800">
                    View all projects in this theme →
                  </Link>
                </div>
              </div>
            )}

            {/* Related technologies */}
            {relatedTechs.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-900 text-xl mb-4">Related Technologies</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {relatedTechs.map((tech) => tech && <TechCard key={tech.id} tech={tech} />)}
                </div>
              </div>
            )}

            {/* Related resources */}
            {relatedResources.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-900 text-xl mb-4">Resources on this Theme</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {relatedResources.map((r) => r && <ResourceCard key={r.id} resource={r} />)}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
