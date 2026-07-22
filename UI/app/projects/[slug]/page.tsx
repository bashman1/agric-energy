import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import Badge from "@/components/shared/Badge";
import DownloadDetail from "@/components/public/DownloadDetail";
import { getProjectBySlug } from "@/lib/data/projects";
import { getTechnologyBySlug } from "@/lib/data/technologies";
import { getPartnerBySlug } from "@/lib/data/partners";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

/** "USD 285,000" — falls back to a plain grouped number when no currency is set. */
function fmtBudget(value: number, currency?: string): string {
  const amount = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
  return currency ? `${currency} ${amount}` : amount;
}

function fmtNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project Not Found" };
  return {
    title: project.title,
    description: project.summary,
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project || !project.published) notFound();

  // Load related technologies and partners
  const technologies = await Promise.all(
    (project.technologyIds ?? []).map((id) => getTechnologyBySlug(id))
  ).then((items) => items.filter(Boolean));

  const partners = await Promise.all(
    (project.implementingPartnerIds ?? []).map((id) => getPartnerBySlug(id))
  ).then((items) => items.filter(Boolean));

  const statusColor =
    project.status === "Active"
      ? "green"
      : project.status === "Completed"
      ? "blue"
      : project.status === "Pipeline"
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
              <span className="text-gray-800 font-medium truncate max-w-xs">{project.title}</span>
            </nav>
          </div>
        </div>

        {/* Page header */}
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge label={project.status} color={statusColor} size="md" />
                  {project.featured && (
                    <span className="bg-secondary-500/20 text-secondary-200 border border-secondary-400/30 px-3 py-1 rounded-full text-sm font-semibold">
                      ★ Featured
                    </span>
                  )}
                </div>
                <h1 className="text-3xl lg:text-4xl font-extrabold mb-3 leading-tight">{project.title}</h1>
                <p className="text-green-200 text-lg max-w-3xl leading-relaxed">{project.summary}</p>
              </div>
              <DownloadDetail type="projects" slug={project.slug} label="project" className="shrink-0" />
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-green-300">
              <span>📍 {project.district || project.region || "Uganda"}{project.district && project.region ? ` · ${project.region}` : ""}</span>
              {project.valueChain && <span>🌾 {project.valueChain}</span>}
              {project.startDate && (
                <span>📅 {project.startDate.slice(0, 4)}{project.endDate ? `–${project.endDate.slice(0, 4)}` : "–Present"}</span>
              )}
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="py-10 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                {project.description && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Project Description</h2>
                    <div className="prose-content text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                      {project.description}
                    </div>
                  </div>
                )}

                {/* Outcomes */}
                {project.outcomes && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Outcomes & Results</h2>
                    <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                      {project.outcomes}
                    </div>
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
                        {project.district && <div>{project.district}</div>}
                        {project.region && <div className="text-gray-500 text-xs">{project.region}</div>}
                        {project.locationNote && <div className="text-gray-400 text-xs mt-0.5 italic">{project.locationNote}</div>}
                      </dd>
                    </div>
                    {project.valueChain && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Value Chain</dt>
                        <dd className="text-gray-800 mt-0.5">{project.valueChain}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</dt>
                      <dd className="mt-0.5"><Badge label={project.status} color={statusColor} /></dd>
                    </div>
                    {project.startDate && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</dt>
                        <dd className="text-gray-800 mt-0.5">
                          {project.startDate.slice(0, 7)}
                          {project.endDate ? ` – ${project.endDate.slice(0, 7)}` : " – Ongoing"}
                        </dd>
                      </div>
                    )}
                    {project.fundingPartner && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Funding Partner</dt>
                        <dd className="text-gray-800 mt-0.5">{project.fundingPartner}</dd>
                      </div>
                    )}
                    {project.budget != null && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget</dt>
                        <dd className="text-gray-800 mt-0.5 font-semibold">
                          {fmtBudget(project.budget, project.budgetCurrency)}
                        </dd>
                      </div>
                    )}
                    {project.beneficiaryCount != null && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Beneficiaries Reached</dt>
                        <dd className="text-gray-800 mt-0.5 font-semibold">
                          {fmtNumber(project.beneficiaryCount)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Beneficiaries */}
                {project.beneficiaries && project.beneficiaries.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Beneficiaries</h3>
                    <div className="flex flex-wrap gap-2">
                      {project.beneficiaries.map((b) => (
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
                      {partners.map((p) =>
                        p ? (
                          <Link
                            key={p.id}
                            href={`/partners/${p.slug}`}
                            className="block p-2 rounded-lg border border-gray-50 hover:border-primary-100 hover:bg-primary-50 transition-colors"
                          >
                            <div className="font-semibold text-gray-800 text-xs">{p.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{p.type}</div>
                          </Link>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                {/* External link */}
                {project.externalUrl && (
                  <a
                    href={project.externalUrl}
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
