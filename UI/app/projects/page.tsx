import { Suspense } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import { getPublishedProjects } from "@/lib/data/projects";
import { getTaxonomy } from "@/lib/data/taxonomy";
import type { Metadata } from "next";
import ProjectsBrowser from "./ProjectsBrowser";

export const metadata: Metadata = {
  title: "Project Database",
  description: "Search and filter agri-energy projects from across Uganda.",
};

/** Prerendered with the full published list; filtering runs in the browser. */
export default async function ProjectsPage() {
  const [projects, taxonomy] = await Promise.all([
    getPublishedProjects(),
    getTaxonomy(),
  ]);

  return (
    <>
      <Header />
      <main>
        <PageHeader
          title="Project Database"
          lead="Browse, search, and filter agri-energy projects from across Uganda's regions, districts, and value chains."
        />
        {/* useSearchParams needs a Suspense boundary to prerender. */}
        <Suspense fallback={null}>
          <ProjectsBrowser projects={projects} taxonomy={taxonomy} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
