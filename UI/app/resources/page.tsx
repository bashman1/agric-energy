"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import { useAsync } from "@/lib/hooks/useAsync";
import { getPublishedResources } from "@/lib/data/resources";
import { getTaxonomy } from "@/lib/data/taxonomy";
import ResourcesBrowser from "./ResourcesBrowser";

export default function Page() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [resources, taxonomy] = await Promise.all([
      getPublishedResources(),
      getTaxonomy(),
    ]);
    return { resources, taxonomy };
  });

  useEffect(() => {
    document.title = "Resources Library";
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <PageHeader
            title="Resources Library"
            lead="Reports, policy briefs, case studies, practical guides, and datasets on agri-energy in Uganda."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-gray-500">Loading resources…</p>
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
            title="Resources Library"
            lead="Reports, policy briefs, case studies, practical guides, and datasets on agri-energy in Uganda."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-red-700">Failed to load resources. <button onClick={reload} className="underline">Retry</button></p>
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
          title="Resources Library"
          lead="Reports, policy briefs, case studies, practical guides, and datasets on agri-energy in Uganda."
        />

        <section className="py-8 bg-ink-50 min-h-screen">
          <div className="container-page">
            <ResourcesBrowser resources={data.resources} taxonomy={data.taxonomy} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
