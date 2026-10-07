"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import DownloadDetail from "@/components/public/DownloadDetail";
import Link from "next/link";
import { useAsync } from "@/lib/hooks/useAsync";
import { useRouteSlug } from "@/lib/routing/useRouteSlug";
import { getEventBySlug } from "@/lib/data/events";
import { DetailHero } from "@/components/public/CoverMedia";

function fmt(date: string | null): string {
  if (!date) return "Date to be confirmed";
  return new Date(date).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-medium text-gray-800 mt-0.5">{value}</div>
    </div>
  );
}

export default function EventDetailClient({ slug: routeSlug }: { slug: string }) {
  // The exported HTML is one shell for the whole collection, so the
  // record to load comes from the address, not from the build.
  const slug = useRouteSlug(routeSlug);
  const { data: event, loading, error, reload } = useAsync(() => getEventBySlug(slug!), [slug], { enabled: slug !== null });

  useEffect(() => {
    if (event) {
      document.title = `${event.title} — Events | Agri-Energy Desk`;
    } else {
      document.title = "Event Not Found | Agri-Energy Desk";
    }
  }, [event]);

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

  if (error || !event) {
    return (
      <>
        <Header />
        <main>
          <section className="bg-primary-800 text-white py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <p className="text-primary-200 text-sm">
                Event not found.{" "}
                <button onClick={reload} className="underline">Retry</button>
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main>
        <DetailHero image={event.featuredImage}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <Link href="/events" className="text-primary-200 text-sm hover:text-white">
              ← All events
            </Link>
            <div className="flex items-center gap-2 mt-4 mb-3">
              {event.type && (
                <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-white/15">
                  {event.type}
                </span>
              )}
              {event.isOnline && (
                <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-white/15">
                  Online
                </span>
              )}
            </div>
            <div className="flex items-start justify-between gap-6">
              <h1 className="text-3xl font-extrabold">{event.title}</h1>
              <DownloadDetail type="events" slug={event.slug} label="event" className="shrink-0" />
            </div>
          </div>
        </DetailHero>

        <section className="bg-white py-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <InfoTile label="Starts" value={fmt(event.startsAt)} />
              {event.endsAt && <InfoTile label="Ends" value={fmt(event.endsAt)} />}
              {event.location && <InfoTile label="Location" value={event.location} />}
              <InfoTile label="Format" value={event.isOnline ? "Online" : "In person"} />
            </div>

            {event.summary && (
              <p className="text-lg text-gray-700 mb-6">{event.summary}</p>
            )}
            {event.description && (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                {event.description}
              </div>
            )}

            {event.registrationUrl && (
              <a
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-8 px-5 py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800"
              >
                Register for this event →
              </a>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
