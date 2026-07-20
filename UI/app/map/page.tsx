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
        <section className="bg-primary-800 text-white py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-primary-300 text-sm font-semibold mb-1 uppercase tracking-wider">Platform</div>
            <h1 className="text-3xl font-extrabold mb-1">Project Map</h1>
            <p className="text-green-200">
              Interactive geographic view of agri-energy projects across Uganda&apos;s districts and regions.
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
