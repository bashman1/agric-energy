"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import DownloadDetail from "@/components/public/DownloadDetail";
import Badge from "@/components/shared/Badge";
import { getPartnerBySlug } from "@/lib/data/partners";
import { getProjectBySlug } from "@/lib/data/projects";
import Link from "next/link";
import { useAsync } from "@/lib/hooks/useAsync";
import { useRouteSlug } from "@/lib/routing/useRouteSlug";

export default function PartnerDetailClient({ slug: routeSlug }: { slug: string }) {
  // The exported HTML is one shell for the whole collection, so the
  // record to load comes from the address, not from the build.
  const slug = useRouteSlug(routeSlug);
  const { data: partner, loading, error, reload } = useAsync(async () => {
    const p = await getPartnerBySlug(slug!);
    if (!p || !p.published) return null;
    const relatedProjects = await Promise.all(
      (p.projectIds ?? []).map((id) => getProjectBySlug(id))
    ).then((i) => i.filter(Boolean));
    return { partner: p, relatedProjects };
  }, [slug], { enabled: slug !== null });

  useEffect(() => {
    if (partner?.partner) {
      document.title = `${partner.partner.name} — Partners | Agri-Energy Desk`;
    } else {
      document.title = "Partner Not Found | Agri-Energy Desk";
    }
  }, [partner]);

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

  if (error || !partner?.partner) {
    return (
      <>
        <Header />
        <main>
          <div className="bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <p className="text-gray-500 text-sm">
                Partner not found.{" "}
                <button onClick={reload} className="underline">Retry</button>
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const { partner: p, relatedProjects } = partner;
  // An individual's page leads with their title and photograph; an
  // organisation's with its partner type and logo.
  const isIndividual = p.entityKind === "individual";

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
              <Link href="/partners" className="hover:text-primary-700">Partners</Link>
              <span>/</span>
              <span className="text-gray-800 font-medium truncate max-w-xs">{p.name}</span>
            </nav>
          </div>
        </div>

        {/* Page header */}
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Logo */}
              {p.logo && (
                <div className={`bg-white p-4 shadow-lg shrink-0 w-24 h-24 flex items-center justify-center ${
                  isIndividual ? "rounded-full overflow-hidden p-0" : "rounded-2xl"
                }`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.logo}
                    alt={isIndividual ? p.name : `${p.name} logo`}
                    className={`w-full h-full ${isIndividual ? "object-cover" : "object-contain"}`}
                  />
                </div>
              )}
              <div>
                <Badge
                  label={isIndividual ? p.position || "Individual Expert" : p.type}
                  color="green"
                  size="md"
                />
                <h1 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-3 leading-tight">{p.name}</h1>
                {isIndividual && p.affiliation && (
                  <p className="text-green-100 text-sm mb-2">{p.affiliation}</p>
                )}
                <p className="text-green-200 text-lg max-w-2xl">{p.summary}</p>
              </div>
              <DownloadDetail
                type="partners"
                slug={p.slug}
                label="partner profile"
                className="shrink-0 sm:ml-auto"
              />
            </div>
          </div>
        </section>

        <section className="py-10 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main */}
              <div className="lg:col-span-2 space-y-6">
                {p.description && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">About {p.name}</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">{p.description}</p>
                  </div>
                )}

                {relatedProjects.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">{isIndividual ? "Projects Involved In" : "Projects Implemented"}</h2>
                    <div className="space-y-3">
                      {relatedProjects.map((proj) => proj && (
                        <Link key={proj.id} href={`/projects/${proj.slug}`}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors group">
                          <span className="text-xl shrink-0">🏗️</span>
                          <div>
                            <div className="font-semibold text-gray-800 text-sm group-hover:text-primary-700 transition-colors">{proj.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">📍 {proj.district}{proj.region ? ` · ${proj.region}` : ""} · {proj.status}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {(p.expertise?.length || p.sectors?.length || p.yearsExperience) && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                    <h3 className="font-bold text-gray-900 text-sm mb-4">
                      {isIndividual ? "Expertise" : "Focus"}
                    </h3>
                    {p.yearsExperience && (
                      <p className="text-xs text-gray-500 mb-3">
                        <span className="font-semibold text-gray-700">{p.yearsExperience}</span>{" "}
                        years of experience
                      </p>
                    )}
                    {p.expertise && p.expertise.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5 mb-3">
                        {p.expertise.map((item) => (
                          <li key={item} className="rounded-full bg-primary-50 text-primary-800 text-xs px-2.5 py-1">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                    {p.sectors && p.sectors.length > 0 && (
                      <>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sectors</dt>
                        <ul className="flex flex-wrap gap-1.5">
                          {p.sectors.map((item) => (
                            <li key={item} className="rounded-full bg-gray-100 text-gray-700 text-xs px-2.5 py-1">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                {/* Contact */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                  <h3 className="font-bold text-gray-900 text-sm mb-4">Contact Information</h3>
                  <dl className="space-y-3 text-sm">
                    {p.website && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Website</dt>
                        <dd className="mt-0.5">
                          <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:text-primary-800 break-all text-xs">
                            {p.website}
                          </a>
                        </dd>
                      </div>
                    )}
                    {p.email && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</dt>
                        <dd className="mt-0.5 text-gray-700 text-xs">{p.email}</dd>
                      </div>
                    )}
                    {p.phone && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</dt>
                        <dd className="mt-0.5 text-gray-700 text-xs">{p.phone}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Coverage */}
                {p.regions?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Geographic Coverage</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Regions</div>
                        <div className="flex flex-wrap gap-1.5">
                          {p.regions.map((r) => (
                            <span key={r} className="text-xs bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded-full">{r}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
