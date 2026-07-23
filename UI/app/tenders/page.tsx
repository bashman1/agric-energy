import { Suspense } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import type { Metadata } from "next";
import { getPublishedOpportunities } from "@/lib/data/opportunities";
import TendersBrowser from "./TendersBrowser";

export const metadata: Metadata = {
  title: "Tenders & Procurement — Agri-Energy Desk",
  description:
    "Open tenders, calls for proposals and procurement notices across Uganda's agri-energy sector.",
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
        <TendersBrowser all={all} />
      </Suspense>
      <Footer />
    </>
  );
}
