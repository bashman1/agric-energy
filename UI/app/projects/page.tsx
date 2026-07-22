import Link from "next/link";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import ProjectCard from "@/components/public/ProjectCard";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import EmptyState from "@/components/shared/EmptyState";
import { filterProjects } from "@/lib/data/projects";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { UGANDA_REGIONS } from "@/lib/geography/nominatim";
import type { Metadata } from "next";
import type { ProjectFilters } from "@/lib/types";

export const metadata: Metadata = {
  title: "Project Database",
  description: "Search and filter agri-energy projects from across Uganda.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const filters: ProjectFilters = {
    search: params.search,
    region: params.region,
    district: params.district,
    technologyId: params.technologyId,
    themeId: params.themeId,
    valueChain: params.valueChain,
    status: params.status,
  };

  const [projects, taxonomy] = await Promise.all([
    filterProjects(filters, true),
    getTaxonomy(),
  ]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <Header />
      <main>
        {/* Page header */}
        <PageHeader
          title="Project Database"
          lead="Browse, search, and filter agri-energy projects from across Uganda's regions, districts, and value chains."
        />

        {/* Filters + results */}
        <section className="py-8 bg-ink-50 min-h-screen">
          <div className="container-page">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Filter panel */}
              <aside className="w-full lg:w-72 shrink-0">
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card sticky top-20">
                  <h2 className="font-bold text-gray-900 mb-4 text-sm">Filter Projects</h2>
                  <form method="GET" className="space-y-4">
                    {/* Search */}
                    <div>
                      <label htmlFor="filter-search" className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
                      <input
                        id="filter-search"
                        name="search"
                        type="text"
                        defaultValue={params.search ?? ""}
                        placeholder="Keywords..."
                        className="form-input"
                      />
                    </div>

                    {/* Region — 4 Uganda regions from constant */}
                    <div>
                      <label htmlFor="filter-region" className="block text-xs font-semibold text-gray-600 mb-1">Region</label>
                      <select id="filter-region" name="region" defaultValue={params.region ?? ""} className="form-input">
                        <option value="">All Regions</option>
                        {UGANDA_REGIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* District — free text */}
                    <div>
                      <label htmlFor="filter-district" className="block text-xs font-semibold text-gray-600 mb-1">District</label>
                      <input
                        id="filter-district"
                        name="district"
                        type="text"
                        defaultValue={params.district ?? ""}
                        placeholder="e.g. Gulu District…"
                        className="form-input"
                      />
                    </div>

                    {/* Value Chain */}
                    <div>
                      <label htmlFor="filter-value-chain" className="block text-xs font-semibold text-gray-600 mb-1">Value Chain</label>
                      <select id="filter-value-chain" name="valueChain" defaultValue={params.valueChain ?? ""} className="form-input">
                        <option value="">All Value Chains</option>
                        {taxonomy.valueChains.map((v) => (
                          <option key={v.id} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label htmlFor="filter-status" className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                      <select id="filter-status" name="status" defaultValue={params.status ?? ""} className="form-input">
                        <option value="">All Statuses</option>
                        {taxonomy.projectStatuses.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="flex-1 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">
                        Apply
                      </button>
                      {hasFilters && (
                        <Link href="/projects" className="px-3 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50">
                          Clear
                        </Link>
                      )}
                    </div>
                  </form>
                </div>
              </aside>

              {/* Results */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm text-gray-500">
                    <span className="font-bold text-gray-800">{projects.length}</span>{" "}
                    project{projects.length !== 1 ? "s" : ""} found
                    {params.search && <> for &quot;<span className="italic">{params.search}</span>&quot;</>}
                    {params.region && (
                      <> in <span className="font-semibold text-primary-700">{params.region}</span></>
                    )}
                    {params.district && (
                      <> · <span className="font-semibold text-primary-700">{params.district}</span></>
                    )}
                  </p>
                </div>
                {projects.length > 0 ? (
                  <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {projects.map((p) => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                  </StaggerGrid>
                ) : (
                  <EmptyState
                    title="No projects found"
                    message="Try changing your search terms or clearing the filters."
                    icon="🏗️"
                    action={{ label: "Clear All Filters", href: "/projects" }}
                  />
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
