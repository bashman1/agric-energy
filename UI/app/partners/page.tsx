"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import { useAsync } from "@/lib/hooks/useAsync";
import { getPublishedPartners } from "@/lib/data/partners";
import { getTaxonomy } from "@/lib/data/taxonomy";
import PartnersBrowser from "./PartnersBrowser";

export default function Page() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [partners, taxonomy] = await Promise.all([
      getPublishedPartners(),
      getTaxonomy(),
    ]);
    return { partners, taxonomy };
  });

  useEffect(() => {
    document.title = "Partners Directory";
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <PageHeader
            title="Partners Directory"
            lead="Government agencies, development organisations, private companies, and research institutions active in Uganda's agri-energy sector."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-gray-500">Loading partners…</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header />
        <main>
          <PageHeader
            title="Partners Directory"
            lead="Government agencies, development organisations, private companies, and research institutions active in Uganda's agri-energy sector."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-red-700">Failed to load partners. <button onClick={reload} className="underline">Retry</button></p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

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
            <PartnersBrowser partners={data.partners} taxonomy={data.taxonomy} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
