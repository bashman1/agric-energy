"use client";

import { useEffect } from "react";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import DownloadDetail from "@/components/public/DownloadDetail";
import Gallery from "@/components/shared/Gallery";
import NewsletterSignup from "@/components/public/NewsletterSignup";
import Link from "next/link";
import { useAsync } from "@/lib/hooks/useAsync";
import { useRouteSlug } from "@/lib/routing/useRouteSlug";
import { getPostBySlug } from "@/lib/data/posts";
import { categoryLabel, formatPublished } from "../categories";

export default function PostDetailClient({ slug: routeSlug }: { slug: string }) {
  // The exported HTML is one shell for the whole collection, so the
  // record to load comes from the address, not from the build.
  const slug = useRouteSlug(routeSlug);
  const { data: post, loading, error, reload } = useAsync(() => getPostBySlug(slug!), [slug], { enabled: slug !== null });

  useEffect(() => {
    if (post) {
      document.title = `${post.title} — Newsroom | Agri-Energy Desk`;
    } else {
      document.title = "Article Not Found | Agri-Energy Desk";
    }
  }, [post]);

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <section className="bg-primary-800 text-white py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <p className="text-primary-200 text-sm">Loading…</p>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !post) {
    return (
      <>
        <Header />
        <main>
          <section className="bg-primary-800 text-white py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <p className="text-primary-200 text-sm">
                Article not found.{" "}
                <button onClick={reload} className="underline">Retry</button>
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const isStory = post.category === "story";
  const gallery = post.gallery ?? [];

  return (
    <>
      <Header />
      <main>
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <Link href="/news" className="text-primary-200 text-sm hover:text-white">
              ← Newsroom
            </Link>
            <div className="flex flex-wrap items-center gap-2 mt-4 mb-3">
              {post.category && (
                <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-white/15">
                  {categoryLabel(post.category)}
                </span>
              )}
              <span className="text-primary-200 text-sm">
                <time dateTime={post.publishedAt ?? undefined}>
                  {formatPublished(post.publishedAt)}
                </time>
              </span>
            </div>
            <div className="flex items-start justify-between gap-6">
              <h1 className="text-3xl font-extrabold leading-tight">{post.title}</h1>
              <DownloadDetail type="news" slug={post.slug} label="article" className="shrink-0" />
            </div>
          </div>
        </section>

        <article className="bg-white py-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            {post.featuredImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full rounded-xl border border-gray-100 mb-8 object-cover max-h-96"
              />
            )}

            {post.excerpt && (
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                {post.excerpt}
              </p>
            )}

            {post.body && (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                {post.body}
              </div>
            )}

            {isStory && gallery.length > 0 && (
              <div className="mt-10 pt-8 border-t border-gray-100">
                <Gallery
                  title="From the field"
                  images={gallery.map((src, i) => ({
                    src,
                    alt: `${post.title} — photo ${i + 1} of ${gallery.length}`,
                  }))}
                />
              </div>
            )}

            <div className="mt-10 pt-8 border-t border-gray-100">
              <NewsletterSignup
                variant="inline"
                heading="Get stories like this by email"
                description="Monthly updates on agri-energy projects, technologies, funding calls and events in Uganda."
              />
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
