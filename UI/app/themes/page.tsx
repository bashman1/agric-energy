"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import { useAsync } from "@/lib/hooks/useAsync";
import { getPublishedThemes } from "@/lib/data/themes";
import ThemesBrowser from "./ThemesBrowser";

export default function Page() {
  const { data: themes, loading, error, reload } = useAsync(() => getPublishedThemes());

  useEffect(() => {
    document.title = "Thematic Areas";
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <PageHeader
            title="Thematic Knowledge Hub"
            lead="Explore agri-energy knowledge, evidence, and resources organised around key thematic areas."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-gray-500">Loading themes…</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !themes) {
    return (
      <>
        <Header />
        <main>
          <PageHeader
            title="Thematic Knowledge Hub"
            lead="Explore agri-energy knowledge, evidence, and resources organised around key thematic areas."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-red-700">Failed to load themes. <button onClick={reload} className="underline">Retry</button></p>
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
          title="Thematic Knowledge Hub"
          lead="Explore agri-energy knowledge, evidence, and resources organised around key thematic areas."
        />

        <section className="py-8 bg-ink-50 min-h-screen">
          <div className="container-page">
            <ThemesBrowser themes={themes} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
