// Client half of /tenders: the tab is read from the query string.
// The page prerenders the full published list, so switching tabs filters
// in memory without a round trip.
"use client";

import { useUrlFilters } from "@/lib/hooks/useUrlFilters";
import PageHeader from "@/components/public/PageHeader";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import Link from "next/link";
import EmptyState from "@/components/shared/EmptyState";
import type { Opportunity } from "@/lib/types";


/** Toggle tabs — an empty slug shows both tender and procurement notices. */
const TYPES = [
  { slug: "", label: "All notices" },
  { slug: "tender", label: "Tenders" },
  { slug: "procurement", label: "Procurement" },
] as const;

const TENDER_TYPES = ["tender", "procurement"];

function daysLeft(deadline: string | null): string {
  if (!deadline) return "Rolling";
  const diff = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "Closed";
  if (diff === 0) return "Closes today";
  return `${diff} day${diff === 1 ? "" : "s"} left`;
}

function fmtDeadline(deadline: string | null): string {
  if (!deadline) return "No fixed deadline";
  return new Date(deadline).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


export default function TendersBrowser({ all }: { all: Opportunity[] }) {
  const { filters: params } = useUrlFilters(["type"]);
  const active = TYPES.some((t) => t.slug === params.type)
    ? (params.type ?? "")
    : "";

  const notices = all
    .filter((o) => TENDER_TYPES.includes(o.opportunityType))
    .filter((o) => (active ? o.opportunityType === active : true))
    // Soonest deadline first; rolling notices last.
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  return (
    <main>
        <PageHeader
          eyebrow="Tenders & Procurement"
          title="Open tenders and procurement notices"
          lead="Calls for proposals, supply contracts and procurement notices from partners working on renewable energy in Uganda's agricultural value chains."
        />

        {/* Type toggle — plain links so the page stays a server component */}
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <nav aria-label="Filter notices by type">
              <ul className="flex flex-wrap gap-1 -mb-px list-none p-0 m-0">
                {TYPES.map((t) => {
                  const isActive = t.slug === active;
                  return (
                    <li key={t.slug || "all"}>
                      <Link
                        href={t.slug ? `/tenders/?type=${t.slug}` : "/tenders/"}
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
                <span className="font-bold text-gray-800">{notices.length}</span>{" "}
                {notices.length === 1 ? "notice" : "notices"}
              </p>
              <p className="text-sm text-gray-500">
                Looking for grants or investment?{" "}
                <Link
                  href="/opportunities"
                  className="text-primary-700 font-semibold hover:underline"
                >
                  See funding opportunities
                </Link>
              </p>
            </div>

            {notices.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No open notices"
                message="Tenders and procurement notices will be listed here as partners publish them."
                action={
                  active
                    ? { label: "View all notices", href: "/tenders" }
                    : { label: "Browse funding opportunities", href: "/opportunities" }
                }
              />
            ) : (
              <StaggerGrid className="grid md:grid-cols-2 gap-5">
                {notices.map((o) => (
                  <NoticeCard key={o.slug} o={o} />
                ))}
              </StaggerGrid>
            )}
          </div>
        </section>
    </main>
  );
}

function NoticeCard({ o }: { o: Opportunity }) {
  const status = daysLeft(o.deadline);
  const closed = status === "Closed";
  return (
    <Link
      href={`/opportunities/${o.slug}`}
      className={`block bg-white rounded-xl border border-gray-100 p-5 hover:border-primary-200 hover:shadow-sm transition-all ${
        closed ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2 className="font-bold text-gray-900 leading-snug">{o.title}</h2>
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
      {/* A tender names the body that issued it. `funder` is the fallback
          for notices written before the two were separated. */}
      {(o.organization || o.funder) && (
        <p className="text-xs text-gray-500 mb-2">{o.organization || o.funder}</p>
      )}
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{o.summary}</p>
      <div className="flex flex-wrap gap-1.5">
        <Tag>{o.opportunityType === "procurement" ? "Procurement" : "Tender"}</Tag>
        <Tag>Deadline: {fmtDeadline(o.deadline)}</Tag>
        {o.documentUrl && <Tag>📄 Document</Tag>}
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
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200">
      {children}
    </span>
  );
}
