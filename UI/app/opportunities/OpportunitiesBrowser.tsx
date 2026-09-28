// Client half of /opportunities: the tab is read from the query string.
// The page prerenders the full published list, so switching tabs filters
// in memory without a round trip.
"use client";

import { useUrlFilters } from "@/lib/hooks/useUrlFilters";
import PageHeader from "@/components/public/PageHeader";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import Link from "next/link";
import EmptyState from "@/components/shared/EmptyState";
import { teaserFor } from "@/lib/html/sanitize";

import type { Opportunity } from "@/lib/types";

/** Type toggle — an empty slug shows every opportunity type. */
const TYPES = [
  { slug: "", label: "All types" },
  { slug: "funding", label: "Funding" },
  { slug: "investment", label: "Investment" },
  { slug: "tender", label: "Tenders" },
  { slug: "procurement", label: "Procurement" },
  // Jobs and vacancies are one listing, not two.
  { slug: "job", label: "Jobs / Vacancies" },
] as const;

function daysLeft(deadline: string | null): string {
  if (!deadline) return "Rolling";
  const diff = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "Closed";
  if (diff === 0) return "Closes today";
  return `${diff} day${diff === 1 ? "" : "s"} left`;
}


export default function OpportunitiesBrowser({ all }: { all: Opportunity[] }) {
  const { filters: params } = useUrlFilters(["type"]);
  const active = TYPES.some((t) => t.slug === params.type)
    ? (params.type ?? "")
    : "";

  const opportunities = active
    ? all.filter((o) => o.opportunityType === active)
    : all;

  return (
    <main>
        <PageHeader
          eyebrow="Funding & Investment"
          title="Opportunities for Agri-Energy"
          lead="Grants, financing and investment opportunities to support renewable energy in Uganda's agricultural value chains."
        />

        {/* Type toggle — plain links so the page stays a server component */}
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <nav aria-label="Filter opportunities by type">
              <ul className="flex flex-wrap gap-1 -mb-px list-none p-0 m-0">
                {TYPES.map((t) => {
                  const isActive = t.slug === active;
                  return (
                    <li key={t.slug || "all"}>
                      <Link
                        href={
                          // Trailing slash matches `trailingSlash: true`;
                          // without it every tab click costs a 308.
                          t.slug ? `/opportunities/?type=${t.slug}` : "/opportunities/"
                        }
                        aria-current={isActive ? "page" : undefined}
                        className={`inline-block px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                          isActive
                            ? "border-primary-700 text-primary-800"
                            : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
                        }`}
                      >
                        {t.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </section>

        <section className="bg-ink-50 py-10 min-h-[50vh]">
          <div className="container-page">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                <span className="font-bold text-gray-800">
                  {opportunities.length}
                </span>{" "}
                {opportunities.length === 1 ? "opportunity" : "opportunities"}
              </p>
              <p className="text-sm text-gray-500">
                Tenders and procurement notices also have their own{" "}
                <Link
                  href="/tenders"
                  className="text-primary-700 font-semibold hover:underline"
                >
                  dedicated listing
                </Link>
              </p>
            </div>

            {opportunities.length === 0 ? (
              // The vacancies tab says so in its own words: "No open
              // opportunities" reads like the site is broken when what the
              // visitor asked for was jobs.
              <EmptyState
                icon={active === "job" ? "🧑‍💼" : "💰"}
                title={
                  active === "job"
                    ? "No vacancy/job available"
                    : "No open opportunities"
                }
                message={
                  active === "job"
                    ? "Jobs and vacancies will be listed here as they open."
                    : "Funding and investment opportunities will be listed here."
                }
                action={
                  active
                    ? { label: "View all types", href: "/opportunities/" }
                    : undefined
                }
              />
            ) : (
              <StaggerGrid className="grid md:grid-cols-2 gap-5">
                {opportunities.map((o) => {
                  const status = daysLeft(o.deadline);
                  const closed = status === "Closed";
                  return (
                    <Link
                      key={o.slug}
                      href={`/opportunities/${o.slug}`}
                      className={`block bg-white rounded-xl border border-gray-100 p-5 hover:border-primary-200 hover:shadow-sm transition-all ${
                        closed ? "opacity-70" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h2 className="font-bold text-gray-900 leading-snug">
                          {o.title}
                        </h2>
                        <span
                          className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            closed
                              ? "bg-gray-100 text-gray-500 border-gray-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      {/* Tenders and vacancies name the issuing body;
                          grants and investment name whoever funds them. */}
                      {(o.organization || o.funder) && (
                        <p className="text-xs text-gray-500 mb-2">
                          {o.organization ? o.organization : `by ${o.funder}`}
                        </p>
                      )}
                      {/* Vacancies have no summary field — their teaser is
                          an excerpt of the Job Summary instead. */}
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {teaserFor(o.summary, o.description)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {o.opportunityType && (
                          <Tag>
                            {TYPES.find((t) => t.slug === o.opportunityType)?.label ??
                              o.opportunityType}
                          </Tag>
                        )}
                        {o.sector && <Tag>{o.sector}</Tag>}
                        {o.region && <Tag>{o.region}</Tag>}
                        {o.amount && (
                          <Tag>
                            {o.currency ? `${o.currency} ` : ""}
                            {o.amount}
                          </Tag>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </StaggerGrid>
            )}
          </div>
        </section>
    </main>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">
      {children}
    </span>
  );
}
