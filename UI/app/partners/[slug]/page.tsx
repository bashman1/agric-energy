import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import DownloadDetail from "@/components/public/DownloadDetail";
import Badge from "@/components/shared/Badge";
import { getPartnerBySlug, getPublishedPartners } from "@/lib/data/partners";
import { getProjectBySlug } from "@/lib/data/projects";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const items = await getPublishedPartners();
  return items.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const partner = await getPartnerBySlug(slug);
  if (!partner) return { title: "Partner Not Found" };
  return { title: partner.name, description: partner.summary };
}

export default async function PartnerDetailPage({ params }: Props) {
  const { slug } = await params;
  const partner = await getPartnerBySlug(slug);
  if (!partner || !partner.published) notFound();

  const relatedProjects = await Promise.all(
    (partner.projectIds ?? []).map((id) => getProjectBySlug(id))
  ).then((i) => i.filter(Boolean));

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
              <span className="text-gray-800 font-medium truncate max-w-xs">{partner.name}</span>
            </nav>
          </div>
        </div>

        {/* Page header */}
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Logo */}
              {partner.logo && (
                <div className="bg-white rounded-2xl p-4 shadow-lg shrink-0 w-24 h-24 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <Badge label={partner.type} color="green" size="md" />
                <h1 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-3 leading-tight">{partner.name}</h1>
                <p className="text-green-200 text-lg max-w-2xl">{partner.summary}</p>
              </div>
              <DownloadDetail
                type="partners"
                slug={partner.slug}
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
                {partner.description && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">About {partner.name}</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">{partner.description}</p>
                  </div>
                )}

                {relatedProjects.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-card">
                    <h2 className="font-bold text-gray-900 text-lg mb-4">Projects Implemented</h2>
                    <div className="space-y-3">
                      {relatedProjects.map((p) => p && (
                        <Link key={p.id} href={`/projects/${p.slug}`}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors group">
                          <span className="text-xl shrink-0">🏗️</span>
                          <div>
                            <div className="font-semibold text-gray-800 text-sm group-hover:text-primary-700 transition-colors">{p.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">📍 {p.district}{p.region ? ` · ${p.region}` : ""} · {p.status}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {/* Contact */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                  <h3 className="font-bold text-gray-900 text-sm mb-4">Contact Information</h3>
                  <dl className="space-y-3 text-sm">
                    {partner.website && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Website</dt>
                        <dd className="mt-0.5">
                          <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:text-primary-800 break-all text-xs">
                            {partner.website}
                          </a>
                        </dd>
                      </div>
                    )}
                    {partner.email && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</dt>
                        <dd className="mt-0.5 text-gray-700 text-xs">{partner.email}</dd>
                      </div>
                    )}
                    {partner.phone && (
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</dt>
                        <dd className="mt-0.5 text-gray-700 text-xs">{partner.phone}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Coverage */}
                {partner.regions?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-card">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Geographic Coverage</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Regions</div>
                        <div className="flex flex-wrap gap-1.5">
                          {partner.regions.map((r) => (
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
