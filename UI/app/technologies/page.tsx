import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import TechCard from "@/components/public/TechCard";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import EmptyState from "@/components/shared/EmptyState";
import { filterTechnologies } from "@/lib/data/technologies";
import { getTaxonomy } from "@/lib/data/taxonomy";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Technologies Library",
  description: "Browse agri-energy technologies used across Uganda — solar pumping, biogas, milling, cold chain, and more.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function TechnologiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [technologies, taxonomy] = await Promise.all([
    filterTechnologies({ search: params.search, category: params.category }, true),
    getTaxonomy(),
  ]);

  return (
    <>
      <Header />
      <main>
        <PageHeader
          title="Technologies Library"
          lead="In-depth reference information on agri-energy technologies deployed in Uganda — applications, benefits, operational guidance, and maintenance."
        />

        <section className="py-8 bg-ink-50 min-h-screen">
          <div className="container-page">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-card">
              <form method="GET" className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-48">
                  <label htmlFor="tech-search" className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
                  <input id="tech-search" name="search" type="text" defaultValue={params.search ?? ""} placeholder="Search technologies..." className="form-input" />
                </div>
                <div className="min-w-48">
                  <label htmlFor="tech-category" className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <select id="tech-category" name="category" defaultValue={params.category ?? ""} className="form-input">
                    <option value="">All Categories</option>
                    {taxonomy.technologyCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">Apply</button>
                  {(params.search || params.category) && (
                    <Link href="/technologies" className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50">Clear</Link>
                  )}
                </div>
              </form>
            </div>

            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500"><span className="font-bold text-gray-800">{technologies.length}</span> technologies</p>
            </div>

            {technologies.length > 0 ? (
              <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {technologies.map((t) => <TechCard key={t.id} tech={t} />)}
              </StaggerGrid>
            ) : (
              <EmptyState title="No technologies found" message="Try adjusting your search or category filter." icon="⚡" action={{ label: "Clear Filters", href: "/technologies" }} />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
