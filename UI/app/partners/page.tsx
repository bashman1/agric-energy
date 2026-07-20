import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PartnerCard from "@/components/public/PartnerCard";
import EmptyState from "@/components/shared/EmptyState";
import { filterPartners } from "@/lib/data/partners";
import { getTaxonomy } from "@/lib/data/taxonomy";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partners Directory",
  description: "Organisations active in Uganda's agri-energy sector — government, NGOs, private sector, and research institutions.",
};

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

export default async function PartnersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [partners, taxonomy] = await Promise.all([
    filterPartners({ search: params.search, type: params.type, region: params.region }, true),
    getTaxonomy(),
  ]);

  return (
    <>
      <Header />
      <main>
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-primary-300 text-sm font-semibold mb-1 uppercase tracking-wider">Platform</div>
            <h1 className="text-3xl font-extrabold mb-2">Partners Directory</h1>
            <p className="text-green-200 max-w-xl">Government agencies, development organisations, private companies, and research institutions active in Uganda&apos;s agri-energy sector.</p>
          </div>
        </section>

        <section className="py-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-card">
              <form method="GET" className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-40">
                  <label htmlFor="partner-search" className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
                  <input id="partner-search" name="search" type="text" defaultValue={params.search ?? ""} placeholder="Organisation name..." className="form-input" />
                </div>
                <div className="min-w-40">
                  <label htmlFor="partner-type" className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select id="partner-type" name="type" defaultValue={params.type ?? ""} className="form-input">
                    <option value="">All Types</option>
                    {taxonomy.partnerTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div className="min-w-40">
                  <label htmlFor="partner-region" className="block text-xs font-semibold text-gray-600 mb-1">Region</label>
                  <select id="partner-region" name="region" defaultValue={params.region ?? ""} className="form-input">
                    <option value="">All Regions</option>
                    {["Northern", "Eastern", "Central", "Western"].map((r) => <option key={r} value={r}>{r} Uganda</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors">Apply</button>
                  {(params.search || params.type || params.region) && (
                    <Link href="/partners" className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50">Clear</Link>
                  )}
                </div>
              </form>
            </div>

            <div className="mb-5">
              <p className="text-sm text-gray-500"><span className="font-bold text-gray-800">{partners.length}</span> partners found</p>
            </div>

            {partners.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {partners.map((p) => <PartnerCard key={p.id} partner={p} />)}
              </div>
            ) : (
              <EmptyState title="No partners found" message="Try adjusting your filters." icon="🤝" action={{ label: "Clear Filters", href: "/partners" }} />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
