"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import Badge from "@/components/shared/Badge";
import DownloadDetail from "@/components/public/DownloadDetail";
import Gallery from "@/components/shared/Gallery";
import Link from "next/link";
import { useAsync } from "@/lib/hooks/useAsync";
import { useRouteSlug } from "@/lib/routing/useRouteSlug";
import { getProjectBySlug } from "@/lib/data/projects";
import { getTechnologyBySlug } from "@/lib/data/technologies";
import { getPartnerBySlug } from "@/lib/data/partners";
import { DetailHero } from "@/components/public/CoverMedia";
import { mediaUrl } from "@/lib/utils/mediaUrl";

function fmtBudget(value: number, currency?: string): string {
  const amount = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
  return currency ? `${currency} ${amount}` : amount;
}

function fmtNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

function fmtFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectDetailClient({ slug: routeSlug }: { slug: string }) {
  // The exported HTML is one shell for the whole collection, so the
  // record to load comes from the address, not from the build.
  const slug = useRouteSlug(routeSlug);
  const { data: project, loading, error, reload } = useAsync(async () => {
    const p = await getProjectBySlug(slug!);
    if (!p) return null;
    const technologies = await Promise.all(
      (p.technologyIds ?? []).map((id) => getTechnologyBySlug(id))
    ).then((items) => items.filter(Boolean));

    const partners = await Promise.all(
      (p.implementingPartnerIds ?? []).map((id) => getPartnerBySlug(id))
    ).then((items) => items.filter(Boolean));

    return { project: p, technologies, partners };
  }, [slug], { enabled: slug !== null });

  useEffect(() => {
    if (project?.project) {
      document.title = `${project.project.title} — Projects | Agri-Energy Desk`;
    } else {
      document.title = "Project Not Found | Agri-Energy Desk";
    }
  }, [project]);

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

  if (error || !project?.project) {
    return (
      <>
        <Header />
        <main>
          <div className="bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <p className="text-gray-500 text-sm">
                Project not found.{" "}
                <button onClick={reload} className="underline">Retry</button>
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const { project: p, technologies, partners } = project;

  const statusColor =
    p.status === "Active"
      ? "green"
      : p.status === "Completed"
        ? "blue"
        : p.status === "Pipeline"
          ? "yellow"
          : ("gray" as "green" | "blue" | "yellow" | "gray");

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
              <Link href="/projects" className="hover:text-primary-700">Projects</Link>
              <span>/</span>
              <span className="text-gray-800 font-medium truncate max-w-xs">{p.title}</span>
            </nav>
          </div>
        </div>

        {/* Page header */}
        <DetailHero image={p.featuredImage}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge label={p.status} color={statusColor} size="md" />
                  {p.featured && (
                    <span className="bg-secondary-500/20 text-secondary-200 border border-secondary-400/30 px-3 py-1 rounded-full text-sm font-semibold">
                      ★ Featured
                    </span>
                  )}
                </div>
                <h1 className="text-3xl lg:text-4xl font-extrabold mb-3 leading-tight">{p.title}</h1>
                <p className="text-green-200 text-lg max-w-3xl leading-relaxed">{p.summary}</p>
              </div>
              <DownloadDetail type="projects" slug={p.slug} label="project" className="shrink-0" />
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-green-300">
              <span>📍 {p.district || p.region || "Uganda"}{p.district && p.region ? ` · ${p.region}` : ""}</span>
              {p.valueChain && <span>🌾 {p.valueChain}</span>}
              {p.startDate && (
                <span>📅 {p.startDate.slice(0, 4)}{p.endDate ? `–${p.endDate.slice(0, 4)}` : "–Present"}</span>
              )}
            </div>
          </div>
        </DetailHero>

        {/* Main content */}
        <section className="py-10 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Key figures */}
                {(p.budget != null || p.beneficiaryCount != null) && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {p.budget != null && (
                      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Budget</div>
                        <div className="mt-1 text-3xl font-extrabold text-primary-800 leading-tight">
                          {fmtBudget(p.budget, p.budgetCurrency)}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">Total investment in this project</div>
                      </div>
                    )}
                    {p.beneficiaryCount != null && (
                      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Beneficiaries Reached</div>
                        <div className="mt-1 text-3xl font-extrabold text-gray-900 leading-tight">
                          {fmtNumber(p.beneficiaryCount)}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">People directly served</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                {p.description && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Project Description</h2>
                    <div className="prose-content text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                      {p.description}
                    </div>
                  </div>
                )}

                {/* Outcomes */}
                {p.outcomes && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Outcomes & Results</h2>
                    <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                      {p.outcomes}
                    </div>
                  </div>
                )}

                {/* Photo gallery */}
                {(p.gallery ?? []).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <Gallery
                      title="Project photos"
                      images={p.gallery.map((src, i) => ({
                        src: mediaUrl(src),
                        alt: `${p.title} — photo ${i + 1} of ${p.gallery.length}`,
                      }))}
                    />
                  </div>
                )}

                {/* Technologies used */}
                {technologies.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Technologies Used</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {technologies.map((tech) =>
                        tech ? (
                          <Link
                            key={tech.id}
                            href={`/technologies/${tech.slug}`}
                            className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors group"
                          >
                            <span className="text-xl">⚡</span>
                            <div>
                              <div className="font-semibold text-gray-800 text-sm group-hover:text-primary-700 transition-colors">{tech.name}</div>
                              <div className="text-xs text-primary-600 bg-primary-50 group-hover:bg-white px-1.5 py-0.5 rounded-full inline-block mt-0.5 transition-colors">{tech.category}</div>
                            </div>
                          </Link>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                {/* Downloads / attachments */}
                {p.attachments && p.attachments.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Documents & Downloads</h2>
                    <ul className="space-y-2">
                      {p.attachments.map((att, idx) => (
                        <li key={`${att.url}-${idx}`}>
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors group"
                          >
                            <span className="text-xl shrink-0">📄</span>
                            <span className="flex-1 min-w-0 truncate font-semibold text-gray-800 text-sm group-hover:text-primary-700 transition-colors">
                              {att.name}
                            </span>
                            {att.size ? (
                              <span className="text-xs text-gray-400 shrink-0">{fmtFileSize(att.size)}</span>
                            ) : null}
                            <span className="text-primary-600 text-sm shrink-0 group-hover:translate-x-0.5 transition-transform">↓</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {/* Project Details */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                  <h3 className="font-bold text-gray-900 text-sm mb-4">Project Details</h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</dt>
                      <dd className="text-gray-800 mt-0.5">
                        {p.district && <div>{p.district}</div>}
                        {p.region && <div className="text-gray-500 text-xs">{p.region}</div>}
                        {p.locationNote && <div className="text-gray-400 text-xs mt-0.5 italic">{p.locationNote}</div>}
                      </dd>
                    </div>
                    {p.valueChain && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Value Chain</dt>
                        <dd className="text-gray-800 mt-0.5">{p.valueChain}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</dt>
                      <dd className="mt-0.5"><Badge label={p.status} color={statusColor} /></dd>
                    </div>
                    {p.startDate && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</dt>
                        <dd className="text-gray-800 mt-0.5">
                          {p.startDate.slice(0, 7)}
                          {p.endDate ? ` – ${p.endDate.slice(0, 7)}` : " – Ongoing"}
                        </dd>
                      </div>
                    )}
                    {p.fundingPartner && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Funding Partner</dt>
                        <dd className="text-gray-800 mt-0.5">{p.fundingPartner}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Beneficiaries */}
                {p.beneficiaries && p.beneficiaries.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Beneficiaries</h3>
                    <div className="flex flex-wrap gap-2">
                      {p.beneficiaries.map((b) => (
                        <span key={b} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">{b}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Implementing Partners */}
                {partners.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Implementing Partners</h3>
                    <div className="space-y-2">
                      {partners.map((partner) =>
                        partner ? (
                          <Link
                            key={partner.id}
                            href={`/partners/${partner.slug}`}
                            className="block p-2 rounded-lg border border-gray-50 hover:border-primary-100 hover:bg-primary-50 transition-colors"
                          >
                            <div className="font-semibold text-gray-800 text-xs">{partner.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{partner.type}</div>
                          </Link>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                {/* External link */}
                {p.externalUrl && (
                  <a
                    href={p.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2.5 bg-primary-700 text-white font-semibold rounded-lg hover:bg-primary-800 transition-colors text-sm"
                  >
                    🔗 View Project Website
                  </a>
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
