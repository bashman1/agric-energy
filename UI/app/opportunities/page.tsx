"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import { useAsync } from "@/lib/hooks/useAsync";
import { getPublishedOpportunities } from "@/lib/data/opportunities";
import OpportunitiesBrowser from "./OpportunitiesBrowser";

export default function Page() {
  const { data: all, loading, error, reload } = useAsync(() => getPublishedOpportunities());

  useEffect(() => {
    document.title = "Funding & Investment Opportunities — Agri-Energy Desk";
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <OpportunitiesBrowser all={[]} />
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
            <p className="text-red-700">Failed to load opportunities. <button onClick={reload} className="underline">Retry</button></p>
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
        <OpportunitiesBrowser all={all} />
      </main>
      <Footer />
    </>
  );
}
