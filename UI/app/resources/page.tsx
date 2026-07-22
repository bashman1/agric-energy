import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import ResourceCard from "@/components/public/ResourceCard";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import EmptyState from "@/components/shared/EmptyState";
import { filterResources } from "@/lib/data/resources";
import { getTaxonomy } from "@/lib/data/taxonomy";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources Library",
  description: "Reports, policy briefs, case studies, and practical guides on agri-energy in Uganda.",
};

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

export default async function ResourcesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [resources, taxonomy] = await Promise.all([
    filterResources({ search: params.search, type: params.type, themeId: params.themeId }, true),
    getTaxonomy(),
  ]);

  return (
    <>
      <Header />
      <main>
        <PageHeader
          title="Resources Library"
          lead="Reports, policy briefs, case studies, practical guides, and datasets on agri-energy in Uganda."
        />

        <section className="py-8 bg-ink-50 min-h-screen">
          <div className="container-page">
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-card">
              <form method="GET" className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label htmlFor="resource-search" className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
                  <input id="resource-search" name="search" type="text" defaultValue={params.search ?? ""} placeholder="Search resources..." className="form-input" />
                </div>
                <div className="min-w-40">
                  <label htmlFor="resource-type" className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select id="resource-type" name="type" defaultValue={params.type ?? ""} className="form-input">
                    <option value="">All Types</option>
                    {taxonomy.resourceTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">Apply</button>
                  {(params.search || params.type) && (
                    <Link href="/resources" className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50">Clear</Link>
                  )}
                </div>
              </form>
            </div>

            <div className="mb-5">
              <p className="text-sm text-gray-500"><span className="font-bold text-gray-800">{resources.length}</span> resources found</p>
            </div>

            {resources.length > 0 ? (
              <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {resources.map((r) => <ResourceCard key={r.id} resource={r} />)}
              </StaggerGrid>
            ) : (
              <EmptyState title="No resources found" message="Try adjusting your filters." icon="📄" action={{ label: "Clear Filters", href: "/resources" }} />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
