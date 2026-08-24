"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import DownloadDetail from "@/components/public/DownloadDetail";
import Link from "next/link";
import { useAsync } from "@/lib/hooks/useAsync";
import { useRouteSlug } from "@/lib/routing/useRouteSlug";
import { getOpportunityBySlug } from "@/lib/data/opportunities";

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
                {o.funder && <p className="text-primary-100 mt-2">Offered by {o.funder}</p>}
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
                label="Deadline"
                value={fmtDate(o.deadline)}
                highlight={closed ? "closed" : "open"}
              />
              {o.amount && (
                <InfoTile
                  label="Amount"
                  value={`${o.currency ? o.currency + " " : ""}${o.amount}`}
                />
              )}
              {o.sector && <InfoTile label="Sector" value={o.sector} />}
              {o.region && <InfoTile label="Region" value={o.region} />}
            </div>

            {o.summary && <p className="text-lg text-gray-700 mb-6">{o.summary}</p>}
            {o.description && (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line mb-6">
                {o.description}
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

            {o.externalUrl && !closed && (
              <a
                href={o.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-5 py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800"
              >
                Apply / learn more →
              </a>
            )}
            {closed && (
              <p className="text-sm font-semibold text-gray-500">
                This opportunity has closed.
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
