"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import { useAsync } from "@/lib/hooks/useAsync";
import { getPublishedTechnologies } from "@/lib/data/technologies";
import { getTaxonomy } from "@/lib/data/taxonomy";
import TechnologiesBrowser from "./TechnologiesBrowser";

export default function Page() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [technologies, taxonomy] = await Promise.all([
      getPublishedTechnologies(),
      getTaxonomy(),
    ]);
    return { technologies, taxonomy };
  });

  useEffect(() => {
    document.title = "Technologies Library";
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <PageHeader
            title="Technologies Library"
            lead="In-depth reference information on agri-energy technologies deployed in Uganda — applications, benefits, operational guidance, and maintenance."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-gray-500">Loading technologies…</p>
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
            title="Technologies Library"
            lead="In-depth reference information on agri-energy technologies deployed in Uganda — applications, benefits, operational guidance, and maintenance."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-red-700">Failed to load technologies. <button onClick={reload} className="underline">Retry</button></p>
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
          title="Technologies Library"
          lead="In-depth reference information on agri-energy technologies deployed in Uganda — applications, benefits, operational guidance, and maintenance."
        />

        <section className="py-8 bg-ink-50 min-h-screen">
          <div className="container-page">
            <TechnologiesBrowser technologies={data.technologies} taxonomy={data.taxonomy} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
