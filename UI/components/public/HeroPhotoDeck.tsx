import Link from "next/link";
import type { Project } from "@/lib/types";
import { coverImage } from "@/lib/utils/defaultCover";

/**
 * A "twisted card deck" of up to three project photos, fanned and rotated,
 * for the empty right side of the homepage hero. Content-driven from the
 * featured projects; a project with no image falls back to a brand-themed
 * default cover so the deck always looks intentional. Pure CSS — hovering a
 * card straightens and lifts it.
 */
type DeckProject = Pick<Project, "title" | "slug" | "featuredImage">;

// Per-card fan geometry, back-to-front. z-index rises so the last card sits on
// top; rotation + offset spread them like a hand of cards.
const FAN = [
  "-rotate-6 -translate-x-8 translate-y-2 z-10",
  "rotate-2 z-20",
  "rotate-[7deg] translate-x-8 translate-y-5 z-30",
];

export default function HeroPhotoDeck({ projects }: { projects: DeckProject[] }) {
  const cards = projects.slice(0, 3);
  if (cards.length === 0) return null;

  return (
    <div className="relative h-[440px] w-full" aria-hidden={false}>
      {cards.map((p, i) => (
        <Link
          key={p.slug}
          href={`/projects/${p.slug}`}
          title={p.title}
          className={`group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${FAN[i] ?? FAN[FAN.length - 1]} transition-transform duration-300 ease-out hover:rotate-0 hover:z-40 hover:-translate-y-2 focus-visible:rotate-0 focus-visible:z-40`}
        >
          <div className="w-56 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5">
            <div className="relative overflow-hidden rounded-xl aspect-[3/4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage(p.featuredImage, p.slug)}
                alt={p.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Title scrim so the label reads over any image or default cover */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                <span className="font-display text-sm font-semibold leading-snug text-white line-clamp-2">
                  {p.title}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
