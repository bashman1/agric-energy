import { Suspense } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/data/posts";
import NewsBrowser from "./NewsBrowser";

export const metadata: Metadata = {
  title: "Newsroom — Agri-Energy Desk",
  description:
    "News, impact stories, press releases and announcements from Uganda's agri-energy sector.",
};

/**
 * Prerendered with the full published list; the active tab is read from
 * the query string in the browser (a static export has no request).
 */
export default async function Page() {
  const posts = await getPublishedPosts();
  return (
    <>
      <Header />
      {/* useSearchParams needs a Suspense boundary to prerender. */}
      <Suspense fallback={null}>
        <NewsBrowser posts={posts} />
      </Suspense>
      <Footer />
    </>
  );
}
