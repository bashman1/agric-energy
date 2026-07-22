import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import MapPageClient from "@/components/public/MapPageClient";
import { getPublishedProjects } from "@/lib/data/projects";
import { getRegionStats } from "@/lib/data/open-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Map",
  description: "Interactive geographic view of agri-energy projects across Uganda's districts and regions.",
};

export default async function MapPage() {
  const [allProjects, regionStats] = await Promise.all([
    getPublishedProjects(),
    getRegionStats(),
  ]);

  return (
    <>
      <Header />
      <main>
        {/* Page header */}
        <section className="hero-band bg-primary-900 text-white py-12">
          <div className="container-page">
            <span className="eyebrow on-dark">Platform</span>
            <h1 className="font-display text-4xl font-semibold tracking-tight mt-3 mb-2">
              Project Map
            </h1>
            <p className="text-primary-100 max-w-2xl">
              Interactive geographic view of agri-energy projects across
              Uganda&apos;s districts and regions — over a live road-and-town basemap.
            </p>
          </div>
        </section>

        {/* All filtering and the map are handled client-side — no page reload */}
        <MapPageClient allProjects={allProjects} regionStats={regionStats} />
      </main>
      <Footer />
    </>
  );
}
