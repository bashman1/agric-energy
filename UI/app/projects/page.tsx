"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import { useAsync } from "@/lib/hooks/useAsync";
import { getPublishedProjects } from "@/lib/data/projects";
import { getTaxonomy } from "@/lib/data/taxonomy";
import ProjectsBrowser from "./ProjectsBrowser";

export default function Page() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [projects, taxonomy] = await Promise.all([
      getPublishedProjects(),
      getTaxonomy(),
    ]);
    return { projects, taxonomy };
  });

  useEffect(() => {
    document.title = "Project Database";
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <PageHeader
            title="Project Database"
            lead="Browse, search, and filter agri-energy projects from across Uganda's regions, districts, and value chains."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-gray-500">Loading projects…</p>
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
            title="Project Database"
            lead="Browse, search, and filter agri-energy projects from across Uganda's regions, districts, and value chains."
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <p className="text-red-700">Failed to load projects. <button onClick={reload} className="underline">Retry</button></p>
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
          title="Project Database"
          lead="Browse, search, and filter agri-energy projects from across Uganda's regions, districts, and value chains."
        />
        <ProjectsBrowser projects={data.projects} taxonomy={data.taxonomy} />
      </main>
      <Footer />
    </>
  );
}
