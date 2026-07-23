import { Suspense } from "react";
import Header from "@/components/public/Header";
import NewsletterStatus from "./NewsletterStatus";
import Footer from "@/components/public/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter — Agri-Energy Desk",
  description:
    "Subscribe to the Agri-Energy Desk newsletter for monthly updates on projects, technologies, funding calls and events in Uganda.",
};



export default function NewsletterPage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-primary-300 text-sm font-semibold mb-2 uppercase tracking-wider">
              Stay informed
            </div>
            <h1 className="text-3xl font-extrabold mb-3">
              The Agri-Energy Desk newsletter
            </h1>
            <p className="text-primary-100 max-w-2xl">
              A monthly digest of what is happening where agriculture and
              renewable energy meet in Uganda — new projects, proven
              technologies, open funding calls, tenders and upcoming events.
            </p>
          </div>
        </section>

        <section className="bg-gray-50 py-10 min-h-[50vh]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* useSearchParams needs a Suspense boundary to prerender. */}
              <Suspense fallback={null}>
                <NewsletterStatus />
              </Suspense>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-card">
                  <h2 className="font-bold text-gray-900 mb-4">
                    What you will receive
                  </h2>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {[
                      "New and updated agri-energy projects across Uganda",
                      "Technology profiles and field performance insights",
                      "Open funding, investment, tender and procurement calls",
                      "Upcoming conferences, workshops and training",
                      "Impact stories from farmers, cooperatives and partners",
                      "Policy updates and new resources in the library",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-primary-600 mt-0.5 shrink-0" aria-hidden="true">
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-card">
                  <h2 className="font-bold text-gray-900 mb-3">
                    How we handle your data
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    We use double opt-in: after you subscribe we email you a
                    confirmation link, and nothing is sent until you click it.
                    Your address is used only to deliver this newsletter and is
                    never sold or shared with third parties.
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Every issue carries a one-click unsubscribe link. For any
                    other request, please{" "}
                    <Link href="/contact" className="text-primary-700 font-semibold hover:underline">
                      contact the Agri-Energy Desk team
                    </Link>
                    .
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-card">
                  <h2 className="font-bold text-gray-900 mb-3">
                    Prefer to browse?
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Everything in the newsletter is published on the platform
                    first. Read the latest in the{" "}
                    <Link href="/news" className="text-primary-700 font-semibold hover:underline">
                      newsroom
                    </Link>
                    , or check current{" "}
                    <Link href="/opportunities" className="text-primary-700 font-semibold hover:underline">
                      funding opportunities
                    </Link>{" "}
                    and{" "}
                    <Link href="/tenders" className="text-primary-700 font-semibold hover:underline">
                      tenders
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
