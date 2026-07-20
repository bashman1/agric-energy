import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import Gallery from "@/components/shared/Gallery";
import NewsletterSignup from "@/components/public/NewsletterSignup";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/data/posts";
import { categoryLabel, formatPublished } from "../categories";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Article Not Found" };
  return {
    title: `${post.title} — Newsroom`,
    description: post.excerpt || undefined,
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

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
            <h1 className="text-3xl font-extrabold leading-tight">{post.title}</h1>
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
