"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { mediaUrl } from "@/lib/utils/mediaUrl";
import { ArrowRightIcon } from "@/components/shared/icons";

// ============================================================
// Homepage hero backdrop — up to three project photos behind the headline.
//
// The photos cross-fade on a timer with a slow zoom, under a brand-tinted
// scrim that is densest behind the text (left, and everywhere on small
// screens) so the headline and search stay legible over any picture.
// Interactive without getting in the way: the photo drifts a little with
// the pointer, the slide indicators are buttons, a caption links to the
// project on screen, and hovering or focusing anything in the hero pauses
// the rotation. Reduced-motion users get a still photo and manual control.
//
// With no photos (still loading, or no project has one) the section keeps
// its plain brand gradient, so the hero never waits on data.
// ============================================================

export type HeroSlide = { slug: string; title: string; image: string };

const INTERVAL_MS = 7000;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function HeroBackdrop({
  slides,
  children,
}: {
  slides: HeroSlide[];
  children: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const count = slides.length;
  const current = count > 0 ? active % count : 0;

  // Rotation. Restarted whenever the slide changes, so a manual pick gets a
  // full interval before the next automatic step.
  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setTimeout(() => {
      if (!prefersReducedMotion()) setActive((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [count, paused, current]);

  // Pointer parallax, written straight to CSS variables so moving the mouse
  // never re-renders the hero.
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = sectionRef.current;
    if (!el || e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--hero-x", `${((e.clientX - r.left) / r.width - 0.5) * -24}px`);
    el.style.setProperty("--hero-y", `${((e.clientY - r.top) / r.height - 0.5) * -16}px`);
  };
  const onPointerLeave = () => {
    sectionRef.current?.style.setProperty("--hero-x", "0px");
    sectionRef.current?.style.setProperty("--hero-y", "0px");
    setPaused(false);
  };

  const slide = slides[current];

  return (
    // The pointer/focus handlers only pause the rotation and drive the
    // parallax; every real control inside is a native link or button.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <section
      ref={sectionRef}
      onPointerMove={onPointerMove}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={onPointerLeave}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
      className="hero-band relative isolate overflow-hidden bg-primary-900 text-white"
    >
      {/* Brand gradient — the whole background until photos arrive */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(60% 80% at 15% 0%, #166534 0%, transparent 60%), radial-gradient(50% 70% at 100% 20%, #0f766e 0%, transparent 55%)",
        }}
      />

      {/* Photos, stacked and cross-faded */}
      {count > 0 && (
        <div aria-hidden="true" className="absolute -inset-6 -z-20 hero-parallax">
          {slides.map((s, i) => (
            <div
              key={s.slug}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${
                i === current ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                // Re-keyed when it becomes active so the zoom restarts.
                key={i === current ? `on-${current}` : "off"}
                src={mediaUrl(s.image)}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                className={`h-full w-full object-cover ${i === current ? "hero-kenburns" : ""}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Legibility scrim: solid behind the text, opening up to the right */}
      {count > 0 && (
        <>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-primary-900/80 lg:bg-transparent" />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 hidden lg:block bg-linear-to-r from-primary-900/95 from-25% via-primary-900/80 via-50% to-primary-900/25"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-t from-black/55 to-transparent"
          />
        </>
      )}

      {/* Fine dot texture over everything, as before */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.10]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="container-page relative flex min-h-[560px] flex-col pt-20 pb-8 lg:min-h-[640px] lg:pt-28">
        <div className="flex flex-1 items-center">{children}</div>

        {/* Caption + slide controls */}
        {slide && (
          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mt-16">
            {count > 1 ? (
              <div className="flex items-center gap-2" role="group" aria-label="Featured project photos">
                {slides.map((s, i) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Show ${s.title}`}
                    aria-current={i === current}
                    className="group/dot relative h-1.5 w-10 overflow-hidden rounded-full bg-white/25 hover:bg-white/40"
                  >
                    {i === current && (
                      <span
                        key={`${current}-${paused}`}
                        className={`absolute inset-y-0 left-0 rounded-full bg-paper ${
                          paused ? "w-full" : "hero-progress"
                        }`}
                        style={{ animationDuration: `${INTERVAL_MS}ms` }}
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <span />
            )}

            <Link
              href={`/projects/${slide.slug}`}
              className="group/cap inline-flex max-w-sm items-center gap-3 self-start rounded-xl border border-white/15 bg-black/30 px-4 py-3 backdrop-blur-md transition-colors hover:bg-black/45 sm:self-auto"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-primary-200">
                  Featured project
                </span>
                <span className="block truncate text-sm font-semibold text-white">{slide.title}</span>
              </span>
              <ArrowRightIcon className="shrink-0 transition-transform group-hover/cap:translate-x-1" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
