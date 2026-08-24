"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import DownloadDetail from "@/components/public/DownloadDetail";
import ResourceReader from "@/components/public/ResourceReader";
import Badge from "@/components/shared/Badge";
import { getResourceBySlug } from "@/lib/data/resources";
import Link from "next/link";
import { useAsync } from "@/lib/hooks/useAsync";
import { useRouteSlug } from "@/lib/routing/useRouteSlug";

const typeColors: Record<string, "green" | "blue" | "purple" | "amber" | "gray"> = {
  Report: "blue",
  "Policy Brief": "purple",
  "Case Study": "amber",
  "Practical Guide": "green",
  "Training Material": "green",
  Dataset: "gray",
};

export default function ResourceDetailClient({ slug: routeSlug }: { slug: string }) {
  // The exported HTML is one shell for the whole collection, so the
  // record to load comes from the address, not from the build.
  const slug = useRouteSlug(routeSlug);
  const { data: resource, loading, error, reload } = useAsync(() => getResourceBySlug(slug!), [slug], { enabled: slug !== null });

  useEffect(() => {
    if (resource) {
      document.title = `${resource.title} — Resources | Agri-Energy Desk`;
    } else {
      document.title = "Resource Not Found | Agri-Energy Desk";
    }
  }, [resource]);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <div className="bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <p className="text-gray-500 text-sm">Loading…</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !resource || !resource.published) {
    return (
      <>
        <Header />
        <main>
          <div className="bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <p className="text-gray-500 text-sm">
                Resource not found.{" "}
                <button onClick={reload} className="underline">Retry</button>
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const color = typeColors[resource.type] ?? "gray";

  return (
    <>
      <Header />
      <main>
        {/* Breadcrumbs */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-primary-700">Home</Link>
              <span>/</span>
              <Link href="/resources" className="hover:text-primary-700">Resources</Link>
              <span>/</span>
              <span className="text-gray-800 font-medium truncate max-w-xs">{resource.title}</span>
            </nav>
          </div>
        </div>

        {/* Header */}
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <Badge label={resource.type} color={color} size="md" />
                <h1 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-3 leading-tight">{resource.title}</h1>
                <p className="text-green-200 text-lg max-w-3xl">{resource.summary}</p>
                {resource.publicationDate && (
                  <p className="text-green-300 text-sm mt-3">Published: {resource.publicationDate}</p>
                )}
              </div>
              <DownloadDetail type="resources" slug={resource.slug} label="resource" className="shrink-0" />
            </div>
          </div>
        </section>

        <section className="py-10 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {resource.description && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">About this Resource</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">{resource.description}</p>
                  </div>
                )}

                {/* Read the document here rather than sending the visitor off
                    to a bare file. For view-only material this is the only way
                    to read it at all — there is no public URL to open. */}
                {resource.fileUrl && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Document</h2>
                    <ResourceReader slug={resource.slug} title={resource.title} />
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                  <h3 className="font-bold text-gray-900 text-sm mb-4">Resource Details</h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</dt>
                      <dd className="mt-0.5"><Badge label={resource.type} color={color} /></dd>
                    </div>
                    {resource.publicationDate && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Published</dt>
                        <dd className="text-gray-700 mt-0.5">{resource.publicationDate}</dd>
                      </div>
                    )}
                  </dl>

                  {/* Download / External link */}
                  <div className="mt-5 space-y-2">
                    {resource.fileUrl && resource.fileDownloadable !== false && (
                      <a href={resource.fileUrl} download
                        className="block w-full text-center py-2.5 bg-primary-700 text-white font-semibold rounded-lg hover:bg-primary-800 transition-colors text-sm">
                        📄 Download Resource
                      </a>
                    )}
                    {resource.fileUrl && resource.fileDownloadable === false && (
                      // Deliberately not a link: there is no address to send
                      // anyone to. The document is readable in the reader
                      // above and nowhere else.
                      <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
                        <span className="font-semibold text-gray-700">Read-only.</span>{" "}
                        The owner shared this to be read on the platform, not
                        downloaded. It is shown in full above.
                      </p>
                    )}
                    {resource.externalUrl && (
                      <a href={resource.externalUrl} target="_blank" rel="noopener noreferrer"
                        className="block w-full text-center py-2.5 border border-primary-700 text-primary-700 font-semibold rounded-lg hover:bg-primary-50 transition-colors text-sm">
                        🔗 View Online
                      </a>
                    )}
                    {!resource.fileUrl && !resource.externalUrl && (
                      <p className="text-xs text-gray-400 text-center">No download link available for this resource.</p>
                    )}
                  </div>
                </div>

                <div className="bg-primary-50 rounded-xl border border-primary-100 p-5 text-center">
                  <p className="text-sm text-primary-700 mb-3">Know of a relevant resource not yet on the platform?</p>
                  <Link href="/contact" className="inline-flex items-center px-4 py-2 bg-primary-700 text-white font-semibold rounded-lg hover:bg-primary-800 transition-colors text-sm">
                    Submit a Resource
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
