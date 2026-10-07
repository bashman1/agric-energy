import type { ReactNode } from "react";
import { mediaUrl } from "@/lib/utils/mediaUrl";

// ============================================================
// Cover images for cards and detail-page headers.
//
// A record's featured image, when it has one, replaces the flat colour
// band: the photo fills the band and a dark scrim keeps the overlaid text
// legible over any picture. Without an image the band falls back to its
// colour accent, so a grid of mixed records still reads as one set.
// ============================================================

function hasImage(image: string | null | undefined): image is string {
  return !!image && image.trim() !== "";
}

/**
 * Header band of a listing card. `className` lays out the overlaid content
 * (it is applied to the inner layer); `emptyHeight` is the band's height
 * when there is no photo and it shows the accent colour instead.
 */
export function CardCover({
  image,
  alt = "",
  accent,
  emptyHeight = "h-20",
  className = "",
  children,
}: {
  image?: string | null;
  alt?: string;
  /** Gradient utility string used when there is no photo. */
  accent: string;
  emptyHeight?: string;
  className?: string;
  children?: ReactNode;
}) {
  const photo = hasImage(image);
  return (
    <div className={`relative overflow-hidden ${photo ? "h-40" : `${accent} ${emptyHeight}`}`}>
      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(image)}
            alt={alt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-black/75 via-black/25 to-black/10"
          />
        </>
      )}
      <div className={`relative h-full ${className}`}>{children}</div>
    </div>
  );
}

/**
 * The dark title band at the top of a detail page. With a featured image the
 * photo sits behind the title under a brand-tinted scrim — dense on the
 * text side, lighter towards the right so the picture still shows.
 */
export function DetailHero({
  image,
  children,
}: {
  image?: string | null;
  children: ReactNode;
}) {
  const photo = hasImage(image);
  return (
    <section className="hero-band relative overflow-hidden bg-primary-800 text-white">
      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(image)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-r from-primary-900/95 from-30% via-primary-900/85 via-60% to-primary-900/50"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/40 to-transparent"
          />
        </>
      )}
      <div className={`relative ${photo ? "py-16 lg:py-24" : "py-12"}`}>{children}</div>
    </section>
  );
}
