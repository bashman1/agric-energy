import { Suspense } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import { getPublishedTechnologies } from "@/lib/data/technologies";
import { getTaxonomy } from "@/lib/data/taxonomy";
import type { Metadata } from "next";
import TechnologiesBrowser from "./TechnologiesBrowser";

export const metadata: Metadata = {
  title: "Technologies Library",
  description: "In-depth reference information on agri-energy technologies deployed in Uganda.",
};

/** Prerendered with the full published list; filtering runs in the browser. */
export default async function TechnologiesPage() {
  const [technologies, taxonomy] = await Promise.all([
    getPublishedTechnologies(),
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
            {/* useSearchParams needs a Suspense boundary to prerender. */}
            <Suspense fallback={null}>
              <TechnologiesBrowser technologies={technologies} taxonomy={taxonomy} />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
