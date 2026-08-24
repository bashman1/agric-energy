"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import { useAsync } from "@/lib/hooks/useAsync";
import { getPublishedPosts } from "@/lib/data/posts";
import NewsBrowser from "./NewsBrowser";

export default function Page() {
  const { data: posts, loading, error, reload } = useAsync(() => getPublishedPosts());

  useEffect(() => {
    document.title = "Newsroom — Agri-Energy Desk";
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <NewsBrowser posts={[]} />
        </main>
        <Footer />
      </>
    );
  }

  if (error || !posts) {
    return (
      <>
        <Header />
        <main>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <p className="text-red-700">Failed to load news. <button onClick={reload} className="underline">Retry</button></p>
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
        <NewsBrowser posts={posts} />
      </main>
      <Footer />
    </>
  );
}
