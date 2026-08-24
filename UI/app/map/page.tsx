"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import MapPageClient from "@/components/public/MapPageClient";
import { useAsync } from "@/lib/hooks/useAsync";
import { getPublishedProjects } from "@/lib/data/projects";
import { getRegionStats } from "@/lib/data/open-data";

export default function Page() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [allProjects, regionStats] = await Promise.all([
      getPublishedProjects(),
      getRegionStats(),
    ]);
    return { allProjects, regionStats };
  });

  useEffect(() => {
    document.title = "Project Map";
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main>
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-gray-500">Loading map…</p>
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-red-700">Failed to load map data. <button onClick={reload} className="underline">Retry</button></p>
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
        <MapPageClient allProjects={data.allProjects} regionStats={data.regionStats} />
      </main>
      <Footer />
    </>
  );
}
