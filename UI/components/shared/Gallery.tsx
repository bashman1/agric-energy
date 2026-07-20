"use client";
// ============================================================
// Gallery — accessible responsive image grid with a lightbox.
// Keyboard: Enter/Space opens, Escape closes, ←/→ navigate.
// Focus is trapped inside the dialog and restored on close.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";

export interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
}

interface GalleryProps {
  /** Image URLs, or objects with alt text / captions. */
  images: (string | GalleryImage)[];
  /** Accessible label for the gallery region. */
  title?: string;
  className?: string;
}

function normalise(images: (string | GalleryImage)[]): GalleryImage[] {
  return images
    .map((img) => (typeof img === "string" ? { src: img } : img))
    .filter((img) => Boolean(img?.src));
}

export default function Gallery({
  images,
  title = "Photo gallery",
  className = "",
}: GalleryProps) {
  const items = normalise(images);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isOpen = openIndex !== null;
  const count = items.length;

  const close = useCallback(() => {
    setOpenIndex((prev) => {
      // Restore focus to the thumbnail that opened the lightbox.
      if (prev !== null) triggerRefs.current[prev]?.focus();
      return null;
    });
  }, []);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((prev) =>
        prev === null ? prev : (prev + delta + count) % count
      );
    },
    [count]
  );

  // Move focus into the dialog when it opens, and lock body scroll.
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Keyboard handling + focus trap while the lightbox is open.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close, step]);

  if (count === 0) return null;

  const current = openIndex !== null ? items[openIndex] : null;
  const currentAlt =
    current?.alt || current?.caption || `Gallery image ${(openIndex ?? 0) + 1}`;

  return (
    <div className={className}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>

      <ul
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none p-0 m-0"
        aria-label={title}
      >
        {items.map((img, i) => (
          <li key={`${img.src}-${i}`}>
            <button
              type="button"
              ref={(el) => {
                triggerRefs.current[i] = el;
              }}
              onClick={() => setOpenIndex(i)}
              className="group block w-full aspect-4/3 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt || img.caption || `Gallery image ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <span className="sr-only">Open in full size</span>
            </button>
            {img.caption && (
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                {img.caption}
              </p>
            )}
          </li>
        ))}
      </ul>

      {isOpen && current && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          {/* Click-outside-to-close backdrop */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close gallery"
            className="absolute inset-0 w-full h-full cursor-default"
            onClick={close}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${title} — image ${(openIndex ?? 0) + 1} of ${count}`}
            className="relative z-10 w-full max-w-4xl"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/80 text-sm font-medium" aria-live="polite">
                Image {(openIndex ?? 0) + 1} of {count}
              </p>
              <button
                type="button"
                ref={closeRef}
                onClick={close}
                className="w-10 h-10 rounded-full bg-white/10 text-white text-xl leading-none hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span aria-hidden="true">×</span>
                <span className="sr-only">Close gallery</span>
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={currentAlt}
              className="w-full max-h-[70vh] object-contain rounded-lg bg-black"
            />

            {current.caption && (
              <p className="text-white/80 text-sm mt-3 text-center">
                {current.caption}
              </p>
            )}

            {count > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span aria-hidden="true">←</span> Previous
                  <span className="sr-only"> image</span>
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Next<span className="sr-only"> image</span>{" "}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
