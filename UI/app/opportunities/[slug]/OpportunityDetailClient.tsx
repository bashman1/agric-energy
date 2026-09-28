"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import DownloadDetail from "@/components/public/DownloadDetail";
import Link from "next/link";
import RichText from "@/components/shared/RichText";
import { useAsync } from "@/lib/hooks/useAsync";
import { useRouteSlug } from "@/lib/routing/useRouteSlug";
import { getOpportunityBySlug } from "@/lib/data/opportunities";
import { hasHtmlContent } from "@/lib/html/sanitize";

function fmtDate(date: string | null): string {
  if (!date) return "Rolling / no deadline";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isPastDeadline(deadline: string | null | undefined): boolean {
  return deadline ? new Date(deadline).getTime() < Date.now() : false;
}

/** What the attached file is called, by opportunity type. */
function documentLabel(type: string): string {
  if (type === "tender") return "Download tender document";
  if (type === "procurement") return "Download procurement notice";
  if (type === "job") return "Download job description";
  return "Download document";
}

function InfoTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "open" | "closed";
}) {
  const tone =
    highlight === "open"
      ? "bg-emerald-50 border-emerald-100"
      : highlight === "closed"
        ? "bg-red-50 border-red-100"
        : "bg-gray-50 border-gray-100";
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-medium text-gray-800 mt-0.5">{value}</div>
    </div>
  );
}

export default function OpportunityDetailClient({ slug: routeSlug }: { slug: string }) {
  // The exported HTML is one shell for the whole collection, so the
  // record to load comes from the address, not from the build.
  const slug = useRouteSlug(routeSlug);
  const { data: o, loading, error, reload } = useAsync(() => getOpportunityBySlug(slug!), [slug], { enabled: slug !== null });

  useEffect(() => {
    if (o) {
      document.title = `${o.title} — Opportunities | Agri-Energy Desk`;
    } else {
      document.title = "Opportunity Not Found | Agri-Energy Desk";
    }
  }, [o]);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <section className="bg-primary-800 text-white py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <p className="text-primary-200 text-sm">Loading…</p>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !o) {
    return (
      <>
        <Header />
        <main>
          <section className="bg-primary-800 text-white py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <p className="text-primary-200 text-sm">
                Opportunity not found.{" "}
                <button onClick={reload} className="underline">Retry</button>
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const closed = isPastDeadline(o.deadline);
  const isJob = o.opportunityType === "job";

  return (
    <>
      <Header />
      <main>
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <Link
              href="/opportunities"
              className="text-primary-200 text-sm hover:text-white"
            >
              ← All opportunities
            </Link>
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-3xl font-extrabold mt-4">{o.title}</h1>
                {/* Tenders and vacancies name the issuing body; grants and
                    investment name whoever funds them. */}
                {o.organization ? (
                  <p className="text-primary-100 mt-2">{o.organization}</p>
                ) : (
                  o.funder && <p className="text-primary-100 mt-2">Offered by {o.funder}</p>
                )}
              </div>
              <DownloadDetail
                type="opportunities"
                slug={o.slug}
                label="opportunity"
                className="mt-4 shrink-0"
              />
            </div>
          </div>
        </section>

        <section className="bg-white py-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <InfoTile
                label={isJob ? "Application deadline" : "Deadline"}
                value={fmtDate(o.deadline)}
                highlight={closed ? "closed" : "open"}
              />
              {o.amount && (
                <InfoTile
                  label={isJob ? "Remuneration" : "Amount"}
                  value={`${o.currency ? o.currency + " " : ""}${o.amount}`}
                />
              )}
              {o.sector && <InfoTile label="Sector" value={o.sector} />}
              {o.region && <InfoTile label="Region" value={o.region} />}
            </div>

            {o.summary && <p className="text-lg text-gray-700 mb-6">{o.summary}</p>}

            {/* On a vacancy the details field holds the job summary, so it
                gets a heading of its own rather than running on from the
                teaser above it. */}
            {hasHtmlContent(o.description) && (
              <div className="mb-6">
                {isJob && (
                  <h2 className="font-bold text-gray-900 text-sm mb-2">Job Summary</h2>
                )}
                <RichText
                  html={o.description}
                  className="prose prose-sm max-w-none text-gray-700"
                />
              </div>
            )}

            {isJob && hasHtmlContent(o.dutiesResponsibilities) && (
              <div className="mb-6">
                <h2 className="font-bold text-gray-900 text-sm mb-2">
                  Duties And Responsibilities
                </h2>
                <RichText
                  html={o.dutiesResponsibilities}
                  className="prose prose-sm max-w-none text-gray-700"
                />
              </div>
            )}

            {isJob && hasHtmlContent(o.minimumEducation) && (
              <div className="mb-6">
                <h2 className="font-bold text-gray-900 text-sm mb-2">
                  Minimum Education
                </h2>
                <RichText
                  html={o.minimumEducation}
                  className="prose prose-sm max-w-none text-gray-700"
                />
              </div>
            )}

            {isJob && hasHtmlContent(o.experience) && (
              <div className="mb-6">
                <h2 className="font-bold text-gray-900 text-sm mb-2">Experience</h2>
                <RichText
                  html={o.experience}
                  className="prose prose-sm max-w-none text-gray-700"
                />
              </div>
            )}

            {isJob && hasHtmlContent(o.competences) && (
              <div className="mb-6">
                <h2 className="font-bold text-gray-900 text-sm mb-2">Competences</h2>
                <RichText
                  html={o.competences}
                  className="prose prose-sm max-w-none text-gray-700"
                />
              </div>
            )}

            {o.eligibility && (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 mb-6">
                <h2 className="font-bold text-gray-900 text-sm mb-2">Eligibility</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {o.eligibility}
                </p>
              </div>
            )}

            {/* Where to apply when there is no portal to link to. A closed
                posting hides it: writing to it would go unanswered. */}
            {o.applicationEmail && !closed && (
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 mb-6">
                <h2 className="font-bold text-gray-900 text-sm mb-1">
                  {isJob ? "Submit applications to" : "Submit bids to"}
                </h2>
                <a
                  href={`mailto:${o.applicationEmail}?subject=${encodeURIComponent(o.title)}`}
                  className="text-sm text-primary-700 font-semibold hover:underline break-all"
                >
                  {o.applicationEmail}
                </a>
              </div>
            )}

            {/* The notice itself. Shown even once the deadline has passed —
                a closed tender is still a document people need to read. */}
            {o.documentUrl && (
              <div className="mb-6">
                <a
                  href={o.documentUrl}
                  download
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-800 font-bold rounded-lg hover:border-primary-300 hover:text-primary-700 transition-colors"
                >
                  📄 {documentLabel(o.opportunityType)}
                </a>
              </div>
            )}

            {o.externalUrl && !closed && (
              <a
                href={o.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-5 py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800"
              >
                {isJob ? "Apply for this role →" : "Apply / learn more →"}
              </a>
            )}
            {closed && (
              <p className="text-sm font-semibold text-gray-500">
                {isJob
                  ? "Applications for this vacancy have closed."
                  : "This opportunity has closed."}
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
