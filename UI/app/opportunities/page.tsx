import { Suspense } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import type { Metadata } from "next";
import { getPublishedOpportunities } from "@/lib/data/opportunities";
import OpportunitiesBrowser from "./OpportunitiesBrowser";

export const metadata: Metadata = {
  title: "Funding & Investment Opportunities — Agri-Energy Desk",
  description:
    "Grants, financing and investment opportunities for Agri-Energy initiatives in Uganda.",
};

/**
 * Prerendered with the full published list; the active tab is read from
 * the query string in the browser (a static export has no request).
 */
export default async function Page() {
  const all = await getPublishedOpportunities();
  return (
    <>
      <Header />
      {/* useSearchParams needs a Suspense boundary to prerender. */}
      <Suspense fallback={null}>
        <OpportunitiesBrowser all={all} />
      </Suspense>
      <Footer />
    </>
  );
}
