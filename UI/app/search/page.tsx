import { Suspense } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import type { Metadata } from "next";
import SearchResults from "./SearchResults";

export const metadata: Metadata = {
  title: "Search — Agri-Energy Desk",
  description:
    "Ranked search across projects, technologies, themes, resources, partners, events and opportunities.",
};

/** Static shell; the results themselves are resolved in the browser. */
export default function SearchPage() {
  return (
    <>
      <Header />
      {/* useSearchParams needs a Suspense boundary to prerender. */}
      <Suspense fallback={null}>
        <SearchResults />
      </Suspense>
      <Footer />
    </>
  );
}
