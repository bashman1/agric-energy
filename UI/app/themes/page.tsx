import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import ThemeCard from "@/components/public/ThemeCard";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import EmptyState from "@/components/shared/EmptyState";
import { filterThemes } from "@/lib/data/themes";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thematic Knowledge Hub",
  description: "Explore agri-energy knowledge organised by thematic areas.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ThemesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const themes = await filterThemes({ search: params.search }, true);

  return (
    <>
      <Header />
      <main>
        <PageHeader
          title="Thematic Knowledge Hub"
          lead="Explore agri-energy knowledge, evidence, and resources organised around key thematic areas."
        />

        <section className="py-8 bg-ink-50 min-h-screen">
          <div className="container-page">
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-card">
              <form method="GET" className="flex gap-3 items-end">
                <div className="flex-1 max-w-sm">
                  <input name="search" type="text" aria-label="Search themes" defaultValue={params.search ?? ""} placeholder="Search themes..." className="form-input" />
                </div>
                <button type="submit" className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">Search</button>
                {params.search && <Link href="/themes" className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50">Clear</Link>}
              </form>
            </div>

            <div className="mb-5">
              <p className="text-sm text-gray-500"><span className="font-bold text-gray-800">{themes.length}</span> thematic areas</p>
            </div>

            {themes.length > 0 ? (
              <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {themes.map((t) => <ThemeCard key={t.id} theme={t} />)}
              </StaggerGrid>
            ) : (
              <EmptyState title="No themes found" message="Try adjusting your search." icon="📚" action={{ label: "Clear Search", href: "/themes" }} />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
