import { Suspense } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import { getPublishedResources } from "@/lib/data/resources";
import { getTaxonomy } from "@/lib/data/taxonomy";
import type { Metadata } from "next";
import ResourcesBrowser from "./ResourcesBrowser";

export const metadata: Metadata = {
  title: "Resources Library",
  description: "Reports, policy briefs, case studies, and practical guides on agri-energy in Uganda.",
};

/**
 * Prerendered with the full published list. Filtering happens in the
 * browser (ResourcesBrowser) because a static export has no request to
 * read searchParams from — this keeps the page indexable with its content
 * already in the HTML.
 */
export default async function ResourcesPage() {
  const [resources, taxonomy] = await Promise.all([
    getPublishedResources(),
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
            {/* useSearchParams needs a Suspense boundary to prerender. */}
            <Suspense fallback={null}>
              <ResourcesBrowser resources={resources} taxonomy={taxonomy} />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
