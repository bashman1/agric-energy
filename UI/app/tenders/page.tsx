"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import { useAsync } from "@/lib/hooks/useAsync";
import { getPublishedOpportunities } from "@/lib/data/opportunities";
import TendersBrowser from "./TendersBrowser";

export default function Page() {
  const { data: all, loading, error, reload } = useAsync(() => getPublishedOpportunities());

  useEffect(() => {
    document.title = "Tenders & Procurement — Agri-Energy Desk";
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <TendersBrowser all={[]} />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !all) {
    return (
      <>
        <Header />
        <main>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <p className="text-red-700">Failed to load tenders. <button onClick={reload} className="underline">Retry</button></p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main>
        <TendersBrowser all={all} />
      </main>
      <Footer />
    </>
  );
}
