import { Suspense } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import { getPublishedThemes } from "@/lib/data/themes";
import type { Metadata } from "next";
import ThemesBrowser from "./ThemesBrowser";

export const metadata: Metadata = {
  title: "Thematic Areas",
  description: "Explore agri-energy knowledge organised around key thematic areas.",
};

/** Prerendered with the full published list; search runs in the browser. */
export default async function ThemesPage() {
  const themes = await getPublishedThemes();

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
            {/* useSearchParams needs a Suspense boundary to prerender. */}
            <Suspense fallback={null}>
              <ThemesBrowser themes={themes} />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
