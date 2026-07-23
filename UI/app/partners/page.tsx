import { Suspense } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import { getPublishedPartners } from "@/lib/data/partners";
import { getTaxonomy } from "@/lib/data/taxonomy";
import type { Metadata } from "next";
import PartnersBrowser from "./PartnersBrowser";

export const metadata: Metadata = {
  title: "Partners Directory",
  description: "Organisations active in Uganda's agri-energy sector — government, NGOs, private sector, and research institutions.",
};

/**
 * Prerendered with the full published list; filtering runs in the browser
 * (see PartnersBrowser), since a static export has no request to read
 * searchParams from.
 */
export default async function PartnersPage() {
  const [partners, taxonomy] = await Promise.all([
    getPublishedPartners(),
    getTaxonomy(),
  ]);

  return (
    <>
      <Header />
      <main>
        <PageHeader
          title="Partners Directory"
          lead="Government agencies, development organisations, private companies, and research institutions active in Uganda's agri-energy sector."
        />

        <section className="py-8 bg-ink-50 min-h-screen">
          <div className="container-page">
            {/* useSearchParams needs a Suspense boundary to prerender. */}
            <Suspense fallback={null}>
              <PartnersBrowser partners={partners} taxonomy={taxonomy} />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
