import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import PageHeader from "@/components/public/PageHeader";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedEvents } from "@/lib/data/events";
import StaggerGrid from "@/components/shared/motion/StaggerGrid";
import EmptyState from "@/components/shared/EmptyState";

export const metadata: Metadata = {
  title: "Events & Learning Hub — Agri-Energy Desk",
  description:
    "Conferences, workshops, webinars and training programmes across Uganda's Agri-Energy ecosystem.",
};

function fmt(date: string | null): string {
  if (!date) return "Date TBC";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Split events into upcoming / past relative to the current time. */
function splitByStart<T extends { startsAt: string | null }>(events: T[]) {
  const now = Date.now();
  return {
    upcoming: events.filter((e) => !e.startsAt || new Date(e.startsAt).getTime() >= now),
    past: events.filter((e) => e.startsAt && new Date(e.startsAt).getTime() < now),
  };
}

export default async function EventsPage() {
  const events = await getPublishedEvents();
  const { upcoming, past } = splitByStart(events);

  return (
    <>
      <Header />
      <main>
        <PageHeader
          eyebrow="Events & Learning Hub"
          title="Conferences, workshops, webinars & training"
          lead="Discover and register for learning and networking opportunities across Uganda's Agri-Energy ecosystem."
        />

        <section className="bg-ink-50 py-10 min-h-[50vh]">
          <div className="container-page">
            {events.length === 0 ? (
              <EmptyState
                title="No events yet"
                message="Upcoming events and training will be listed here."
              />
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming</h2>
                {upcoming.length === 0 ? (
                  <p className="text-gray-500 text-sm mb-8">
                    No upcoming events scheduled. See past events below.
                  </p>
                ) : (
                  <StaggerGrid className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                    {upcoming.map((e) => (
                      <EventCard key={e.slug} e={e} fmt={fmt} />
                    ))}
                  </StaggerGrid>
                )}

                {past.length > 0 && (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Past events</h2>
                    <StaggerGrid className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {past.map((e) => (
                        <EventCard key={e.slug} e={e} fmt={fmt} muted />
                      ))}
                    </StaggerGrid>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function EventCard({
  e,
  fmt,
  muted,
}: {
  e: Awaited<ReturnType<typeof getPublishedEvents>>[number];
  fmt: (d: string | null) => string;
  muted?: boolean;
}) {
  return (
    <Link
      href={`/events/${e.slug}`}
      className={`block bg-white rounded-xl border border-gray-100 p-5 hover:border-primary-200 hover:shadow-sm transition-all ${
        muted ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {e.type && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-100">
            {e.type}
          </span>
        )}
        {e.isOnline && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
            Online
          </span>
        )}
      </div>
      <h3 className="font-bold text-gray-900 mb-1 leading-snug">{e.title}</h3>
      <p className="text-xs text-gray-500 mb-2">
        📅 {fmt(e.startsAt)}
        {e.location ? ` · ${e.location}` : ""}
      </p>
      <p className="text-sm text-gray-600 line-clamp-2">{e.summary}</p>
    </Link>
  );
}
