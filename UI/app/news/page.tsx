import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import NewsletterSignup from "@/components/public/NewsletterSignup";
import EmptyState from "@/components/shared/EmptyState";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/data/posts";
import type { Post } from "@/lib/types";
import {
  CATEGORIES,
  categoryLabel,
  formatPublished as fmt,
} from "./categories";

export const metadata: Metadata = {
  title: "Newsroom — Agri-Energy Desk",
  description:
    "News, impact stories, press releases and announcements from Uganda's agri-energy sector.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function NewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const active = CATEGORIES.some((c) => c.slug === params.category)
    ? (params.category ?? "")
    : "";

  const posts = await getPublishedPosts(active || undefined);
  const [lead, ...rest] = posts;

  return (
    <>
      <Header />
      <main>
        <section className="bg-primary-800 text-white py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-primary-300 text-sm font-semibold mb-2 uppercase tracking-wider">
              Newsroom
            </div>
            <h1 className="text-3xl font-extrabold mb-3">
              News, stories &amp; announcements
            </h1>
            <p className="text-primary-100 max-w-2xl">
              Updates from the Agri-Energy Desk — sector news, impact stories from
              the field, press releases and platform announcements.
            </p>
          </div>
        </section>

        {/* Category tabs — plain links so the page stays a server component */}
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <nav aria-label="Filter newsroom by category">
              <ul className="flex flex-wrap gap-1 -mb-px list-none p-0 m-0">
                {CATEGORIES.map((c) => {
                  const isActive = c.slug === active;
                  return (
                    <li key={c.slug || "all"}>
                      <Link
                        href={c.slug ? `/news?category=${c.slug}` : "/news"}
                        aria-current={isActive ? "page" : undefined}
                        className={`inline-block px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                          isActive
                            ? "border-primary-700 text-primary-800"
                            : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
                        }`}
                      >
                        {c.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </section>

        <section className="bg-gray-50 py-10 min-h-[50vh]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="mb-5">
              <p className="text-sm text-gray-500">
                <span className="font-bold text-gray-800">{posts.length}</span>{" "}
                {posts.length === 1 ? "article" : "articles"}
                {active ? ` in ${categoryLabel(active)}` : ""}
              </p>
            </div>

            {posts.length === 0 ? (
              <EmptyState
                icon="📰"
                title="Nothing published yet"
                message="Articles in this category will appear here."
                action={active ? { label: "View all news", href: "/news" } : undefined}
              />
            ) : (
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  {lead && <LeadCard post={lead} />}
                  {rest.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-5 mt-6">
                      {rest.map((p) => (
                        <PostCard key={p.slug} post={p} />
                      ))}
                    </div>
                  )}
                </div>

                <aside className="lg:col-span-1" aria-label="Newsletter">
                  <NewsletterSignup variant="inline" />
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CategoryBadge({ category }: { category: string }) {
  if (!category) return null;
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-100">
      {categoryLabel(category)}
    </span>
  );
}

function LeadCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-primary-200 hover:shadow-sm transition-all"
    >
      {post.featuredImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.featuredImage}
          alt={post.title}
          className="w-full h-56 sm:h-72 object-cover"
        />
      )}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <CategoryBadge category={post.category} />
          <span className="text-xs text-gray-500">{fmt(post.publishedAt)}</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 leading-snug mb-2">
          {post.title}
        </h2>
        <p className="text-sm text-gray-600 line-clamp-3">{post.excerpt}</p>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-primary-200 hover:shadow-sm transition-all"
    >
      {post.featuredImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.featuredImage}
          alt={post.title}
          className="w-full h-36 object-cover"
        />
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <CategoryBadge category={post.category} />
          <span className="text-xs text-gray-500">{fmt(post.publishedAt)}</span>
        </div>
        <h3 className="font-bold text-gray-900 mb-1 leading-snug">{post.title}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
      </div>
    </Link>
  );
}
