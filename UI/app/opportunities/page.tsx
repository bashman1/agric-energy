import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedOpportunities } from "@/lib/data/opportunities";
import EmptyState from "@/components/shared/EmptyState";

export const metadata: Metadata = {
  title: "Funding & Investment Opportunities — Agri-Energy Desk",
  description:
    "Grants, financing and investment opportunities for Agri-Energy initiatives in Uganda.",
};

/** Type toggle — an empty slug shows every opportunity type. */
const TYPES = [
  { slug: "", label: "All types" },
  { slug: "funding", label: "Funding" },
  { slug: "investment", label: "Investment" },
  { slug: "tender", label: "Tenders" },
  { slug: "procurement", label: "Procurement" },
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

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function OpportunitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const active = TYPES.some((t) => t.slug === params.type)
    ? (params.type ?? "")
    : "";

  const all = await getPublishedOpportunities();
  const opportunities = active
    ? all.filter((o) => o.opportunityType === active)
    : all;

  return (
    <>
      <Header />
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
                          t.slug ? `/opportunities?type=${t.slug}` : "/opportunities"
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
              <EmptyState
                icon="💰"
                title="No open opportunities"
                message="Funding and investment opportunities will be listed here."
                action={
                  active
                    ? { label: "View all types", href: "/opportunities" }
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
                      {o.funder && (
                        <p className="text-xs text-gray-500 mb-2">by {o.funder}</p>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {o.summary}
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
      <Footer />
    </>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">
      {children}
    </span>
  );
}
