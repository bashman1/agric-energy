import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import NewsletterSignup from "@/components/public/NewsletterSignup";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter — Agri-Energy Desk",
  description:
    "Subscribe to the Agri-Energy Desk newsletter for monthly updates on projects, technologies, funding calls and events in Uganda.",
};

/** Confirmation states the API redirects back to via ?status=. */
const STATUS_MESSAGES: Record<
  string,
  { icon: string; title: string; body: string; tone: "success" | "info" | "error" }
> = {
  confirmed: {
    icon: "✅",
    title: "Subscription confirmed",
    body: "Thank you — your email address is verified and you are now on the Agri-Energy Desk newsletter list. Your first issue will arrive with the next monthly send.",
    tone: "success",
  },
  unsubscribed: {
    icon: "👋",
    title: "You have been unsubscribed",
    body: "Your email address has been removed from the newsletter list and you will not receive further issues. You are welcome to subscribe again at any time using the form below.",
    tone: "info",
  },
  invalid: {
    icon: "⚠️",
    title: "That link is no longer valid",
    body: "The confirmation or unsubscribe link has expired or has already been used. Please subscribe again below, or contact us if you need help.",
    tone: "error",
  },
};

const TONE_CLASSES: Record<string, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  error: "bg-amber-50 border-amber-200 text-amber-800",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function NewsletterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status ? STATUS_MESSAGES[params.status] : undefined;

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
            {status && (
              <div
                role="status"
                aria-live="polite"
                className={`mb-8 rounded-2xl border p-6 ${TONE_CLASSES[status.tone]}`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0" aria-hidden="true">
                    {status.icon}
                  </span>
                  <div>
                    <h2 className="text-lg font-bold mb-1">{status.title}</h2>
                    <p className="text-sm leading-relaxed">{status.body}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <NewsletterSignup
                variant="inline"
                heading={
                  params.status === "unsubscribed"
                    ? "Changed your mind? Subscribe again"
                    : "Subscribe to the newsletter"
                }
              />

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
